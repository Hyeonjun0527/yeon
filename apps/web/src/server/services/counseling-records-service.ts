import type {
  AuthUserDto,
  CounselingRecordDetail,
  CounselingRecordListItem,
  CounselingRecordSpeakerTone,
  StudentSummary,
} from "@yeon/api-contract";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/server/db";
import {
  counselingRecords,
  counselingTranscriptSegments,
} from "@/server/db/schema";

import { ServiceError } from "./service-error";
import {
  deleteCounselingAudioObject,
  openCounselingAudioObjectStream,
} from "./counseling-record-audio-storage";
import {
  type PersistedTranscriptionChunkSnapshot,
  transcribeStoredAudio,
} from "./counseling-transcription-engine";
import {
  analyzeCounselingRecord,
  resolveSpeakerNames,
} from "./counseling-ai-service";
import {
  type CounselingRecordRow,
  DEFAULT_COUNSELING_TYPE,
  findOwnedRecord,
  findRecordsByMemberId,
  findRecordsBySpaceId,
  findUnlinkedRecords,
  findTranscriptSegments,
  isPlaceholderAudioStoragePath,
  linkRecordToMember,
  mapRecordDetail,
  mapRecordListItem,
  mapSegmentRow,
  parseSingleAudioRange,
  persistAudioFile,
  rebuildTranscriptText,
  sanitizeOptionalValue,
  sanitizeRequiredValue,
} from "./counseling-records-repository";
import { getMemberByIdForUser } from "./members-service";

// ── 전사 스케줄러 ──

// TODO: 단일 인스턴스 전제. 다중 인스턴스 배포 시 DB 기반 lock 또는 외부 큐로 교체 필요.
const scheduledTranscriptionJobs = new Map<string, Promise<void>>();

// ── 분석 중복 방지 ──
const scheduledAnalysisJobs = new Map<string, Promise<void>>();

const PROCESSING_STAGE_PROGRESS: Record<string, number> = {
  queued: 5,
  downloading: 10,
  chunking: 15,
  transcribing: 20,
  resolving_speakers: 85,
  transcript_ready: 100,
  analyzing: 100,
  completed: 100,
  error: 0,
};

type CreateCounselingRecordInput = {
  currentUser: AuthUserDto;
  studentName: string;
  sessionTitle: string;
  counselingType: string | null;
  audioDurationMs: number | null;
  file: File;
  clientRequestId?: string | null;
};

function isChunkSnapshot(
  value: unknown,
): value is PersistedTranscriptionChunkSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "index" in value &&
    typeof value.index === "number" &&
    "transcriptText" in value &&
    typeof value.transcriptText === "string" &&
    "segments" in value &&
    Array.isArray(value.segments)
  );
}

function readTranscriptionChunks(record: CounselingRecordRow) {
  return Array.isArray(record.transcriptionChunks)
    ? record.transcriptionChunks
        .filter(isChunkSnapshot)
        .sort((a, b) => a.index - b.index)
    : [];
}

function buildTranscriptionProgress(
  stage: string,
  chunkCount: number,
  chunkCompletedCount: number,
) {
  if (stage === "transcribing" && chunkCount > 0) {
    return Math.max(
      PROCESSING_STAGE_PROGRESS.transcribing,
      Math.min(
        84,
        Math.round(
          PROCESSING_STAGE_PROGRESS.transcribing +
            (chunkCompletedCount / chunkCount) * 64,
        ),
      ),
    );
  }

  return PROCESSING_STAGE_PROGRESS[stage] ?? 0;
}

async function updateTranscriptionState(
  recordId: string,
  patch: Partial<typeof counselingRecords.$inferInsert>,
) {
  await getDb()
    .update(counselingRecords)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(counselingRecords.id, recordId));
}

async function updateAnalysisState(
  recordId: string,
  patch: Partial<typeof counselingRecords.$inferInsert>,
) {
  await getDb()
    .update(counselingRecords)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(counselingRecords.id, recordId));
}

