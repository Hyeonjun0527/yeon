import type {
  AuthUserDto,
  CounselingChatMessage,
  CounselingRecordDetail,
  CounselingRecordSpeakerTone,
  StudentSummary,
} from "@yeon/api-contract";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import {
  counselingRecords,
  counselingTranscriptSegments,
} from "@/server/db/schema";
import { generatePublicId, ID_PREFIX } from "@/server/lib/public-id";

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
  COUNSELING_RECORD_SOURCE,
  type CounselingRecordDetailSource,
  type CounselingRecordListQueryOptions,
  type CounselingRecordListRow,
  type CounselingRecordRow,
  DEFAULT_COUNSELING_TYPE,
  findOwnedRecord,
  findOwnedRecordDetailSource,
  findOwnedRecordDetailSourcesByIds,
  findRecordsByMemberId,
  findRecordsBySpaceId,
  findRecordsByUserId,
  findUnlinkedRecords,
  hasPlayableAudio,
  isDemoPlaceholderRecord,
  isTextMemoRecord,
  linkRecordToMember,
  mapRecordDetail,
  mapRecordListItem,
  mapSegmentRow,
  parseSingleAudioRange,
  parseCounselingChatMessages,
  persistAudioFile,
  replaceAssistantMessages,
  rebuildTranscriptText,
  resolveRecordInternalIdByPublicId,
  sanitizeOptionalValue,
  sanitizeRequiredValue,
  summarizeStudentsByName,
} from "./counseling-records-repository";
import { getMemberByIdForUser } from "./members-service";
import { resolveSpaceInternalIdByPublicId } from "./spaces-service";

// ── 전사 스케줄러 ──

// TODO: 단일 인스턴스 전제. 다중 인스턴스 배포 시 DB 기반 lock 또는 외부 큐로 교체 필요.
const scheduledTranscriptionJobs = new Map<string, Promise<void>>();

// ── 분석 중복 방지 ──
const scheduledAnalysisJobs = new Map<string, Promise<void>>();
const PARTIAL_TRANSCRIPT_READY_STAGE = "partial_transcript_ready";
const AUTO_TRANSCRIPTION_STAGES = new Set([
  "queued",
  "downloading",
  "chunking",
  "transcribing",
  "resolving_speakers",
]);

const PROCESSING_STAGE_PROGRESS: Record<string, number> = {
  queued: 5,
  downloading: 10,
  chunking: 15,
  transcribing: 20,
  partial_transcript_ready: 60,
  resolving_speakers: 85,
  transcript_ready: 100,
  analyzing: 100,
  completed: 100,
  error: 0,
};

type CreateCounselingRecordInput = {
  currentUser: AuthUserDto;
  memberId: string | null;
  studentName: string;
  sessionTitle: string;
  counselingType: string | null;
  audioDurationMs: number | null;
  file: File;
  clientRequestId?: string | null;
};

type SchedulableReadRecord = Pick<
  CounselingRecordListRow,
  | "id"
  | "internalId"
  | "status"
  | "processingStage"
  | "recordSource"
  | "audioStoragePath"
  | "analysisStatus"
  | "createdByUserId"
>;

function toListRowView(record: CounselingRecordRow): CounselingRecordListRow {
  return {
    id: record.publicId,
    internalId: record.id,
    createdByUserId: record.createdByUserId,
    studentName: record.studentName,
    sessionTitle: record.sessionTitle,
    counselingType: record.counselingType,
    counselorName: record.counselorName,
    status: record.status,
    recordSource: record.recordSource,
    audioOriginalName: record.audioOriginalName,
    audioMimeType: record.audioMimeType,
    audioByteSize: record.audioByteSize,
    audioDurationMs: record.audioDurationMs,
    audioStoragePath: record.audioStoragePath,
    transcriptText: record.transcriptText,
    transcriptSegmentCount: record.transcriptSegmentCount,
    processingStage: record.processingStage,
    processingProgress: record.processingProgress,
    processingMessage: record.processingMessage,
    processingChunkCount: record.processingChunkCount,
    processingChunkCompletedCount: record.processingChunkCompletedCount,
    transcriptionAttemptCount: record.transcriptionAttemptCount,
    analysisStatus: record.analysisStatus,
    analysisProgress: record.analysisProgress,
    analysisErrorMessage: record.analysisErrorMessage,
    analysisAttemptCount: record.analysisAttemptCount,
    spaceId: null,
    memberId: null,
    errorMessage: record.errorMessage,
    language: record.language,
    sttModel: record.sttModel,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    transcriptionCompletedAt: record.transcriptionCompletedAt,
    analysisCompletedAt: record.analysisCompletedAt,
  };
}

