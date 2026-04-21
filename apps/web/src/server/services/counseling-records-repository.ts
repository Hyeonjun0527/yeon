import type {
  CounselingChatMessage,
  CounselingRecordAnalysisStatus,
  CounselingRecordDetail,
  CounselingRecordListItem,
  CounselingRecordProcessingStage,
  CounselingRecordSource,
  CounselingTranscriptSegment,
} from "@yeon/api-contract/counseling-records";
import {
  analysisResultSchema,
  counselingChatMessageSchema,
} from "@yeon/api-contract/counseling-records";
import { and, asc, desc, eq, inArray, isNull, lt, lte, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import path from "node:path";

import { getDb } from "@/server/db";
import {
  counselingRecords,
  counselingTranscriptSegments,
  members,
  spaces,
} from "@/server/db/schema";

import { ServiceError } from "./service-error";
import { uploadCounselingAudioObject } from "./counseling-record-audio-storage";

export const MAX_AUDIO_UPLOAD_BYTES = 128 * 1024 * 1024;
const DEFAULT_COUNSELING_TYPE = "대면 상담";
export const COUNSELING_RECORD_SOURCE = {
  AUDIO_UPLOAD: "audio_upload",
  TEXT_MEMO: "text_memo",
  DEMO_PLACEHOLDER: "demo_placeholder",
} as const;
export const DEMO_PLACEHOLDER_AUDIO_STORAGE_PREFIXES = [
  "local://demo/",
] as const;
export const TEXT_MEMO_AUDIO_STORAGE_PREFIX = "text_memo://";
export const PLACEHOLDER_AUDIO_STORAGE_PREFIXES =
  DEMO_PLACEHOLDER_AUDIO_STORAGE_PREFIXES;
const VALID_RECORD_SOURCES = new Set<CounselingRecordSource>(
  Object.values(COUNSELING_RECORD_SOURCE),
);

export type CounselingRecordRow = typeof counselingRecords.$inferSelect;
type CounselingTranscriptSegmentRow =
  typeof counselingTranscriptSegments.$inferSelect;

/**
 * 외부 노출용 row. spaceId/memberId는 FK publicId(string)로 해석된 뒤 담긴다.
 * DB 내부 bigint id는 `internalId` 필드로만 보존한다.
 */
export type CounselingRecordListRow = Pick<
  CounselingRecordRow,
  | "createdByUserId"
  | "studentName"
  | "sessionTitle"
  | "counselingType"
  | "counselorName"
  | "status"
  | "recordSource"
  | "audioOriginalName"
  | "audioMimeType"
  | "audioByteSize"
  | "audioDurationMs"
  | "audioStoragePath"
  | "transcriptText"
  | "transcriptSegmentCount"
  | "processingStage"
  | "processingProgress"
  | "processingMessage"
  | "processingChunkCount"
  | "processingChunkCompletedCount"
  | "transcriptionAttemptCount"
  | "analysisStatus"
  | "analysisProgress"
  | "analysisErrorMessage"
  | "analysisAttemptCount"
  | "errorMessage"
  | "language"
  | "sttModel"
  | "createdAt"
  | "updatedAt"
  | "transcriptionCompletedAt"
  | "analysisCompletedAt"
> & {
  id: string;
  internalId: bigint;
  spaceId: string | null;
  memberId: string | null;
};

export type MemberRiskRecordRow = {
  memberId: string | null;
  analysisResult: unknown;
  recordSource: string;
  audioStoragePath: string;
  createdAt: Date;
};

export type CounselingRecordListQueryOptions = {
  limit?: number;
  beforeCreatedAt?: Date;
};

export type StudentSummaryRow = {
  studentName: string;
  recordCount: number;
  firstCounselingAt: Date;
  lastCounselingAt: Date;
};

export type CounselingRecordDetailSource = {
  record: CounselingRecordRow;
  segments: CounselingTranscriptSegmentRow[];
};

const counselingRecordListSelection = {
  id: counselingRecords.publicId,
  internalId: counselingRecords.id,
  createdByUserId: counselingRecords.createdByUserId,
  studentName: counselingRecords.studentName,
  sessionTitle: counselingRecords.sessionTitle,
  counselingType: counselingRecords.counselingType,
  counselorName: counselingRecords.counselorName,
  status: counselingRecords.status,
  recordSource: counselingRecords.recordSource,
  audioOriginalName: counselingRecords.audioOriginalName,
  audioMimeType: counselingRecords.audioMimeType,
  audioByteSize: counselingRecords.audioByteSize,
  audioDurationMs: counselingRecords.audioDurationMs,
  audioStoragePath: counselingRecords.audioStoragePath,
  transcriptText: counselingRecords.transcriptText,
  transcriptSegmentCount: counselingRecords.transcriptSegmentCount,
  processingStage: counselingRecords.processingStage,
  processingProgress: counselingRecords.processingProgress,
  processingMessage: counselingRecords.processingMessage,
  processingChunkCount: counselingRecords.processingChunkCount,
  processingChunkCompletedCount:
    counselingRecords.processingChunkCompletedCount,
  transcriptionAttemptCount: counselingRecords.transcriptionAttemptCount,
  analysisStatus: counselingRecords.analysisStatus,
  analysisProgress: counselingRecords.analysisProgress,
  analysisErrorMessage: counselingRecords.analysisErrorMessage,
  analysisAttemptCount: counselingRecords.analysisAttemptCount,
  spaceId: spaces.publicId,
  memberId: members.publicId,
  errorMessage: counselingRecords.errorMessage,
  language: counselingRecords.language,
  sttModel: counselingRecords.sttModel,
  createdAt: counselingRecords.createdAt,
  updatedAt: counselingRecords.updatedAt,
  transcriptionCompletedAt: counselingRecords.transcriptionCompletedAt,
  analysisCompletedAt: counselingRecords.analysisCompletedAt,
} as const;

async function executeRecordListQuery(params: {
  filters: ReturnType<typeof and>;
  order: "asc" | "desc";
  options?: CounselingRecordListQueryOptions;
}): Promise<CounselingRecordListRow[]> {
  const db = getDb();
  const query = db
    .select(counselingRecordListSelection)
    .from(counselingRecords)
    .leftJoin(spaces, eq(spaces.id, counselingRecords.spaceId))
    .leftJoin(members, eq(members.id, counselingRecords.memberId))
    .where(params.filters)
    .orderBy(
      params.order === "asc"
        ? asc(counselingRecords.createdAt)
        : desc(counselingRecords.createdAt),
    );

  if (params.options?.limit) {
    return query.limit(params.options.limit);
  }

  return query;
}

const VALID_STATUSES = new Set<CounselingRecordListItem["status"]>([
  "processing",
  "ready",
  "error",
]);

const VALID_PROCESSING_STAGES = new Set<CounselingRecordProcessingStage>([
  "queued",
  "downloading",
  "chunking",
  "transcribing",
  "partial_transcript_ready",
  "resolving_speakers",
  "transcript_ready",
  "analyzing",
  "completed",
  "error",
]);

const VALID_ANALYSIS_STATUSES = new Set<CounselingRecordAnalysisStatus>([
  "idle",
  "queued",
  "processing",
  "ready",
  "error",
]);

const VALID_SPEAKER_TONES = new Set<CounselingTranscriptSegment["speakerTone"]>(
  ["teacher", "student", "unknown"],
);

const counselingChatMessagesSchema = counselingChatMessageSchema.array();

function toRecordStatus(raw: string): CounselingRecordListItem["status"] {
  if (VALID_STATUSES.has(raw as CounselingRecordListItem["status"])) {
    return raw as CounselingRecordListItem["status"];
  }

  return "error";
}

function toProcessingStage(raw: string): CounselingRecordProcessingStage {
  if (VALID_PROCESSING_STAGES.has(raw as CounselingRecordProcessingStage)) {
    return raw as CounselingRecordProcessingStage;
  }

  return "error";
}

function toAnalysisStatus(raw: string): CounselingRecordAnalysisStatus {
  if (VALID_ANALYSIS_STATUSES.has(raw as CounselingRecordAnalysisStatus)) {
    return raw as CounselingRecordAnalysisStatus;
  }

  return "idle";
}

function clampProgress(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
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

export function inferCounselingRecordSourceFromStoragePath(
  storagePath: string,
): CounselingRecordSource {
  if (
    DEMO_PLACEHOLDER_AUDIO_STORAGE_PREFIXES.some((prefix) =>
      storagePath.startsWith(prefix),
    )
  ) {
    return COUNSELING_RECORD_SOURCE.DEMO_PLACEHOLDER;
  }

  if (storagePath.startsWith(TEXT_MEMO_AUDIO_STORAGE_PREFIX)) {
    return COUNSELING_RECORD_SOURCE.TEXT_MEMO;
  }

  return COUNSELING_RECORD_SOURCE.AUDIO_UPLOAD;
}

export function getCounselingRecordSource(record: {
  recordSource?: string | null;
  audioStoragePath: string;
}): CounselingRecordSource {
  if (
    record.recordSource &&
    VALID_RECORD_SOURCES.has(record.recordSource as CounselingRecordSource)
  ) {
    return record.recordSource as CounselingRecordSource;
  }

  return inferCounselingRecordSourceFromStoragePath(record.audioStoragePath);
}

export function isPlaceholderAudioStoragePath(storagePath: string) {
  return (
    inferCounselingRecordSourceFromStoragePath(storagePath) ===
    COUNSELING_RECORD_SOURCE.DEMO_PLACEHOLDER
  );
}

export function isDemoPlaceholderRecord(record: {
  recordSource?: string | null;
  audioStoragePath: string;
}) {
  return (
    getCounselingRecordSource(record) ===
    COUNSELING_RECORD_SOURCE.DEMO_PLACEHOLDER
  );
}

export function isTextMemoRecord(record: {
  recordSource?: string | null;
  audioStoragePath: string;
}) {
  return (
    getCounselingRecordSource(record) === COUNSELING_RECORD_SOURCE.TEXT_MEMO
  );
}

export function hasPlayableAudio(record: {
  recordSource?: string | null;
  audioStoragePath: string;
}) {
  return (
    getCounselingRecordSource(record) === COUNSELING_RECORD_SOURCE.AUDIO_UPLOAD
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
  recordPublicId: string,
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
    recordPublicId,
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

function buildPreviewText(
  record: Pick<
    CounselingRecordListRow,
    "status" | "errorMessage" | "transcriptText"
  >,
) {
  if (record.status === "error") {
    return record.errorMessage ?? "전사 처리 중 오류가 발생했습니다.";
  }

  if (record.transcriptText.trim()) {
    return record.transcriptText.trim().slice(0, 96);
  }

  return "원문 전사를 준비 중입니다.";
}

function buildRecordTags(
  record: Pick<CounselingRecordListRow, "counselingType">,
) {
  return [record.counselingType].filter((value): value is string =>
    Boolean(value),
  );
}

export function mapRecordListItem(
  record: CounselingRecordListRow,
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
    recordSource: getCounselingRecordSource(record),
    preview: buildPreviewText(record),
    tags: buildRecordTags(record),
    audioOriginalName: record.audioOriginalName,
    audioMimeType: record.audioMimeType,
    audioByteSize: record.audioByteSize,
    audioDurationMs: record.audioDurationMs,
    transcriptSegmentCount: record.transcriptSegmentCount,
    transcriptTextLength: record.transcriptText.length,
    processingStage: toProcessingStage(record.processingStage),
    processingProgress: clampProgress(record.processingProgress),
    processingMessage: record.processingMessage,
    processingChunkCount: Math.max(record.processingChunkCount ?? 0, 0),
    processingChunkCompletedCount: Math.max(
      record.processingChunkCompletedCount ?? 0,
      0,
    ),
    transcriptionAttemptCount: Math.max(
      record.transcriptionAttemptCount ?? 0,
      0,
    ),
    analysisStatus: toAnalysisStatus(record.analysisStatus),
    analysisProgress: clampProgress(record.analysisProgress),
    analysisErrorMessage: record.analysisErrorMessage,
    analysisAttemptCount: Math.max(record.analysisAttemptCount ?? 0, 0),
    language: record.language,
    sttModel: record.sttModel,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    transcriptionCompletedAt: record.transcriptionCompletedAt
      ? record.transcriptionCompletedAt.toISOString()
      : null,
    analysisCompletedAt: record.analysisCompletedAt
      ? record.analysisCompletedAt.toISOString()
      : null,
  };
}

export function mapSegmentRow(
  segment: CounselingTranscriptSegmentRow,
): CounselingTranscriptSegment {
  return {
    id: segment.publicId,
    segmentIndex: segment.segmentIndex,
    startMs: segment.startMs,
    endMs: segment.endMs,
    speakerLabel: segment.speakerLabel,
    speakerTone: toSpeakerTone(segment.speakerTone),
    text: segment.text,
  };
}

/**
 * DetailSource를 외부 DTO로 변환한다.
 * - record는 CounselingRecordListRow 형태(id = publicId, spaceId/memberId = publicId)로 미리 매핑돼 있어야 한다.
 */
export function mapRecordDetail(
  record: CounselingRecordListRow & {
    analysisResult: unknown;
    assistantMessages: unknown;
  },
  segments: CounselingTranscriptSegmentRow[],
): CounselingRecordDetail {
  return {
    ...mapRecordListItem(record),
    transcriptText: record.transcriptText,
    transcriptSegments: segments.map(mapSegmentRow),
    audioUrl: hasPlayableAudio(record)
      ? `/api/v1/counseling-records/${record.id}/audio`
      : null,
    analysisResult: (() => {
      const parsed = analysisResultSchema.safeParse(record.analysisResult);
      return parsed.success ? parsed.data : null;
    })(),
    assistantMessages: parseCounselingChatMessages(record.assistantMessages),
  };
}

export function parseCounselingChatMessages(
  value: unknown,
): CounselingChatMessage[] {
  const parsed = counselingChatMessagesSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

// ── DB 쿼리 ──

/**
 * publicId → 내부 bigint id 해석. 존재하지 않으면 null.
 */
export async function resolveRecordInternalIdByPublicId(
  recordPublicId: string,
): Promise<bigint | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: counselingRecords.id })
    .from(counselingRecords)
    .where(eq(counselingRecords.publicId, recordPublicId))
    .limit(1);
  return row?.id ?? null;
}

async function resolveSpaceInternalIdByPublicId(
  spacePublicId: string,
): Promise<bigint | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.publicId, spacePublicId))
    .limit(1);
  return row?.id ?? null;
}