function scheduleCounselingRecordTranscription(params: {
  userId: string;
  recordId: string;
  clientRequestId?: string | null;
}) {
  if (scheduledTranscriptionJobs.has(params.recordId)) {
    return false;
  }

  const job = (async () => {
    const record = await findOwnedRecord(params.userId, params.recordId);

    if (isPlaceholderAudioStoragePath(record.audioStoragePath)) {
      return;
    }

    await runTranscriptionForRecord({
      record,
      clientRequestId: params.clientRequestId,
    });
  })()
    .catch((error) => {
      console.error("counseling-record-transcription-failed", {
        recordId: params.recordId,
        error,
      });
    })
    .finally(() => {
      scheduledTranscriptionJobs.delete(params.recordId);
    });

  scheduledTranscriptionJobs.set(params.recordId, job);

  return true;
}

function scheduleCounselingRecordAnalysis(params: {
  userId: string;
  recordId: string;
}) {
  if (scheduledAnalysisJobs.has(params.recordId)) {
    return false;
  }

  const job = (async () => {
    const record = await findOwnedRecord(params.userId, params.recordId);

    if (record.status !== "ready") {
      return;
    }

    await runQueuedAnalysisForRecord(record);
  })()
    .catch((error) => {
      console.error("counseling-record-analysis-failed", {
        recordId: params.recordId,
        error,
      });
    })
    .finally(() => {
      scheduledAnalysisJobs.delete(params.recordId);
    });

  scheduledAnalysisJobs.set(params.recordId, job);

  return true;
}

function ensureCounselingRecordTranscriptionScheduled(
  record: CounselingRecordRow,
  options?: {
    clientRequestId?: string | null;
  },
) {
  if (record.status !== "processing") {
    return false;
  }

  return scheduleCounselingRecordTranscription({
    userId: record.createdByUserId,
    recordId: record.id,
    clientRequestId: options?.clientRequestId ?? null,
  });
}

function ensureCounselingRecordAnalysisScheduled(record: CounselingRecordRow) {
  if (
    record.status !== "ready" ||
    !["queued", "processing"].includes(record.analysisStatus)
  ) {
    return false;
  }

  return scheduleCounselingRecordAnalysis({
    userId: record.createdByUserId,
    recordId: record.id,
  });
}

// ── 내부 헬퍼 ──

/** placeholder 기록을 제외한 실제 음성 기록만 반환 */
function filterRealRecords<T extends { audioStoragePath: string }>(
  records: T[],
): T[] {
  return records.filter(
    (r) => !isPlaceholderAudioStoragePath(r.audioStoragePath),
  );
}

/** 전사 실행 + AI 화자 식별 → 화자 라벨이 반영된 세그먼트 + 수강생 이름 반환 */
async function transcribeAndResolveSpeakers(
  record: CounselingRecordRow,
  clientRequestId: string | null | undefined,
) {
  const speakerHints = ["멘토"];
  if (record.studentName) speakerHints.push(record.studentName);

  const existingChunks = readTranscriptionChunks(record);

  const transcription = await transcribeStoredAudio({
    recordId: record.id,
    storagePath: record.audioStoragePath,
    mimeType: record.audioMimeType,
    originalName: record.audioOriginalName,
    byteSize: record.audioByteSize,
    durationMs: record.audioDurationMs,
    clientRequestId,
    speakerHints,
    existingChunks,
    onSourcesPrepared: async ({ chunkCount }) => {
      await updateTranscriptionState(record.id, {
        processingStage: chunkCount > 1 ? "chunking" : "transcribing",
        processingChunkCount: chunkCount,
        processingChunkCompletedCount: existingChunks.length,
        processingProgress: buildTranscriptionProgress(
          chunkCount > 1 ? "chunking" : "transcribing",
          chunkCount,
          existingChunks.length,
        ),
        processingMessage:
          chunkCount > 1
            ? `긴 녹음을 ${chunkCount}개 구간으로 나눠 전사합니다.`
            : "음성을 전사하고 있습니다.",
      });
    },
    onChunkStarted: async ({ chunkIndex, chunkCount }) => {
      await updateTranscriptionState(record.id, {
        processingStage: "transcribing",
        processingProgress: buildTranscriptionProgress(
          "transcribing",
          chunkCount,
          chunkIndex,
        ),
        processingMessage: `전사 ${chunkIndex + 1}/${chunkCount} 구간을 처리하고 있습니다.`,
      });
    },
    onChunkCompleted: async ({ chunkIndex, chunkCount, snapshot }) => {
      const previousChunks = readTranscriptionChunks(
        await findOwnedRecord(record.createdByUserId, record.id),
      );
      const nextChunks = [
        ...previousChunks.filter((item) => item.index !== snapshot.index),
        snapshot,
      ].sort((left, right) => left.index - right.index);

      await updateTranscriptionState(record.id, {
        transcriptionChunks: nextChunks,
        processingStage: "transcribing",
        processingChunkCount: chunkCount,
        processingChunkCompletedCount: nextChunks.length,
        processingProgress: buildTranscriptionProgress(
          "transcribing",
          chunkCount,
          nextChunks.length,
        ),
        processingMessage: `전사 ${chunkIndex + 1}/${chunkCount} 구간을 완료했습니다.`,
      });
    },
  });

  await updateTranscriptionState(record.id, {
    processingStage: "resolving_speakers",
    processingProgress: PROCESSING_STAGE_PROGRESS.resolving_speakers,
    processingMessage: "화자와 수강생 이름을 정리하고 있습니다.",
  });

  const speakerResolution = await resolveSpeakerNames(
    transcription.segments.map((s) => ({
      speakerLabel: s.speakerLabel,
      text: s.text,
      startMs: s.startMs ?? 0,
    })),
  ).catch((err) => {
    console.warn("화자 식별 실패, 원본 라벨 유지:", err);
    return {
      mapping: {} as Record<
        string,
        { name: string; tone: CounselingRecordSpeakerTone }
      >,
      studentName: null,
    };
  });

  const resolvedSegments = transcription.segments.map((seg) => {
    const resolved = speakerResolution.mapping[seg.speakerLabel];
    if (!resolved) return seg;
    return {
      ...seg,
      speakerLabel: resolved.name,
      speakerTone: resolved.tone as CounselingRecordSpeakerTone,
    };
  });

  const resolvedStudentName =
    speakerResolution.studentName || record.studentName || null;

  return { transcription, resolvedSegments, resolvedStudentName };
}

