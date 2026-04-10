import type {
  CounselingRecordDetail,
  CounselingRecordListItem,
  CounselingTranscriptSegment,
} from "@yeon/api-contract/counseling-records";
import { analysisResultSchema } from "@yeon/api-contract/counseling-records";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { createHash } from "node:crypto";
import path from "node:path";

import { getDb } from "@/server/db";
import {
  counselingRecords,
  counselingTranscriptSegments,
} from "@/server/db/schema";

import { ServiceError } from "./service-error";
import { uploadCounselingAudioObject } from "./counseling-record-audio-storage";

export const MAX_AUDIO_UPLOAD_BYTES = 128 * 1024 * 1024;
const DEFAULT_COUNSELING_TYPE = "대면 상담";
export const PLACEHOLDER_AUDIO_STORAGE_PREFIXES = ["local://demo/", "text_memo://"] as const;

export type CounselingRecordRow = typeof counselingRecords.$inferSelect;
type CounselingTranscriptSegmentRow =
  typeof counselingTranscriptSegments.$inferSelect;

const VALID_STATUSES = new Set<CounselingRecordListItem["status"]>([
  "processing",
  "ready",
  "error",
]);

const VALID_SPEAKER_TONES = new Set<CounselingTranscriptSegment["speakerTone"]>(
  ["teacher", "student", "unknown"],
);

function toRecordStatus(raw: string): CounselingRecordListItem["status"] {
  if (VALID_STATUSES.has(raw as CounselingRecordListItem["status"])) {
    return raw as CounselingRecordListItem["status"];
  }

  return "error";
}

function toSpeakerTone(
  raw: string,
): CounselingTranscriptSegment["speakerTone"] {
  if (
    VALID_SPEAKER_TONES.has(raw as CounselingTranscriptSegment["speakerTone"])
  ) {
    return raw as CounselingTranscriptSegment["speakerTone"];
  }

  return "unknown";
}

export type PersistedAudio = {
  storagePath: string;
  sha256: string;
  byteSize: number;
  originalName: string;
  mimeType: string;
};

// ── 순수 유틸리티 ──

export function sanitizeSingleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function sanitizeOptionalValue(
  value: string | null | undefined,
  maxLength: number,
) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return sanitizeSingleLine(trimmed).slice(0, maxLength);
}

export function sanitizeRequiredValue(
  value: string | null | undefined,
  maxLength: number,
  fieldLabel: string,
) {
  const normalized = sanitizeOptionalValue(value, maxLength);

  if (!normalized) {
    throw new ServiceError(400, `${fieldLabel}을 입력해 주세요.`);
  }

  return normalized;
}

export function isPlaceholderAudioStoragePath(storagePath: string) {
  return PLACEHOLDER_AUDIO_STORAGE_PREFIXES.some((prefix) =>
    storagePath.startsWith(prefix),
  );
}

export { DEFAULT_COUNSELING_TYPE };

// ── 오디오 파일 저장 ──

function sanitizeFileStem(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "recording";
}

function ensureAllowedAudioFile(file: File) {
  if (file.size <= 0) {
    throw new ServiceError(400, "비어 있는 음성 파일은 업로드할 수 없습니다.");
  }

  if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
    throw new ServiceError(
      413,
      `음성 파일은 ${Math.floor(MAX_AUDIO_UPLOAD_BYTES / 1024 / 1024)}MB 이하만 업로드할 수 있습니다.`,
    );
  }

  const mimeType = file.type.trim().toLowerCase();

  if (!mimeType.startsWith("audio/")) {
    throw new ServiceError(400, "오디오 파일만 업로드할 수 있습니다.");
  }
}

function guessExtensionFromMimeType(mimeType: string) {
  switch (mimeType) {
    case "audio/webm":
      return ".webm";
    case "audio/wav":
    case "audio/x-wav":
      return ".wav";
    case "audio/mpeg":
    case "audio/mp3":
      return ".mp3";
    case "audio/mp4":
    case "audio/m4a":
    case "audio/x-m4a":
      return ".m4a";
    case "audio/ogg":
      return ".ogg";
    default:
      return ".bin";
  }
}