async function resolveMemberInternalIdByPublicId(
  memberPublicId: string,
): Promise<bigint | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.publicId, memberPublicId))
    .limit(1);
  return row?.id ?? null;
}

export async function linkRecordToMember(
  recordPublicId: string,
  memberPublicId: string | null,
  spacePublicId: string | null,
) {
  const db = getDb();
  const memberInternalId = memberPublicId
    ? await resolveMemberInternalIdByPublicId(memberPublicId)
    : null;
  const spaceInternalId = spacePublicId
    ? await resolveSpaceInternalIdByPublicId(spacePublicId)
    : null;

  await db
    .update(counselingRecords)
    .set({
      memberId: memberInternalId,
      spaceId: spaceInternalId,
      updatedAt: new Date(),
    })
    .where(eq(counselingRecords.publicId, recordPublicId));
}

export async function replaceAssistantMessages(
  recordPublicId: string,
  assistantMessages: CounselingChatMessage[],
) {
  const db = getDb();
  await db
    .update(counselingRecords)
    .set({ assistantMessages, updatedAt: new Date() })
    .where(eq(counselingRecords.publicId, recordPublicId));
}

export async function findRecordsBySpaceId(
  userId: string,
  spacePublicId: string,
  options?: CounselingRecordListQueryOptions,
): Promise<CounselingRecordListRow[]> {
  const spaceInternalId = await resolveSpaceInternalIdByPublicId(spacePublicId);
  if (spaceInternalId === null) {
    return [];
  }

  return executeRecordListQuery({
    filters: and(
      eq(counselingRecords.spaceId, spaceInternalId),
      eq(counselingRecords.createdByUserId, userId),
      ...(options?.beforeCreatedAt
        ? [lt(counselingRecords.createdAt, options.beforeCreatedAt)]
        : []),
    ),
    order: "desc",
    options,
  });
}