/** 전사 결과를 DB에 저장 (트랜잭션) */
async function persistTranscriptResult(params: {
  recordId: string;
  initialStudentName: string;
  originalAudioDurationMs: number | null;
  transcription: Awaited<ReturnType<typeof transcribeStoredAudio>>;
  resolvedSegments: {
    id: string;
    segmentIndex: number;
    startMs: number | null;
    endMs: number | null;
    speakerLabel: string;
    speakerTone: string;
    text: string;
  }[];
  resolvedStudentName: string | null;
}): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(counselingRecords)
      .set({
        status: "ready",
        transcriptText: params.transcription.transcriptText,
        transcriptSegmentCount: params.resolvedSegments.length,
        language: params.transcription.language,
        sttModel: params.transcription.model,
        audioDurationMs:
          params.transcription.durationMs ?? params.originalAudioDurationMs,
        ...(params.resolvedStudentName && !params.initialStudentName
          ? { studentName: params.resolvedStudentName }
          : {}),
        errorMessage: null,
        processingStage: "transcript_ready",
        processingProgress: 100,
        processingMessage:
          "원문 준비가 완료되었습니다. AI 분석을 백그라운드에서 생성합니다.",
        transcriptionChunks: null,
        analysisStatus: "queued",
        analysisProgress: 0,
        analysisErrorMessage: null,
        transcriptionCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(counselingRecords.id, params.recordId));

    await tx
      .delete(counselingTranscriptSegments)
      .where(eq(counselingTranscriptSegments.recordId, params.recordId));

    if (params.resolvedSegments.length > 0) {
      await tx.insert(counselingTranscriptSegments).values(
        params.resolvedSegments.map((segment) => ({
          id: segment.id,
          recordId: params.recordId,
          segmentIndex: segment.segmentIndex,
          startMs: segment.startMs,
          endMs: segment.endMs,
          speakerLabel: segment.speakerLabel,
          speakerTone: segment.speakerTone,
          text: segment.text,
        })),
      );
    }
  });
}