async function attachRelationPublicIds(
  record: CounselingRecordRow,
): Promise<CounselingRecordListRow> {
  const view = toListRowView(record);
  const db = getDb();

  if (record.spaceId !== null) {
    const { spaces } = await import("@/server/db/schema");
    const [spaceRow] = await db
      .select({ publicId: spaces.publicId })
      .from(spaces)
      .where(eq(spaces.id, record.spaceId))
      .limit(1);
    view.spaceId = spaceRow?.publicId ?? null;
  }

  if (record.memberId !== null) {
    const { members } = await import("@/server/db/schema");
    const [memberRow] = await db
      .select({ publicId: members.publicId })
      .from(members)
      .where(eq(members.id, record.memberId))
      .limit(1);
    view.memberId = memberRow?.publicId ?? null;
  }

  return view;
}

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

function resolvePersistedChunkCount(params: {
  recordedChunkCount: number;
  chunks: PersistedTranscriptionChunkSnapshot[];
}) {
  return Math.max(
    params.recordedChunkCount,
    params.chunks.reduce((max, chunk) => Math.max(max, chunk.index + 1), 0),
  );
}

function buildPartialTranscriptProgress(
  chunkCount: number,
  completedChunkCount: number,
) {
  if (chunkCount <= 0) {
    return PROCESSING_STAGE_PROGRESS.partial_transcript_ready;
  }

  return Math.max(
    PROCESSING_STAGE_PROGRESS.transcribing,
    Math.min(95, Math.round((completedChunkCount / chunkCount) * 100)),
  );
}

function buildPartialTranscriptMessage(params: {
  chunkCount: number;
  completedChunkCount: number;
  errorMessage: string;
}) {
  const missingChunkCount = Math.max(
    params.chunkCount - params.completedChunkCount,
    0,
  );
  const baseMessage =
    missingChunkCount > 0
      ? `원문 일부가 준비되었습니다. 전사 구간 ${params.completedChunkCount}/${params.chunkCount}개를 저장했고 누락 ${missingChunkCount}개 구간만 다시 시도하면 AI 분석을 시작할 수 있습니다.`
      : "원문 일부가 준비되었습니다. 누락 구간 재시도 후 AI 분석을 시작할 수 있습니다.";

  return `${baseMessage} 마지막 오류: ${params.errorMessage}`;
}

function buildTranscriptFromChunkSnapshots(
  chunks: PersistedTranscriptionChunkSnapshot[],
) {
  const transcriptParts: string[] = [];
  const segments: {
    publicId: string;
    segmentIndex: number;
    startMs: number | null;
    endMs: number | null;
    speakerLabel: string;
    speakerTone: CounselingRecordSpeakerTone;
    text: string;
  }[] = [];
  const modelNames = new Set<string>();
  let language: string | null = null;
  let durationMs: number | null = null;
  let segmentIndex = 0;

  for (const chunk of chunks) {
    const transcriptText = chunk.transcriptText.trim();

    if (transcriptText) {
      transcriptParts.push(transcriptText);
    }

    if (!language && chunk.language?.trim()) {
      language = chunk.language.trim();
    }

    if (chunk.model.trim()) {
      modelNames.add(chunk.model.trim());
    }

    if (typeof chunk.durationMs === "number" && chunk.durationMs > 0) {
      const candidateDurationMs = chunk.offsetMs + chunk.durationMs;
      durationMs =
        durationMs === null
          ? candidateDurationMs
          : Math.max(durationMs, candidateDurationMs);
    }

    for (const segment of chunk.segments) {
      const text = segment.text.trim();

      if (!text) {
        continue;
      }

      segments.push({
        publicId: generatePublicId(ID_PREFIX.counselingTranscriptSegments),
        segmentIndex,
        startMs: segment.startMs,
        endMs: segment.endMs,
        speakerLabel: segment.speakerLabel,
        speakerTone: segment.speakerTone,
        text,
      });
      segmentIndex += 1;
    }
  }

  return {
    transcriptText: transcriptParts.join("\n\n"),
    language,
    durationMs,
    model: modelNames.size > 0 ? Array.from(modelNames).join("+") : null,
    segments,
  };
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
  recordInternalId: bigint,
  patch: Partial<typeof counselingRecords.$inferInsert>,
) {
  await getDb()
    .update(counselingRecords)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(counselingRecords.id, recordInternalId));
}