export async function findRecordsByUserId(
  userId: string,
  options?: CounselingRecordListQueryOptions,
): Promise<CounselingRecordListRow[]> {
  return executeRecordListQuery({
    filters: and(
      eq(counselingRecords.createdByUserId, userId),
      ...(options?.beforeCreatedAt
        ? [lt(counselingRecords.createdAt, options.beforeCreatedAt)]
        : []),
    ),
    order: "desc",
    options,
  });
}

export async function findUnlinkedRecords(
  userId: string,
  options?: CounselingRecordListQueryOptions,
): Promise<CounselingRecordListRow[]> {
  return executeRecordListQuery({
    filters: and(
      isNull(counselingRecords.spaceId),
      eq(counselingRecords.createdByUserId, userId),
      ...(options?.beforeCreatedAt
        ? [lt(counselingRecords.createdAt, options.beforeCreatedAt)]
        : []),
    ),
    order: "desc",
    options,
  });
}

export async function findRecordsByMemberId(
  userId: string,
  memberPublicId: string,
  options?: CounselingRecordListQueryOptions,
): Promise<CounselingRecordListRow[]> {
  const memberInternalId =
    await resolveMemberInternalIdByPublicId(memberPublicId);
  if (memberInternalId === null) {
    return [];
  }

  return executeRecordListQuery({
    filters: and(
      eq(counselingRecords.memberId, memberInternalId),
      eq(counselingRecords.createdByUserId, userId),
      ...(options?.beforeCreatedAt
        ? [lt(counselingRecords.createdAt, options.beforeCreatedAt)]
        : []),
    ),
    order: "asc",
    options,
  });
}