async function runTranscriptionForRecord(params: {
  record: CounselingRecordRow;
  clientRequestId?: string | null;
}) {
  const freshRecord = await findOwnedRecord(
    params.record.createdByUserId,
    params.record.id,
  );
  if (freshRecord.status !== "processing") {
    console.info("전사 스킵: 레코드 상태가 processing이 아님", {
      recordId: params.record.id,
      status: freshRecord.status,
    });
    return;
  }

  try {
    await updateTranscriptionState(params.record.id, {
      status: "processing",
      processingStage: "downloading",
      processingProgress: PROCESSING_STAGE_PROGRESS.downloading,
      processingMessage: "오디오 파일을 작업용 임시 파일로 준비하고 있습니다.",
      transcriptionAttemptCount:
        (freshRecord.transcriptionAttemptCount ?? 0) + 1,
      errorMessage: null,
    });

    const { transcription, resolvedSegments, resolvedStudentName } =
      await transcribeAndResolveSpeakers(freshRecord, params.clientRequestId);

    await persistTranscriptResult({
      recordId: params.record.id,
      initialStudentName: params.record.studentName,
      originalAudioDurationMs: params.record.audioDurationMs,
      transcription,
      resolvedSegments,
      resolvedStudentName,
    });

    const completedRecord = await findOwnedRecord(
      params.record.createdByUserId,
      params.record.id,
    );
    ensureCounselingRecordAnalysisScheduled(completedRecord);
  } catch (error) {
    const message =
      error instanceof ServiceError
        ? error.message
        : "음성 전사 처리 중 알 수 없는 오류가 발생했습니다.";

    await updateTranscriptionState(params.record.id, {
      status: "error",
      processingStage: "error",
      processingProgress: 0,
      processingMessage: message,
      errorMessage: message,
      analysisStatus: "idle",
      analysisProgress: 0,
    });

    throw error;
  }
}

async function runQueuedAnalysisForRecord(record: CounselingRecordRow) {
  const detail = await getCounselingRecordDetail(
    record.createdByUserId,
    record.id,
  );

  if (detail.status !== "ready" || detail.transcriptSegments.length === 0) {
    return;
  }

  if (detail.analysisResult && detail.analysisStatus === "ready") {
    return;
  }

  await updateAnalysisState(record.id, {
    analysisStatus: "processing",
    analysisProgress: 10,
    analysisErrorMessage: null,
    analysisAttemptCount: (record.analysisAttemptCount ?? 0) + 1,
    processingStage: "analyzing",
    processingMessage: "AI가 긴 상담 원문을 순차적으로 분석하고 있습니다.",
  });

  try {
    const result = await analyzeCounselingRecord(
      {
        studentName: detail.studentName,
        sessionTitle: detail.sessionTitle,
        counselingType: detail.counselingType,
        createdAt: detail.createdAt,
      },
      detail.transcriptSegments.map((segment) => ({
        speakerLabel: segment.speakerLabel,
        text: segment.text,
        startMs: segment.startMs ?? 0,
      })),
      async (progress) => {
        await updateAnalysisState(record.id, {
          analysisStatus: "processing",
          analysisProgress: progress,
          processingStage: "analyzing",
          processingMessage:
            progress >= 100
              ? "AI 분석을 마무리하고 있습니다."
              : `AI 분석 진행 중 (${progress}%)`,
        });
      },
    );

    await updateAnalysisState(record.id, {
      analysisResult: result,
      analysisStatus: "ready",
      analysisProgress: 100,
      analysisErrorMessage: null,
      processingStage: "completed",
      processingMessage: "전사와 AI 분석이 모두 완료되었습니다.",
      analysisCompletedAt: new Date(),
    });
  } catch (error) {
    const message =
      error instanceof ServiceError
        ? error.message
        : "AI 분석 처리 중 알 수 없는 오류가 발생했습니다.";

    await updateAnalysisState(record.id, {
      analysisStatus: "error",
      analysisProgress: 0,
      analysisErrorMessage: message,
      processingStage: "transcript_ready",
      processingMessage:
        "원문은 준비되었지만 AI 분석에 실패했습니다. 나중에 다시 시도할 수 있습니다.",
    });

    throw error;
  }
}

// ── 공개 서비스 함수 ──

export async function listCounselingRecords(userId: string) {
  const db = getDb();
  const records = filterRealRecords(
    await db
      .select()
      .from(counselingRecords)
      .where(eq(counselingRecords.createdByUserId, userId))
      .orderBy(desc(counselingRecords.createdAt)),
  );

  for (const record of records) {
    ensureCounselingRecordTranscriptionScheduled(record);
    ensureCounselingRecordAnalysisScheduled(record);
  }

  return records.map(mapRecordListItem);
}

