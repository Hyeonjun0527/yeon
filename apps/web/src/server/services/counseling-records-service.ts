import type {
  AuthUserDto,
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
import { transcribeStoredAudio } from "./counseling-transcription-engine";
import { analyzeCounselingRecord, resolveSpeakerNames } from "./counseling-ai-service";
import {
  type CounselingRecordRow,
  DEFAULT_COUNSELING_TYPE,
  findOwnedRecord,
  findRecordsByMemberId,
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

// ── 전사 스케줄러 ──

// TODO: 단일 인스턴스 전제. 다중 인스턴스 배포 시 DB 기반 lock 또는 외부 큐로 교체 필요.
const scheduledTranscriptionJobs = new Map<string, Promise<void>>();

type CreateCounselingRecordInput = {
  currentUser: AuthUserDto;
  studentName: string;
  sessionTitle: string;
  counselingType: string | null;
  audioDurationMs: number | null;
  file: File;
  clientRequestId?: string | null;
};

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

async function runTranscriptionForRecord(params: {
  record: CounselingRecordRow;
  clientRequestId?: string | null;
}) {
  const freshRecord = await findOwnedRecord(params.record.createdByUserId, params.record.id);
  if (freshRecord.status !== "processing") {
    console.info("전사 스킵: 레코드 상태가 processing이 아님", {
      recordId: params.record.id,
      status: freshRecord.status,
    });
    return;
  }

  const db = getDb();

  try {
    const speakerHints = ["멘토"];
    if (freshRecord.studentName) {
      speakerHints.push(freshRecord.studentName);
    }

    const result = await transcribeStoredAudio({
      recordId: freshRecord.id,
      storagePath: freshRecord.audioStoragePath,
      mimeType: freshRecord.audioMimeType,
      originalName: freshRecord.audioOriginalName,
      byteSize: freshRecord.audioByteSize,
      durationMs: freshRecord.audioDurationMs,
      clientRequestId: params.clientRequestId,
      speakerHints,
    });
    // AI 화자 식별: generic 라벨(화자 A/B)을 실제 이름/역할로 교체
    const speakerResolution = await resolveSpeakerNames(
      result.segments.map((s) => ({
        speakerLabel: s.speakerLabel,
        text: s.text,
        startMs: s.startMs ?? 0,
      })),
    ).catch((err) => {
      console.warn("화자 식별 실패, 원본 라벨 유지:", err);
      return { mapping: {} as Record<string, { name: string; tone: CounselingRecordSpeakerTone }>, studentName: null };
    });

    const resolvedSegments = result.segments.map((seg) => {
      const resolved = speakerResolution.mapping[seg.speakerLabel];
      if (!resolved) return seg;
      return {
        ...seg,
        speakerLabel: resolved.name,
        speakerTone: resolved.tone as CounselingRecordSpeakerTone,
      };
    });

    const resolvedStudentName =
      speakerResolution.studentName || params.record.studentName || null;

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(counselingRecords)
        .set({
          status: "ready",
          transcriptText: result.transcriptText,
          transcriptSegmentCount: resolvedSegments.length,
          language: result.language,
          sttModel: result.model,
          audioDurationMs: result.durationMs ?? params.record.audioDurationMs,
          ...(resolvedStudentName && !params.record.studentName
            ? { studentName: resolvedStudentName }
            : {}),
          errorMessage: null,
          transcriptionCompletedAt: now,
          updatedAt: now,
        })
        .where(eq(counselingRecords.id, params.record.id));

      await tx
        .delete(counselingTranscriptSegments)
        .where(eq(counselingTranscriptSegments.recordId, params.record.id));

      if (resolvedSegments.length > 0) {
        await tx.insert(counselingTranscriptSegments).values(
          resolvedSegments.map((segment) => ({
            id: segment.id,
            recordId: params.record.id,
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
  } catch (error) {
    const now = new Date();
    const message =
      error instanceof ServiceError
        ? error.message
        : "음성 전사 처리 중 알 수 없는 오류가 발생했습니다.";

    await db
      .update(counselingRecords)
      .set({
        status: "error",
        errorMessage: message,
        updatedAt: now,
      })
      .where(eq(counselingRecords.id, params.record.id));

    throw error;
  }
}

// ── 공개 서비스 함수 ──

export async function listCounselingRecords(userId: string) {
  const db = getDb();
  const records = (
    await db
      .select()
      .from(counselingRecords)
      .where(eq(counselingRecords.createdByUserId, userId))
      .orderBy(desc(counselingRecords.createdAt))
  ).filter((record) => !isPlaceholderAudioStoragePath(record.audioStoragePath));

  for (const record of records) {
    ensureCounselingRecordTranscriptionScheduled(record);
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
    throw new ServiceError(400, "같은 수강생의 기록만 추이 분석할 수 있습니다.");
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

  // 이미 분석 결과가 있으면 캐시 반환
  if (detail.analysisResult) {
    return detail.analysisResult;
  }

  const result = await analyzeCounselingRecord(
    {
      studentName: detail.studentName,
      sessionTitle: detail.sessionTitle,
      counselingType: detail.counselingType,
      createdAt: detail.createdAt,
    },
    detail.transcriptSegments.map((s) => ({
      speakerLabel: s.speakerLabel,
      text: s.text,
      startMs: s.startMs ?? 0,
    })),
  );

  // DB에 분석 결과 저장
  const db = getDb();
  await db
    .update(counselingRecords)
    .set({ analysisResult: result, updatedAt: new Date() })
    .where(eq(counselingRecords.id, recordId));

  return result;
}

export async function linkCounselingRecordMember(
  userId: string,
  recordId: string,
  memberId: string | null,
) {
  await findOwnedRecord(userId, recordId);
  await linkRecordToMember(recordId, memberId);
}

export async function listCounselingRecordsByMember(
  userId: string,
  memberId: string,
) {
  const records = await findRecordsByMemberId(userId, memberId);
  return records.map(mapRecordListItem);
}

export async function deleteCounselingRecord(userId: string, recordId: string) {
  // 진행 중인 전사 job을 취소해 고아 세그먼트 방지
  scheduledTranscriptionJobs.delete(recordId);

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
  }

  return result.length;
}