export async function findOwnedRecordsByIds(
  userId: string,
  recordPublicIds: string[],
): Promise<CounselingRecordRow[]> {
  if (recordPublicIds.length === 0) {
    return [];
  }

  const db = getDb();

  return db
    .select()
    .from(counselingRecords)
    .where(
      and(
        eq(counselingRecords.createdByUserId, userId),
        inArray(counselingRecords.publicId, recordPublicIds),
      ),
    );
}

export async function findTranscriptSegmentsByRecordIds(
  recordInternalIds: bigint[],
) {
  if (recordInternalIds.length === 0) {
    return [];
  }

  const db = getDb();

  return db
    .select()
    .from(counselingTranscriptSegments)
    .where(inArray(counselingTranscriptSegments.recordId, recordInternalIds))
    .orderBy(
      asc(counselingTranscriptSegments.recordId),
      asc(counselingTranscriptSegments.segmentIndex),
    );
}

export async function findOwnedRecordDetailSource(
  userId: string,
  recordPublicId: string,
): Promise<CounselingRecordDetailSource> {
  const record = await findOwnedRecord(userId, recordPublicId);
  const segments = await findTranscriptSegments(record.id);

  return { record, segments };
}

export async function findOwnedRecordDetailSourcesByIds(
  userId: string,
  recordPublicIds: string[],
): Promise<CounselingRecordDetailSource[]> {
  if (recordPublicIds.length === 0) {
    return [];
  }

  const records = await findOwnedRecordsByIds(userId, recordPublicIds);
  const segments = await findTranscriptSegmentsByRecordIds(
    records.map((record) => record.id),
  );
  const segmentsByRecordId = new Map<string, typeof segments>();

  for (const segment of segments) {
    const key = segment.recordId.toString();
    const group = segmentsByRecordId.get(key);

    if (group) {
      group.push(segment);
    } else {
      segmentsByRecordId.set(key, [segment]);
    }
  }

  return records.map((record) => ({
    record,
    segments: segmentsByRecordId.get(record.id.toString()) ?? [],
  }));
}