export async function listStudentSummaries(
  userId: string,
): Promise<StudentSummary[]> {
  const allRecords = await listCounselingRecords(userId);

  const groupMap = new Map<string, CounselingRecordListItem[]>();

  for (const record of allRecords) {
    const name = record.studentName;
    const group = groupMap.get(name);

    if (group) {
      group.push(record);
    } else {
      groupMap.set(name, [record]);
    }
  }

  const summaries: StudentSummary[] = [];

  for (const [studentName, records] of groupMap) {
    const sorted = records.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    summaries.push({
      studentName,
      recordCount: sorted.length,
      firstCounselingAt: sorted[0].createdAt,
      lastCounselingAt: sorted[sorted.length - 1].createdAt,
      records: sorted,
    });
  }

  return summaries.sort(
    (a, b) =>
      new Date(b.lastCounselingAt).getTime() -
      new Date(a.lastCounselingAt).getTime(),
  );
}

export async function getCounselingRecordDetail(
  userId: string,
  recordId: string,
) {
  const record = await findOwnedRecord(userId, recordId);

  if (isPlaceholderAudioStoragePath(record.audioStoragePath)) {
    throw new ServiceError(
      404,
      "이 상담 기록은 실제 원본 음성이 없는 데모 데이터라 더 이상 열 수 없습니다.",
    );
  }

  ensureCounselingRecordTranscriptionScheduled(record);
  ensureCounselingRecordAnalysisScheduled(record);
  const segments = await findTranscriptSegments(record.id);

  return mapRecordDetail(record, segments);
}

export async function getMultipleRecordsWithSegments(
  userId: string,
  recordIds: string[],
) {
  const MAX_TREND_RECORDS = 5;
  const limitedIds = recordIds.slice(0, MAX_TREND_RECORDS);

  const results: {
    studentName: string;
    sessionTitle: string;
    counselingType: string;
    createdAt: string;
    segments: { speakerLabel: string; text: string; startMs: number }[];
  }[] = [];

  for (const recordId of limitedIds) {
    const record = await findOwnedRecord(userId, recordId);
    const segments = await findTranscriptSegments(record.id);

    results.push({
      studentName: record.studentName,
      sessionTitle: record.sessionTitle,
      counselingType: record.counselingType,
      createdAt: record.createdAt.toISOString(),
      segments: segments.map((s) => ({
        speakerLabel: s.speakerLabel,
        text: s.text,
        startMs: s.startMs ?? 0,
      })),
    });
  }

  const names = new Set(results.map((r) => r.studentName));

  if (names.size > 1) {
    throw new ServiceError(
      400,
      "같은 수강생의 기록만 추이 분석할 수 있습니다.",
    );
  }

  return results;
}

export async function createCounselingRecordAndQueueTranscription(
  input: CreateCounselingRecordInput,
) {
  const db = getDb();
  const recordId = randomUUID();
  // studentName은 녹음 시점에 미입력 가능 — 빈 문자열 허용
  const studentName = sanitizeOptionalValue(input.studentName, 80) ?? "";
  const sessionTitle = sanitizeRequiredValue(
    input.sessionTitle,
    160,
    "상담 제목",
  );
  const counselingType =
    sanitizeOptionalValue(input.counselingType, 40) ?? DEFAULT_COUNSELING_TYPE;
  const persistedAudio = await persistAudioFile(recordId, input.file);
  const now = new Date();

  try {
    await db.insert(counselingRecords).values({
      id: recordId,
      createdByUserId: input.currentUser.id,
      studentName,
      sessionTitle,
      counselingType,
      counselorName:
        sanitizeOptionalValue(input.currentUser.displayName, 80) ??
        sanitizeOptionalValue(input.currentUser.email, 80),
      status: "processing",
      audioOriginalName: persistedAudio.originalName,
      audioMimeType: persistedAudio.mimeType,
      audioByteSize: persistedAudio.byteSize,
      audioDurationMs: input.audioDurationMs,
      audioStoragePath: persistedAudio.storagePath,
      audioSha256: persistedAudio.sha256,
      language: "ko",
      processingStage: "queued",
      processingProgress: PROCESSING_STAGE_PROGRESS.queued,
      processingMessage:
        "업로드가 완료되어 백그라운드 전사를 준비하고 있습니다.",
      processingChunkCount: 0,
      processingChunkCompletedCount: 0,
      transcriptionAttemptCount: 0,
      analysisStatus: "idle",
      analysisProgress: 0,
      analysisAttemptCount: 0,
      updatedAt: now,
    });
  } catch (error) {
    await deleteCounselingAudioObject(persistedAudio.storagePath).catch(
      (cleanupError) => {
        console.error("counseling-record-r2-cleanup-failed", {
          recordId,
          cleanupError,
        });
      },
    );

    throw error;
  }

  scheduleCounselingRecordTranscription({
    userId: input.currentUser.id,
    recordId,
    clientRequestId: input.clientRequestId,
  });

  return getCounselingRecordDetail(input.currentUser.id, recordId);
}