export async function persistAudioFile(
  recordId: string,
  file: File,
): Promise<PersistedAudio> {
  ensureAllowedAudioFile(file);

  const originalName = sanitizeSingleLine(file.name || "recording");
  const originalExtension =
    path.extname(originalName) || guessExtensionFromMimeType(file.type);
  const safeStem = sanitizeFileStem(
    path.basename(originalName, originalExtension),
  );
  const storagePath = path.posix.join(
    recordId,
    `${Date.now()}-${safeStem}${originalExtension}`,
  );
  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  await uploadCounselingAudioObject({
    objectKey: storagePath,
    bytes,
    mimeType: file.type || "audio/webm",
    sha256,
  });

  return {
    storagePath,
    sha256,
    byteSize: bytes.byteLength,
    originalName,
    mimeType: file.type || "audio/webm",
  };
}

// ── Row → DTO 매핑 ──

function buildPreviewText(record: CounselingRecordRow) {
  if (record.status === "error") {
    return record.errorMessage ?? "전사 처리 중 오류가 발생했습니다.";
  }

  if (record.transcriptText.trim()) {
    return record.transcriptText.trim().slice(0, 96);
  }

  return "원문 전사를 준비 중입니다.";
}

function buildRecordTags(record: CounselingRecordRow) {
  return [record.counselingType].filter((value): value is string =>
    Boolean(value),
  );
}

export function mapRecordListItem(
  record: CounselingRecordRow,
): CounselingRecordListItem {
  return {
    id: record.id,
    spaceId: record.spaceId ?? null,
    memberId: record.memberId ?? null,
    studentName: record.studentName,
    sessionTitle: record.sessionTitle,
    counselingType: record.counselingType,
    counselorName: record.counselorName,
    status: toRecordStatus(record.status),
    preview: buildPreviewText(record),
    tags: buildRecordTags(record),
    audioOriginalName: record.audioOriginalName,
    audioMimeType: record.audioMimeType,
    audioByteSize: record.audioByteSize,
    audioDurationMs: record.audioDurationMs,
    transcriptSegmentCount: record.transcriptSegmentCount,
    transcriptTextLength: record.transcriptText.length,
    language: record.language,
    sttModel: record.sttModel,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    transcriptionCompletedAt: record.transcriptionCompletedAt
      ? record.transcriptionCompletedAt.toISOString()
      : null,
  };
}

export function mapSegmentRow(
  segment: CounselingTranscriptSegmentRow,
): CounselingTranscriptSegment {
  return {
    id: segment.id,
    segmentIndex: segment.segmentIndex,
    startMs: segment.startMs,
    endMs: segment.endMs,
    speakerLabel: segment.speakerLabel,
    speakerTone: toSpeakerTone(segment.speakerTone),
    text: segment.text,
  };
}

export function mapRecordDetail(
  record: CounselingRecordRow,
  segments: CounselingTranscriptSegmentRow[],
): CounselingRecordDetail {
  return {
    ...mapRecordListItem(record),
    transcriptText: record.transcriptText,
    transcriptSegments: segments.map(mapSegmentRow),
    audioUrl: isPlaceholderAudioStoragePath(record.audioStoragePath)
      ? null
      : `/api/v1/counseling-records/${record.id}/audio`,
    analysisResult: (() => {
      const parsed = analysisResultSchema.safeParse(record.analysisResult);
      return parsed.success ? parsed.data : null;
    })(),
  };
}

// ── DB 쿼리 ──

export async function linkRecordToMember(
  recordId: string,
  memberId: string | null,
  spaceId: string | null,
) {
  const db = getDb();
  await db
    .update(counselingRecords)
    .set({ memberId, spaceId, updatedAt: new Date() })
    .where(eq(counselingRecords.id, recordId));
}

export async function findRecordsBySpaceId(
  userId: string,
  spaceId: string,
): Promise<CounselingRecordRow[]> {
  const db = getDb();
  return db
    .select()
    .from(counselingRecords)
    .where(
      and(
        eq(counselingRecords.spaceId, spaceId),
        eq(counselingRecords.createdByUserId, userId),
      ),
    )
    .orderBy(desc(counselingRecords.createdAt));
}