async function updateAnalysisState(
  recordInternalId: bigint,
  patch: Partial<typeof counselingRecords.$inferInsert>,
) {
  await getDb()
    .update(counselingRecords)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(counselingRecords.id, recordInternalId));
}

function scheduleCounselingRecordTranscription(params: {
  userId: string;
  recordPublicId: string;
  clientRequestId?: string | null;
}) {
  if (scheduledTranscriptionJobs.has(params.recordPublicId)) {
    return false;
  }

  const job = (async () => {
    const record = await findOwnedRecord(params.userId, params.recordPublicId);

    if (!hasPlayableAudio(record)) {
      return;
    }

    await runTranscriptionForRecord({
      record,
      clientRequestId: params.clientRequestId,
    });
  })()
    .catch((error) => {
      console.error("counseling-record-transcription-failed", {
        recordId: params.recordPublicId,
        error,
      });
    })
    .finally(() => {
      scheduledTranscriptionJobs.delete(params.recordPublicId);
    });

  scheduledTranscriptionJobs.set(params.recordPublicId, job);

  return true;
}

function scheduleCounselingRecordAnalysis(params: {
  userId: string;
  recordPublicId: string;
}) {
  if (scheduledAnalysisJobs.has(params.recordPublicId)) {
    return false;
  }

  const job = (async () => {
    const record = await findOwnedRecord(params.userId, params.recordPublicId);

    if (record.status !== "ready") {
      return;
    }

    await runQueuedAnalysisForRecord(record);
  })()
    .catch((error) => {
      console.error("counseling-record-analysis-failed", {
        recordId: params.recordPublicId,
        error,
      });
    })
    .finally(() => {
      scheduledAnalysisJobs.delete(params.recordPublicId);
    });

  scheduledAnalysisJobs.set(params.recordPublicId, job);

  return true;
}

function ensureCounselingRecordTranscriptionScheduled(
  record: Pick<
    CounselingRecordListRow,
    | "id"
    | "status"
    | "processingStage"
    | "recordSource"
    | "audioStoragePath"
    | "createdByUserId"
  >,
  options?: {
    clientRequestId?: string | null;
  },
) {
  if (
    record.status !== "processing" ||
    !hasPlayableAudio(record) ||
    !AUTO_TRANSCRIPTION_STAGES.has(record.processingStage)
  ) {
    return false;
  }

  return scheduleCounselingRecordTranscription({
    userId: record.createdByUserId,
    recordPublicId: record.id,
    clientRequestId: options?.clientRequestId ?? null,
  });
}

function ensureCounselingRecordAnalysisScheduled(
  record: Pick<
    CounselingRecordListRow,
    "id" | "status" | "analysisStatus" | "createdByUserId"
  >,
) {
  if (
    record.status !== "ready" ||
    !["queued", "processing"].includes(record.analysisStatus)
  ) {
    return false;
  }

  return scheduleCounselingRecordAnalysis({
    userId: record.createdByUserId,
    recordPublicId: record.id,
  });
}

function ensureRecordProcessingScheduled(record: SchedulableReadRecord) {
  ensureCounselingRecordTranscriptionScheduled(record);
  ensureCounselingRecordAnalysisScheduled(record);
}

function ensureRecordProcessingScheduledForList(
  records: SchedulableReadRecord[],
) {
  for (const record of records) {
    ensureRecordProcessingScheduled(record);
  }
}

async function queueAnalysisAfterTranscriptMutation(params: {
  userId: string;
  recordInternalId: bigint;
  recordPublicId: string;
  processingMessage: string;
}) {
  await getDb()
    .update(counselingRecords)
    .set({
      analysisResult: null,
      analysisStatus: "queued",
      analysisProgress: 0,
      analysisErrorMessage: null,
      analysisCompletedAt: null,
      processingStage: "transcript_ready",
      processingMessage: params.processingMessage,
      updatedAt: new Date(),
    })
    .where(eq(counselingRecords.id, params.recordInternalId));

  const refreshedRecord = await findOwnedRecord(
    params.userId,
    params.recordPublicId,
  );
  const refreshedListRow = await attachRelationPublicIds(refreshedRecord);
  ensureCounselingRecordAnalysisScheduled(refreshedListRow);
}

// ── 내부 헬퍼 ──

/** demo placeholder 기록만 제외하고 실제 상담 기록 + 텍스트 메모를 반환 */
function filterVisibleRecords<
  T extends { recordSource?: string | null; audioStoragePath: string },
>(records: T[]): T[] {
  return records.filter((record) => !isDemoPlaceholderRecord(record));
}