export async function createTextMemoRecord(input: {
  currentUser: AuthUserDto;
  sessionTitle: string;
  content: string;
  counselingType?: string;
}): Promise<CounselingRecordDetail> {
  const db = getDb();
  const recordId = randomUUID();
  const sessionTitle = sanitizeRequiredValue(
    input.sessionTitle,
    160,
    "메모 제목",
  );
  const content = input.content.trim().slice(0, 10000);
  const counselingType =
    sanitizeOptionalValue(input.counselingType, 40) ?? "텍스트 메모";
  const now = new Date();

  await db.insert(counselingRecords).values({
    id: recordId,
    createdByUserId: input.currentUser.id,
    studentName: "",
    sessionTitle,
    counselingType,
    counselorName:
      sanitizeOptionalValue(input.currentUser.displayName, 80) ??
      sanitizeOptionalValue(input.currentUser.email, 80),
    status: "ready",
    audioOriginalName: "text_memo",
    audioMimeType: "text/plain",
    audioByteSize: 0,
    audioDurationMs: null,
    audioStoragePath: `text_memo://${recordId}`,
    audioSha256: "",
    transcriptText: content,
    transcriptSegmentCount: 0,
    language: "ko",
    processingStage: "completed",
    processingProgress: 100,
    processingMessage: "텍스트 메모는 즉시 준비됩니다.",
    analysisStatus: "idle",
    analysisProgress: 0,
    updatedAt: now,
  });

  return getCounselingRecordDetail(input.currentUser.id, recordId);
}

export async function retryCounselingRecordTranscription(
  currentUser: AuthUserDto,
  recordId: string,
  clientRequestId?: string | null,
) {
  const db = getDb();
  const existingRecord = await findOwnedRecord(currentUser.id, recordId);

  if (isPlaceholderAudioStoragePath(existingRecord.audioStoragePath)) {
    throw new ServiceError(
      400,
      "데모 placeholder 기록은 재전사할 수 없습니다. 새 음성 기록을 업로드해 주세요.",
    );
  }

  if (
    existingRecord.status === "processing" &&
    scheduledTranscriptionJobs.has(existingRecord.id)
  ) {
    return getCounselingRecordDetail(currentUser.id, recordId);
  }

  const now = new Date();

  await db
    .update(counselingRecords)
    .set({
      status: "processing",
      errorMessage: null,
      processingStage: "queued",
      processingProgress: PROCESSING_STAGE_PROGRESS.queued,
      processingMessage: "백그라운드 전사를 다시 준비하고 있습니다.",
      processingChunkCount: 0,
      processingChunkCompletedCount: 0,
      transcriptionChunks: null,
      analysisStatus: "idle",
      analysisProgress: 0,
      analysisErrorMessage: null,
      updatedAt: now,
    })
    .where(eq(counselingRecords.id, existingRecord.id));

  scheduleCounselingRecordTranscription({
    userId: currentUser.id,
    recordId: existingRecord.id,
    clientRequestId,
  });

  return getCounselingRecordDetail(currentUser.id, recordId);
}