export async function findRiskRecordsByMemberIds(
  userId: string,
  memberPublicIds: string[],
): Promise<MemberRiskRecordRow[]> {
  if (memberPublicIds.length === 0) {
    return [];
  }

  const db = getDb();

  const memberRows = await db
    .select({ id: members.id, publicId: members.publicId })
    .from(members)
    .where(inArray(members.publicId, memberPublicIds));

  if (memberRows.length === 0) {
    return [];
  }

  const memberInternalIds = memberRows.map((row) => row.id);
  const publicIdByInternalId = new Map(
    memberRows.map((row) => [row.id.toString(), row.publicId]),
  );

  const rankedRiskRecords = db
    .select({
      memberId: counselingRecords.memberId,
      analysisResult: counselingRecords.analysisResult,
      recordSource: counselingRecords.recordSource,
      audioStoragePath: counselingRecords.audioStoragePath,
      createdAt: counselingRecords.createdAt,
      rowNumber:
        sql<number>`row_number() over (partition by ${counselingRecords.memberId} order by ${counselingRecords.createdAt} desc)`.as(
          "row_number",
        ),
    })
    .from(counselingRecords)
    .where(
      and(
        eq(counselingRecords.createdByUserId, userId),
        inArray(counselingRecords.memberId, memberInternalIds),
      ),
    )
    .as("ranked_risk_records");

  const rows = await db
    .select({
      memberId: rankedRiskRecords.memberId,
      analysisResult: rankedRiskRecords.analysisResult,
      recordSource: rankedRiskRecords.recordSource,
      audioStoragePath: rankedRiskRecords.audioStoragePath,
      createdAt: rankedRiskRecords.createdAt,
    })
    .from(rankedRiskRecords)
    .where(lte(rankedRiskRecords.rowNumber, 5));

  return rows.map((row) => ({
    memberId: row.memberId
      ? (publicIdByInternalId.get(row.memberId.toString()) ?? null)
      : null,
    analysisResult: row.analysisResult,
    recordSource: row.recordSource,
    audioStoragePath: row.audioStoragePath,
    createdAt: row.createdAt,
  }));
}