function assertViewableRecord(record: CounselingRecordRow) {
  if (isDemoPlaceholderRecord(record)) {
    throw new ServiceError(
      404,
      "이 상담 기록은 실제 원본 음성이 없는 데모 데이터라 더 이상 열 수 없습니다.",
    );
  }

  return record;
}

function mapReadyRecordListItems(records: CounselingRecordListRow[]) {
  const visibleRecords = filterVisibleRecords(records);
  ensureRecordProcessingScheduledForList(visibleRecords);
  return visibleRecords.map(mapRecordListItem);
}

async function mapRequestedRecordDetails(params: {
  recordPublicIds: string[];
  detailSources: CounselingRecordDetailSource[];
}) {
  const detailSourceByPublicId = new Map(
    params.detailSources.map((source) => [source.record.publicId, source]),
  );

  const results: CounselingRecordDetail[] = [];

  for (const recordPublicId of params.recordPublicIds) {
    const source = detailSourceByPublicId.get(recordPublicId);

    if (!source || isDemoPlaceholderRecord(source.record)) {
      continue;
    }

    const listRow = await attachRelationPublicIds(source.record);
    ensureRecordProcessingScheduled(listRow);
    results.push(
      mapRecordDetail(
        {
          ...listRow,
          analysisResult: source.record.analysisResult,
          assistantMessages: source.record.assistantMessages,
        },
        source.segments,
      ),
    );
  }

  return results;
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
    recordId: record.publicId,
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
        await findOwnedRecord(record.createdByUserId, record.publicId),
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
  recordInternalId: bigint;
  initialStudentName: string;
  originalAudioDurationMs: number | null;
  transcription: Awaited<ReturnType<typeof transcribeStoredAudio>>;
  resolvedSegments: {
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
      .where(eq(counselingRecords.id, params.recordInternalId));

    await tx
      .delete(counselingTranscriptSegments)
      .where(eq(counselingTranscriptSegments.recordId, params.recordInternalId));

    if (params.resolvedSegments.length > 0) {
      await tx.insert(counselingTranscriptSegments).values(
        params.resolvedSegments.map((segment) => ({
          publicId: generatePublicId(ID_PREFIX.counselingTranscriptSegments),
          recordId: params.recordInternalId,
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

async function persistPartialTranscriptResult(params: {
  recordInternalId: bigint;
  chunkSnapshots: PersistedTranscriptionChunkSnapshot[];
  originalAudioDurationMs: number | null;
  processingChunkCount: number;
  errorMessage: string;
}): Promise<void> {
  const db = getDb();
  const now = new Date();
  const partialTranscript = buildTranscriptFromChunkSnapshots(
    params.chunkSnapshots,
  );
  const processingChunkCount = resolvePersistedChunkCount({
    recordedChunkCount: params.processingChunkCount,
    chunks: params.chunkSnapshots,
  });
  const completedChunkCount = params.chunkSnapshots.length;

  await db.transaction(async (tx) => {
    await tx
      .update(counselingRecords)
      .set({
        status: "processing",
        transcriptText: partialTranscript.transcriptText,
        transcriptSegmentCount: partialTranscript.segments.length,
        language: partialTranscript.language,
        sttModel: partialTranscript.model,
        audioDurationMs:
          partialTranscript.durationMs ?? params.originalAudioDurationMs,
        errorMessage: params.errorMessage,
        processingStage: PARTIAL_TRANSCRIPT_READY_STAGE,
        processingProgress: buildPartialTranscriptProgress(
          processingChunkCount,
          completedChunkCount,
        ),
        processingMessage: buildPartialTranscriptMessage({
          chunkCount: processingChunkCount,
          completedChunkCount,
          errorMessage: params.errorMessage,
        }),
        processingChunkCount,
        processingChunkCompletedCount: completedChunkCount,
        transcriptionChunks: params.chunkSnapshots,
        analysisResult: null,
        analysisStatus: "idle",
        analysisProgress: 0,
        analysisErrorMessage: null,
        analysisCompletedAt: null,
        transcriptionCompletedAt: null,
        updatedAt: now,
      })
      .where(eq(counselingRecords.id, params.recordInternalId));

    await tx
      .delete(counselingTranscriptSegments)
      .where(eq(counselingTranscriptSegments.recordId, params.recordInternalId));

    if (partialTranscript.segments.length > 0) {
      await tx.insert(counselingTranscriptSegments).values(
        partialTranscript.segments.map((segment) => ({
          publicId: segment.publicId,
          recordId: params.recordInternalId,
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
    params.record.publicId,
  );
  if (freshRecord.status !== "processing") {
    console.info("전사 스킵: 레코드 상태가 processing이 아님", {
      recordId: params.record.publicId,
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
      recordInternalId: params.record.id,
      initialStudentName: params.record.studentName,
      originalAudioDurationMs: params.record.audioDurationMs,
      transcription,
      resolvedSegments,
      resolvedStudentName,
    });

    const completedRecord = await findOwnedRecord(
      params.record.createdByUserId,
      params.record.publicId,
    );
    const completedListRow = await attachRelationPublicIds(completedRecord);
    ensureCounselingRecordAnalysisScheduled(completedListRow);
  } catch (error) {
    const message =
      error instanceof ServiceError
        ? error.message
        : "음성 전사 처리 중 알 수 없는 오류가 발생했습니다.";
    const latestRecord = await findOwnedRecord(
      params.record.createdByUserId,
      params.record.publicId,
    );
    const partialChunks = readTranscriptionChunks(latestRecord);

    if (partialChunks.length > 0) {
      console.warn("counseling-record-transcription-partial", {
        recordId: params.record.publicId,
        completedChunkCount: partialChunks.length,
        processingChunkCount: latestRecord.processingChunkCount,
        error: message,
      });

      await persistPartialTranscriptResult({
        recordInternalId: params.record.id,
        chunkSnapshots: partialChunks,
        originalAudioDurationMs: params.record.audioDurationMs,
        processingChunkCount: latestRecord.processingChunkCount,
        errorMessage: message,
      });
      return;
    }

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
    record.publicId,
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

export async function listCounselingRecords(
  userId: string,
  options?: CounselingRecordListQueryOptions,
) {
  return mapReadyRecordListItems(await findRecordsByUserId(userId, options));
}

export async function listStudentSummaries(
  userId: string,
): Promise<StudentSummary[]> {
  const summaries = await summarizeStudentsByName(userId);

  return summaries.map((summary) => ({
    studentName: summary.studentName,
    recordCount: summary.recordCount,
    firstCounselingAt: summary.firstCounselingAt.toISOString(),
    lastCounselingAt: summary.lastCounselingAt.toISOString(),
  }));
}

async function getMultipleCounselingRecordDetailsInternal(
  userId: string,
  recordPublicIds: string[],
) {
  if (recordPublicIds.length === 0) {
    return [] as CounselingRecordDetail[];
  }

  return mapRequestedRecordDetails({
    recordPublicIds,
    detailSources: await findOwnedRecordDetailSourcesByIds(
      userId,
      recordPublicIds,
    ),
  });
}

export async function getMultipleCounselingRecordDetails(
  userId: string,
  recordPublicIds: string[],
) {
  return getMultipleCounselingRecordDetailsInternal(userId, recordPublicIds);
}

export async function getCounselingRecordDetail(
  userId: string,
  recordPublicId: string,
) {
  const source = await findOwnedRecordDetailSource(userId, recordPublicId);
  const record = assertViewableRecord(source.record);

  const listRow = await attachRelationPublicIds(record);
  ensureRecordProcessingScheduled(listRow);

  return mapRecordDetail(
    {
      ...listRow,
      analysisResult: record.analysisResult,
      assistantMessages: record.assistantMessages,
    },
    source.segments,
  );
}

export async function appendCounselingRecordAssistantMessages(
  userId: string,
  recordPublicId: string,
  messages: CounselingChatMessage[],
) {
  if (messages.length === 0) {
    return [];
  }

  const record = await findOwnedRecord(userId, recordPublicId);
  const currentMessages = parseCounselingChatMessages(record.assistantMessages);
  const nextMessages = [...currentMessages, ...messages];

  await replaceAssistantMessages(recordPublicId, nextMessages);

  return nextMessages;
}

export async function clearCounselingRecordAssistantMessages(
  userId: string,
  recordPublicId: string,
) {
  await findOwnedRecord(userId, recordPublicId);
  await replaceAssistantMessages(recordPublicId, []);
}

export async function getMultipleRecordsWithSegments(
  userId: string,
  recordPublicIds: string[],
) {
  const MAX_TREND_RECORDS = 5;
  const limitedIds = recordPublicIds.slice(0, MAX_TREND_RECORDS);
  const detailedRecords = await getMultipleCounselingRecordDetailsInternal(
    userId,
    limitedIds,
  );

  const results = detailedRecords.map((record) => ({
    studentName: record.studentName,
    sessionTitle: record.sessionTitle,
    counselingType: record.counselingType,
    createdAt: record.createdAt,
    segments: record.transcriptSegments.map((segment) => ({
      speakerLabel: segment.speakerLabel,
      text: segment.text,
      startMs: segment.startMs ?? 0,
    })),
  }));

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
  const recordPublicId = generatePublicId(ID_PREFIX.counselingRecords);
  let linkedMemberInternalId: bigint | null = null;
  let linkedSpaceInternalId: bigint | null = null;
  let resolvedStudentName = sanitizeOptionalValue(input.studentName, 80) ?? "";

  if (input.memberId) {
    const member = await getMemberByIdForUser(
      input.currentUser.id,
      input.memberId,
    );
    linkedMemberInternalId = member.id;
    linkedSpaceInternalId = member.spaceId;
    resolvedStudentName = resolvedStudentName || member.name;
  }

  const sessionTitle = sanitizeRequiredValue(
    input.sessionTitle,
    160,
    "상담 제목",
  );
  const counselingType =
    sanitizeOptionalValue(input.counselingType, 40) ?? DEFAULT_COUNSELING_TYPE;
  const persistedAudio = await persistAudioFile(recordPublicId, input.file);
  const now = new Date();

  try {
    await db.insert(counselingRecords).values({
      publicId: recordPublicId,
      createdByUserId: input.currentUser.id,
      memberId: linkedMemberInternalId,
      spaceId: linkedSpaceInternalId,
      studentName: resolvedStudentName,
      sessionTitle,
      counselingType,
      recordSource: COUNSELING_RECORD_SOURCE.AUDIO_UPLOAD,
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
          recordId: recordPublicId,
          cleanupError,
        });
      },
    );

    throw error;
  }

  scheduleCounselingRecordTranscription({
    userId: input.currentUser.id,
    recordPublicId,
    clientRequestId: input.clientRequestId,
  });

  return getCounselingRecordDetail(input.currentUser.id, recordPublicId);
}

export async function createTextMemoRecord(input: {
  currentUser: AuthUserDto;
  studentName: string;
  memberId: string | null;
  sessionTitle: string;
  content: string;
  counselingType?: string;
}): Promise<CounselingRecordDetail> {
  const db = getDb();
  const recordPublicId = generatePublicId(ID_PREFIX.counselingRecords);
  const segmentPublicId = generatePublicId(
    ID_PREFIX.counselingTranscriptSegments,
  );
  let linkedMemberInternalId: bigint | null = null;
  let linkedSpaceInternalId: bigint | null = null;
  let resolvedStudentName = sanitizeOptionalValue(input.studentName, 80) ?? "";

  if (input.memberId) {
    const member = await getMemberByIdForUser(
      input.currentUser.id,
      input.memberId,
    );
    linkedMemberInternalId = member.id;
    linkedSpaceInternalId = member.spaceId;
    resolvedStudentName = resolvedStudentName || member.name;
  }

  const sessionTitle = sanitizeRequiredValue(
    input.sessionTitle,
    160,
    "메모 제목",
  );
  const content = input.content.trim().slice(0, 10000);
  const counselingType =
    sanitizeOptionalValue(input.counselingType, 40) ?? "텍스트 메모";
  const now = new Date();

  await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(counselingRecords)
      .values({
        publicId: recordPublicId,
        createdByUserId: input.currentUser.id,
        memberId: linkedMemberInternalId,
        spaceId: linkedSpaceInternalId,
        studentName: resolvedStudentName,
        sessionTitle,
        counselingType,
        recordSource: COUNSELING_RECORD_SOURCE.TEXT_MEMO,
        counselorName:
          sanitizeOptionalValue(input.currentUser.displayName, 80) ??
          sanitizeOptionalValue(input.currentUser.email, 80),
        status: "ready",
        audioOriginalName: "텍스트 메모",
        audioMimeType: "text/plain",
        audioByteSize: 0,
        audioDurationMs: null,
        audioStoragePath: `text_memo://${recordPublicId}`,
        audioSha256: "",
        transcriptText: content,
        transcriptSegmentCount: 1,
        language: "ko",
        processingStage: "completed",
        processingProgress: 100,
        processingMessage: "텍스트 메모 원문이 즉시 준비되었습니다.",
        analysisStatus: "idle",
        analysisProgress: 0,
        updatedAt: now,
      })
      .returning({ id: counselingRecords.id });

    if (!inserted) {
      throw new ServiceError(500, "텍스트 메모 생성에 실패했습니다.");
    }

    await tx.insert(counselingTranscriptSegments).values({
      publicId: segmentPublicId,
      recordId: inserted.id,
      segmentIndex: 0,
      startMs: null,
      endMs: null,
      speakerLabel: "메모",
      speakerTone: "unknown",
      text: content,
    });
  });

  return getCounselingRecordDetail(input.currentUser.id, recordPublicId);
}

export async function retryCounselingRecordTranscription(
  currentUser: AuthUserDto,
  recordPublicId: string,
  clientRequestId?: string | null,
) {
  const db = getDb();
  const existingRecord = await findOwnedRecord(currentUser.id, recordPublicId);
  const preservedChunks =
    existingRecord.processingStage === PARTIAL_TRANSCRIPT_READY_STAGE
      ? readTranscriptionChunks(existingRecord)
      : [];
  const shouldRetryMissingChunks = preservedChunks.length > 0;

  if (isTextMemoRecord(existingRecord)) {
    throw new ServiceError(
      400,
      "텍스트 메모는 재전사할 수 없습니다. 원문 내용을 직접 수정해 주세요.",
    );
  }

  if (isDemoPlaceholderRecord(existingRecord)) {
    throw new ServiceError(
      400,
      "데모 placeholder 기록은 재전사할 수 없습니다. 새 음성 기록을 업로드해 주세요.",
    );
  }

  if (
    existingRecord.status === "processing" &&
    scheduledTranscriptionJobs.has(existingRecord.publicId)
  ) {
    return getCounselingRecordDetail(currentUser.id, recordPublicId);
  }

  const now = new Date();

  await db
    .update(counselingRecords)
    .set({
      status: "processing",
      errorMessage: null,
      processingStage: "queued",
      processingProgress: PROCESSING_STAGE_PROGRESS.queued,
      processingMessage: shouldRetryMissingChunks
        ? "누락된 전사 구간만 다시 준비하고 있습니다. 이미 저장된 원문은 유지됩니다."
        : "백그라운드 전사를 다시 준비하고 있습니다.",
      processingChunkCount: shouldRetryMissingChunks
        ? resolvePersistedChunkCount({
            recordedChunkCount: existingRecord.processingChunkCount,
            chunks: preservedChunks,
          })
        : 0,
      processingChunkCompletedCount: shouldRetryMissingChunks
        ? preservedChunks.length
        : 0,
      transcriptionChunks: shouldRetryMissingChunks ? preservedChunks : null,
      analysisStatus: "idle",
      analysisProgress: 0,
      analysisErrorMessage: null,
      analysisResult: null,
      analysisCompletedAt: null,
      updatedAt: now,
    })
    .where(eq(counselingRecords.id, existingRecord.id));

  scheduleCounselingRecordTranscription({
    userId: currentUser.id,
    recordPublicId: existingRecord.publicId,
    clientRequestId,
  });

  return getCounselingRecordDetail(currentUser.id, recordPublicId);
}

export async function getCounselingRecordAudio(
  userId: string,
  recordPublicId: string,
  rangeHeader?: string | null,
) {
  const record = await findOwnedRecord(userId, recordPublicId);

  if (isTextMemoRecord(record)) {
    throw new ServiceError(404, "텍스트 메모에는 재생할 원본 음성이 없습니다.");
  }

  if (isDemoPlaceholderRecord(record)) {
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

export async function runAnalysisForRecord(
  userId: string,
  recordPublicId: string,
) {
  const detail = await getCounselingRecordDetail(userId, recordPublicId);

  if (detail.status !== "ready" || detail.transcriptSegments.length === 0) {
    throw new ServiceError(400, "전사가 완료된 레코드만 분석할 수 있습니다.");
  }

  if (detail.analysisResult && detail.analysisStatus === "ready") {
    return detail.analysisResult;
  }

  if (detail.analysisStatus === "processing") {
    const existingJob = scheduledAnalysisJobs.get(recordPublicId);
    if (existingJob) {
      await existingJob;
      const refreshedWhileRunning = await getCounselingRecordDetail(
        userId,
        recordPublicId,
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

  const record = await findOwnedRecord(userId, recordPublicId);
  await runQueuedAnalysisForRecord(record);

  const refreshed = await getCounselingRecordDetail(userId, recordPublicId);

  if (!refreshed.analysisResult) {
    throw new ServiceError(502, "AI 분석 결과를 저장하지 못했습니다.");
  }

  return refreshed.analysisResult;
}

export async function linkCounselingRecordMember(
  userId: string,
  recordPublicId: string,
  memberPublicId: string | null,
) {
  await findOwnedRecord(userId, recordPublicId);

  /* memberId가 있으면 소유권 검증 후 해당 멤버의 space publicId를 함께 저장 */
  let spacePublicId: string | null = null;
  if (memberPublicId) {
    // getMemberByIdForUser: 현재 사용자의 space에 속한 멤버인지 함께 검증
    const member = await getMemberByIdForUser(userId, memberPublicId);
    // member.spaceId는 내부 bigint이므로 publicId로 해석
    const { spaces } = await import("@/server/db/schema");
    const [spaceRow] = await getDb()
      .select({ publicId: spaces.publicId })
      .from(spaces)
      .where(eq(spaces.id, member.spaceId))
      .limit(1);
    spacePublicId = spaceRow?.publicId ?? null;
  }

  await linkRecordToMember(recordPublicId, memberPublicId, spacePublicId);
}

export async function listCounselingRecordsBySpace(
  userId: string,
  spacePublicId: string,
  options?: CounselingRecordListQueryOptions,
) {
  return mapReadyRecordListItems(
    await findRecordsBySpaceId(userId, spacePublicId, options),
  );
}

export async function listUnlinkedCounselingRecords(
  userId: string,
  options?: CounselingRecordListQueryOptions,
) {
  return mapReadyRecordListItems(await findUnlinkedRecords(userId, options));
}

export async function listCounselingRecordsByMember(
  userId: string,
  memberPublicId: string,
  options?: CounselingRecordListQueryOptions,
) {
  return mapReadyRecordListItems(
    await findRecordsByMemberId(userId, memberPublicId, options),
  );
}

export async function deleteCounselingRecord(
  userId: string,
  recordPublicId: string,
) {
  // 진행 중인 전사 job을 취소해 고아 세그먼트 방지
  scheduledTranscriptionJobs.delete(recordPublicId);
  scheduledAnalysisJobs.delete(recordPublicId);

  const record = await findOwnedRecord(userId, recordPublicId);
  const db = getDb();

  await db.delete(counselingRecords).where(eq(counselingRecords.id, record.id));

  if (hasPlayableAudio(record)) {
    try {
      await deleteCounselingAudioObject(record.audioStoragePath);
    } catch (error) {
      console.error("counseling-record-r2-delete-failed", {
        recordId: record.publicId,
        storagePath: record.audioStoragePath,
        error,
      });
    }
  }
}

export async function updateTranscriptSegment(
  userId: string,
  recordPublicId: string,
  segmentPublicId: string,
  patch: {
    text?: string;
    speakerLabel?: string;
    speakerTone?: CounselingRecordSpeakerTone;
  },
) {
  const record = await findOwnedRecord(userId, recordPublicId);
  const db = getDb();

  if (record.status !== "ready") {
    throw new ServiceError(
      400,
      "원문 전사가 모두 준비된 기록만 편집할 수 있습니다. 누락 구간 복구 후 다시 시도해 주세요.",
    );
  }

  const [segment] = await db
    .select()
    .from(counselingTranscriptSegments)
    .where(
      and(
        eq(counselingTranscriptSegments.publicId, segmentPublicId),
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
    .where(eq(counselingTranscriptSegments.publicId, segmentPublicId))
    .returning();

  await rebuildTranscriptText(record.id);

  // 전사 내용이 변경되면 분석 결과가 stale해지므로 초기화
  // runAnalysisForRecord의 캐시 체크(detail.analysisResult)가 재분석을 허용하게 됨
  await queueAnalysisAfterTranscriptMutation({
    userId,
    recordInternalId: record.id,
    recordPublicId: record.publicId,
    processingMessage: "원문이 수정되어 AI 분석을 다시 준비합니다.",
  });

  return mapSegmentRow(updated);
}

export async function bulkUpdateSpeakerLabel(
  userId: string,
  recordPublicId: string,
  fromSpeakerLabel: string,
  toSpeakerLabel: string,
  toSpeakerTone?: CounselingRecordSpeakerTone,
) {
  const record = await findOwnedRecord(userId, recordPublicId);
  const db = getDb();

  if (record.status !== "ready") {
    throw new ServiceError(
      400,
      "원문 전사가 모두 준비된 기록만 화자 정보를 수정할 수 있습니다. 누락 구간 복구 후 다시 시도해 주세요.",
    );
  }

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
    await queueAnalysisAfterTranscriptMutation({
      userId,
      recordInternalId: record.id,
      recordPublicId: record.publicId,
      processingMessage: "화자 정보가 수정되어 AI 분석을 다시 준비합니다.",
    });
  }

  return result.length;
}

// 현재 미사용이지만 다른 패키지에서 참조할 수 있어 유지한다.
export { resolveRecordInternalIdByPublicId, resolveSpaceInternalIdByPublicId };