export async function getCounselingRecordAudio(
  userId: string,
  recordId: string,
  rangeHeader?: string | null,
) {
  const record = await findOwnedRecord(userId, recordId);

  if (isPlaceholderAudioStoragePath(record.audioStoragePath)) {
    throw new ServiceError(
      404,
      "이 상담 기록은 실제 원본 음성이 없는 데모 데이터라 재생할 수 없습니다.",
    );
  }

  const byteRange = parseSingleAudioRange(rangeHeader, record.audioByteSize);
  const audio = byteRange
    ? await openCounselingAudioObjectStream({
        objectKey: record.audioStoragePath,
        rangeHeader: `bytes=${byteRange.start}-${byteRange.end}`,
      })
    : await openCounselingAudioObjectStream({
        objectKey: record.audioStoragePath,
      });

  return {
    stream: audio.stream,
    mimeType: record.audioMimeType,
    originalName: record.audioOriginalName,
    byteSize: record.audioByteSize,
    contentLength:
      audio.contentLength ??
      (byteRange ? byteRange.end - byteRange.start + 1 : record.audioByteSize),
    contentRange:
      audio.contentRange ??
      (byteRange
        ? `bytes ${byteRange.start}-${byteRange.end}/${record.audioByteSize}`
        : null),
    status: byteRange ? 206 : 200,
  };
}

export async function runAnalysisForRecord(userId: string, recordId: string) {
  const detail = await getCounselingRecordDetail(userId, recordId);

  if (detail.status !== "ready" || detail.transcriptSegments.length === 0) {
    throw new ServiceError(400, "전사가 완료된 레코드만 분석할 수 있습니다.");
  }

  if (detail.analysisResult && detail.analysisStatus === "ready") {
    return detail.analysisResult;
  }

  if (detail.analysisStatus === "processing") {
    const existingJob = scheduledAnalysisJobs.get(recordId);
    if (existingJob) {
      await existingJob;
      const refreshedWhileRunning = await getCounselingRecordDetail(
        userId,
        recordId,
      );
      if (refreshedWhileRunning.analysisResult) {
        return refreshedWhileRunning.analysisResult;
      }
    }

    throw new ServiceError(
      409,
      "AI 분석이 이미 진행 중입니다. 잠시 후 새로고침해 주세요.",
    );
  }

  const record = await findOwnedRecord(userId, recordId);
  await runQueuedAnalysisForRecord(record);

  const refreshed = await getCounselingRecordDetail(userId, recordId);

  if (!refreshed.analysisResult) {
    throw new ServiceError(502, "AI 분석 결과를 저장하지 못했습니다.");
  }

  return refreshed.analysisResult;
}

export async function linkCounselingRecordMember(
  userId: string,
  recordId: string,
  memberId: string | null,
) {
  await findOwnedRecord(userId, recordId);

  /* memberId가 있으면 소유권 검증 후 해당 멤버의 spaceId를 함께 저장 */
  let spaceId: string | null = null;
  if (memberId) {
    // getMemberByIdForUser: 현재 사용자의 space에 속한 멤버인지 함께 검증
    const member = await getMemberByIdForUser(userId, memberId);
    spaceId = member.spaceId;
  }

  await linkRecordToMember(recordId, memberId, spaceId);
}

export async function listCounselingRecordsBySpace(
  userId: string,
  spaceId: string,
) {
  const records = filterRealRecords(
    await findRecordsBySpaceId(userId, spaceId),
  );
  for (const record of records) {
    ensureCounselingRecordTranscriptionScheduled(record);
    ensureCounselingRecordAnalysisScheduled(record);
  }
  return records.map(mapRecordListItem);
}

export async function listUnlinkedCounselingRecords(userId: string) {
  const records = filterRealRecords(await findUnlinkedRecords(userId));
  for (const record of records) {
    ensureCounselingRecordTranscriptionScheduled(record);
    ensureCounselingRecordAnalysisScheduled(record);
  }
  return records.map(mapRecordListItem);
}

export async function listCounselingRecordsByMember(
  userId: string,
  memberId: string,
) {
  const records = filterRealRecords(
    await findRecordsByMemberId(userId, memberId),
  );
  for (const record of records) {
    ensureCounselingRecordTranscriptionScheduled(record);
    ensureCounselingRecordAnalysisScheduled(record);
  }
  return records.map(mapRecordListItem);
}

export async function deleteCounselingRecord(userId: string, recordId: string) {
  // 진행 중인 전사 job을 취소해 고아 세그먼트 방지
  scheduledTranscriptionJobs.delete(recordId);
  scheduledAnalysisJobs.delete(recordId);

  const record = await findOwnedRecord(userId, recordId);
  const db = getDb();

  await db.delete(counselingRecords).where(eq(counselingRecords.id, record.id));

  if (!isPlaceholderAudioStoragePath(record.audioStoragePath)) {
    try {
      await deleteCounselingAudioObject(record.audioStoragePath);
    } catch (error) {
      console.error("counseling-record-r2-delete-failed", {
        recordId: record.id,
        storagePath: record.audioStoragePath,
        error,
      });
    }
  }
}