export async function summarizeStudentsByName(
  userId: string,
): Promise<StudentSummaryRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      studentName: counselingRecords.studentName,
      recordCount: sql<number>`count(*)::int`,
      firstCounselingAt: sql<Date>`min(${counselingRecords.createdAt})`,
      lastCounselingAt: sql<Date>`max(${counselingRecords.createdAt})`,
    })
    .from(counselingRecords)
    .where(
      and(
        eq(counselingRecords.createdByUserId, userId),
        sql`${counselingRecords.recordSource} <> 'demo_placeholder'`,
      ),
    )
    .groupBy(counselingRecords.studentName)
    .orderBy(sql`max(${counselingRecords.createdAt}) desc`);

  return rows.map((row) => ({
    studentName: row.studentName,
    recordCount: Number(row.recordCount),
    firstCounselingAt: row.firstCounselingAt,
    lastCounselingAt: row.lastCounselingAt,
  }));
}

export async function findOwnedRecord(userId: string, recordPublicId: string) {
  const db = getDb();
  const [record] = await db
    .select()
    .from(counselingRecords)
    .where(
      and(
        eq(counselingRecords.publicId, recordPublicId),
        eq(counselingRecords.createdByUserId, userId),
      ),
    )
    .limit(1);

  if (!record) {
    throw new ServiceError(404, "상담 기록을 찾지 못했습니다.");
  }

  return record;
}

export async function findTranscriptSegments(recordInternalId: bigint) {
  const db = getDb();

  return db
    .select()
    .from(counselingTranscriptSegments)
    .where(eq(counselingTranscriptSegments.recordId, recordInternalId))
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
  recordInternalId: bigint,
  tx?: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
) {
  const conn = tx ?? getDb();
  const segments = await conn
    .select()
    .from(counselingTranscriptSegments)
    .where(eq(counselingTranscriptSegments.recordId, recordInternalId))
    .orderBy(asc(counselingTranscriptSegments.segmentIndex));
  const fullText = segments.map((s) => s.text).join("\n");

  await conn
    .update(counselingRecords)
    .set({
      transcriptText: fullText,
      updatedAt: new Date(),
    })
    .where(eq(counselingRecords.id, recordInternalId));
}