export async function findUnlinkedRecords(
  userId: string,
): Promise<CounselingRecordRow[]> {
  const db = getDb();
  return db
    .select()
    .from(counselingRecords)
    .where(
      and(
        isNull(counselingRecords.spaceId),
        eq(counselingRecords.createdByUserId, userId),
      ),
    )
    .orderBy(desc(counselingRecords.createdAt));
}

export async function findRecordsByMemberId(
  userId: string,
  memberId: string,
): Promise<CounselingRecordRow[]> {
  const db = getDb();
  return db
    .select()
    .from(counselingRecords)
    .where(
      and(
        eq(counselingRecords.memberId, memberId),
        eq(counselingRecords.createdByUserId, userId),
      ),
    )
    .orderBy(asc(counselingRecords.createdAt));
}

export async function findOwnedRecord(userId: string, recordId: string) {
  const db = getDb();
  const [record] = await db
    .select()
    .from(counselingRecords)
    .where(
      and(
        eq(counselingRecords.id, recordId),
        eq(counselingRecords.createdByUserId, userId),
      ),
    )
    .limit(1);

  if (!record) {
    throw new ServiceError(404, "상담 기록을 찾지 못했습니다.");
  }

  return record;
}

export async function findTranscriptSegments(recordId: string) {
  const db = getDb();

  return db
    .select()
    .from(counselingTranscriptSegments)
    .where(eq(counselingTranscriptSegments.recordId, recordId))
    .orderBy(asc(counselingTranscriptSegments.segmentIndex));
}

export function parseSingleAudioRange(
  rangeHeader: string | null | undefined,
  totalByteSize: number,
) {
  const trimmed = rangeHeader?.trim();

  if (!trimmed) {
    return null;
  }

  const matched = trimmed.match(/^bytes=(.+)$/i);

  if (!matched) {
    throw new ServiceError(416, "지원하지 않는 오디오 범위 요청입니다.");
  }

  const firstRange = matched[1].split(",")[0]?.trim();

  if (!firstRange) {
    throw new ServiceError(416, "오디오 범위 요청 형식이 올바르지 않습니다.");
  }

  const [rawStart, rawEnd] = firstRange.split("-");

  if (rawStart === undefined || rawEnd === undefined) {
    throw new ServiceError(416, "오디오 범위 요청 형식이 올바르지 않습니다.");
  }

  let start: number;
  let end: number;

  if (!rawStart) {
    const suffixLength = Number(rawEnd);

    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      throw new ServiceError(416, "오디오 범위 요청 형식이 올바르지 않습니다.");
    }

    start = Math.max(totalByteSize - Math.floor(suffixLength), 0);
    end = totalByteSize - 1;
  } else {
    start = Number(rawStart);

    if (!Number.isFinite(start) || start < 0) {
      throw new ServiceError(416, "오디오 범위 시작 값이 올바르지 않습니다.");
    }

    end = rawEnd ? Number(rawEnd) : totalByteSize - 1;

    if (!Number.isFinite(end) || end < start) {
      throw new ServiceError(416, "오디오 범위 종료 값이 올바르지 않습니다.");
    }
  }

  if (start >= totalByteSize) {
    throw new ServiceError(416, "오디오 범위가 파일 크기를 벗어났습니다.");
  }

  return {
    start,
    end: Math.min(end, totalByteSize - 1),
  };
}

export async function rebuildTranscriptText(
  recordId: string,
  tx?: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
) {
  const conn = tx ?? getDb();
  const segments = await conn
    .select()
    .from(counselingTranscriptSegments)
    .where(eq(counselingTranscriptSegments.recordId, recordId))
    .orderBy(asc(counselingTranscriptSegments.segmentIndex));
  const fullText = segments.map((s) => s.text).join("\n");

  await conn
    .update(counselingRecords)
    .set({
      transcriptText: fullText,
      updatedAt: new Date(),
    })
    .where(eq(counselingRecords.id, recordId));
}