export async function updateTranscriptSegment(
  userId: string,
  recordId: string,
  segmentId: string,
  patch: {
    text?: string;
    speakerLabel?: string;
    speakerTone?: CounselingRecordSpeakerTone;
  },
) {
  const record = await findOwnedRecord(userId, recordId);
  const db = getDb();

  const [segment] = await db
    .select()
    .from(counselingTranscriptSegments)
    .where(
      and(
        eq(counselingTranscriptSegments.id, segmentId),
        eq(counselingTranscriptSegments.recordId, record.id),
      ),
    )
    .limit(1);

  if (!segment) {
    throw new ServiceError(404, "해당 세그먼트를 찾지 못했습니다.");
  }

  const updateFields: Partial<
    typeof counselingTranscriptSegments.$inferInsert
  > = {};

  if (patch.text !== undefined) {
    updateFields.text = patch.text;
  }

  if (patch.speakerLabel !== undefined) {
    updateFields.speakerLabel = patch.speakerLabel;
  }

  if (patch.speakerTone !== undefined) {
    updateFields.speakerTone = patch.speakerTone;
  }

  if (Object.keys(updateFields).length === 0) {
    return mapSegmentRow(segment);
  }

  const [updated] = await db
    .update(counselingTranscriptSegments)
    .set(updateFields)
    .where(eq(counselingTranscriptSegments.id, segmentId))
    .returning();

  await rebuildTranscriptText(record.id);

  // 전사 내용이 변경되면 분석 결과가 stale해지므로 초기화
  // runAnalysisForRecord의 캐시 체크(detail.analysisResult)가 재분석을 허용하게 됨
  await db
    .update(counselingRecords)
    .set({
      analysisResult: null,
      analysisStatus: "queued",
      analysisProgress: 0,
      analysisErrorMessage: null,
      analysisCompletedAt: null,
      processingStage: "transcript_ready",
      processingMessage: "원문이 수정되어 AI 분석을 다시 준비합니다.",
      updatedAt: new Date(),
    })
    .where(eq(counselingRecords.id, record.id));

  const refreshedRecord = await findOwnedRecord(userId, recordId);
  ensureCounselingRecordAnalysisScheduled(refreshedRecord);

  return mapSegmentRow(updated);
}

export async function bulkUpdateSpeakerLabel(
  userId: string,
  recordId: string,
  fromSpeakerLabel: string,
  toSpeakerLabel: string,
  toSpeakerTone?: CounselingRecordSpeakerTone,
) {
  const record = await findOwnedRecord(userId, recordId);
  const db = getDb();

  const updateFields: Partial<
    typeof counselingTranscriptSegments.$inferInsert
  > = { speakerLabel: toSpeakerLabel };

  if (toSpeakerTone !== undefined) {
    updateFields.speakerTone = toSpeakerTone;
  }

  const result = await db
    .update(counselingTranscriptSegments)
    .set(updateFields)
    .where(
      and(
        eq(counselingTranscriptSegments.recordId, record.id),
        eq(counselingTranscriptSegments.speakerLabel, fromSpeakerLabel),
      ),
    )
    .returning({ id: counselingTranscriptSegments.id });

  if (result.length > 0) {
    await rebuildTranscriptText(record.id);

    // 화자 레이블 변경은 분석 결과(발화자 기반 요약)를 stale하게 만들므로 초기화
    await db
      .update(counselingRecords)
      .set({
        analysisResult: null,
        analysisStatus: "queued",
        analysisProgress: 0,
        analysisErrorMessage: null,
        analysisCompletedAt: null,
        processingStage: "transcript_ready",
        processingMessage: "화자 정보가 수정되어 AI 분석을 다시 준비합니다.",
        updatedAt: new Date(),
      })
      .where(eq(counselingRecords.id, record.id));

    const refreshedRecord = await findOwnedRecord(userId, recordId);
    ensureCounselingRecordAnalysisScheduled(refreshedRecord);
  }

  return result.length;
}
