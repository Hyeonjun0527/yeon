import type {
  AuthUserDto,
  CounselingRecordDetail,
  CounselingRecordListItem,
  CounselingRecordSpeakerTone,
  CounselingTranscriptSegment,
  StudentSummary,
} from "@yeon/api-contract";
import { and, asc, desc, eq } from "drizzle-orm";
import { randomUUID, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { getDb } from "@/server/db";
import {
  counselingRecords,
  counselingTranscriptSegments,
} from "@/server/db/schema";

import { ServiceError } from "./service-error";
import {
  deleteCounselingAudioObject,
  downloadCounselingAudioObject,
  openCounselingAudioObjectStream,
  uploadCounselingAudioObject,
} from "./counseling-record-audio-storage";

const execFileAsync = promisify(execFile);

const MAX_AUDIO_UPLOAD_BYTES = 128 * 1024 * 1024;
const MAX_OPENAI_TRANSCRIPTION_BYTES = 24 * 1024 * 1024;
const MAX_TRANSCRIPTION_CHUNK_DURATION_SECONDS = 8 * 60;
const MAX_DIARIZE_CHUNK_DURATION_SECONDS = 30;
const DEFAULT_COUNSELING_TYPE = "대면 상담";
const PLACEHOLDER_AUDIO_STORAGE_PREFIXES = ["local://demo/"] as const;
const DEFAULT_TRANSCRIPTION_MODEL =
  process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() ||
  "gpt-4o-transcribe-diarize";
const DEFAULT_TRANSCRIPTION_FALLBACK_MODELS = (
  process.env.OPENAI_TRANSCRIPTION_FALLBACK_MODELS?.trim() ||
  "gpt-4o-transcribe"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const COUNSELING_TRANSCRIPTION_PROMPT =
  "한국어 교육 상담 녹취를 정확히 전사하세요. 학생, 교사, 보호자 발화를 최대한 원문 그대로 보존하고 과목명, 결석, 지각, 과제, 시험, 제출, 보호자 요청, 상담 일정 같은 표현을 왜곡하지 마세요.";

const scheduledTranscriptionJobs = new Map<string, Promise<void>>();

type CounselingRecordRow = typeof counselingRecords.$inferSelect;
type CounselingTranscriptSegmentRow =
  typeof counselingTranscriptSegments.$inferSelect;

type CreateCounselingRecordInput = {
  currentUser: AuthUserDto;
  studentName: string;
  sessionTitle: string;
  counselingType: string | null;
  audioDurationMs: number | null;
  file: File;
  clientRequestId?: string | null;
};

type PersistedAudio = {
  storagePath: string;
  sha256: string;
  byteSize: number;
  originalName: string;
  mimeType: string;
};

type PersistedTranscriptSegment = {
  id: string;
  segmentIndex: number;
  startMs: number | null;
  endMs: number | null;
  speakerLabel: string;
  speakerTone: CounselingRecordSpeakerTone;
  text: string;
};

type TranscriptionResult = {
  transcriptText: string;
  language: string | null;
  segments: PersistedTranscriptSegment[];
  durationMs: number | null;
  model: string;
};

type TranscriptionSource = {
  absolutePath: string;
  originalName: string;
  mimeType: string;
  offsetMs: number;
};

type OpenAiTranscriptionSegment = {
  id?: number;
  start?: number;
  end?: number;
  text?: string;
  speaker?: string;
  speaker_label?: string;
};

type OpenAiTranscriptionResponse = {
  text?: string;
  language?: string;
  duration?: number;
  segments?: OpenAiTranscriptionSegment[];
};

type OpenAiTranscriptionSuccess = {
  data: OpenAiTranscriptionResponse;
  model: string;
};

function getLocalWorkDir() {
  const configured =
    process.env.COUNSELING_RECORDS_WORK_DIR?.trim() ||
    process.env.COUNSELING_RECORDS_STORAGE_DIR?.trim();

  if (configured) {
    return path.resolve(/* turbopackIgnore: true */ configured);
  }

  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    ".data",
    "counseling-records-work",
  );
}

function sanitizeSingleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isPlaceholderAudioStoragePath(storagePath: string) {
  return PLACEHOLDER_AUDIO_STORAGE_PREFIXES.some((prefix) =>
    storagePath.startsWith(prefix),
  );
}

function sanitizeOptionalValue(
  value: string | null | undefined,
  maxLength: number,
) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return sanitizeSingleLine(trimmed).slice(0, maxLength);
}

function sanitizeRequiredValue(
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

function sanitizeFileStem(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "recording";
}

function getTranscriptionModelCandidates() {
  return [
    DEFAULT_TRANSCRIPTION_MODEL,
    ...DEFAULT_TRANSCRIPTION_FALLBACK_MODELS,
  ].filter((value, index, array) => array.indexOf(value) === index);
}

function isDiarizationModel(model: string) {
  return model.toLowerCase().includes("diarize");
}

function getPreferredTranscriptionChunkDurationSeconds() {
  return getTranscriptionModelCandidates().some(isDiarizationModel)
    ? Math.min(
        MAX_TRANSCRIPTION_CHUNK_DURATION_SECONDS,
        MAX_DIARIZE_CHUNK_DURATION_SECONDS,
      )
    : MAX_TRANSCRIPTION_CHUNK_DURATION_SECONDS;
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

async function persistAudioFile(
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

function shouldChunkTranscription(
  byteSize: number,
  durationMs: number | null | undefined,
) {
  if (byteSize > MAX_OPENAI_TRANSCRIPTION_BYTES) {
    return true;
  }

  return (
    typeof durationMs === "number" &&
    durationMs > getPreferredTranscriptionChunkDurationSeconds() * 1000
  );
}

async function runFfmpeg(args: string[]) {
  try {
    await execFileAsync("ffmpeg", args);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ffmpeg 실행 중 알 수 없는 오류가 발생했습니다.";

    throw new ServiceError(
      500,
      `긴 음성 파일을 분할 전사하지 못했습니다. ffmpeg 상태를 확인해 주세요. (${message})`,
    );
  }
}

async function buildTranscriptionSources(params: {
  recordId: string;
  storagePath: string;
  mimeType: string;
  originalName: string;
  byteSize: number;
  durationMs: number | null;
}) {
  const chunkDurationSeconds = getPreferredTranscriptionChunkDurationSeconds();
  const sourceDirectory = path.join(
    /* turbopackIgnore: true */ getLocalWorkDir(),
    "_transcription-source",
    params.recordId,
    randomUUID(),
  );
  const sourceExtension =
    path.extname(params.originalName) || guessExtensionFromMimeType(params.mimeType);
  const sourcePath = path.join(sourceDirectory, `source${sourceExtension}`);
  const sourceAudio = await downloadCounselingAudioObject(params.storagePath);

  await mkdir(sourceDirectory, { recursive: true });
  await writeFile(sourcePath, sourceAudio.bytes);

  if (!shouldChunkTranscription(params.byteSize, params.durationMs)) {
    return {
      sources: [
        {
          absolutePath: sourcePath,
          originalName: params.originalName,
          mimeType: params.mimeType,
          offsetMs: 0,
        },
      ] satisfies TranscriptionSource[],
      cleanup: async () => {
        await rm(sourceDirectory, { force: true, recursive: true });
      },
    };
  }

  const chunkDirectory = path.join(
    /* turbopackIgnore: true */ getLocalWorkDir(),
    "_transcription-chunks",
    params.recordId,
    randomUUID(),
  );
  const chunkPattern = path.join(chunkDirectory, "chunk-%03d.mp3");

  await mkdir(chunkDirectory, { recursive: true });
  await runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    sourcePath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "64k",
    "-f",
    "segment",
    "-segment_time",
    String(chunkDurationSeconds),
    "-reset_timestamps",
    "1",
    chunkPattern,
  ]);

  const chunkFiles = (await readdir(chunkDirectory))
    .filter((fileName) => fileName.endsWith(".mp3"))
    .sort((left, right) => left.localeCompare(right));

  if (chunkFiles.length === 0) {
    throw new ServiceError(
      500,
      "긴 상담 음성을 분할했지만 전사할 chunk 파일을 만들지 못했습니다.",
    );
  }

  return {
    sources: chunkFiles.map((fileName, index) => ({
      absolutePath: path.join(chunkDirectory, fileName),
      originalName: `${path.basename(params.originalName, path.extname(params.originalName))}-part-${String(index + 1).padStart(2, "0")}.mp3`,
      mimeType: "audio/mpeg",
      offsetMs: index * chunkDurationSeconds * 1000,
    })),
    cleanup: async () => {
      await rm(sourceDirectory, { force: true, recursive: true });
      await rm(chunkDirectory, { force: true, recursive: true });
    },
  };
}

async function extractOpenAiErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as {
      error?: { message?: string };
    };

    if (typeof data.error?.message === "string" && data.error.message.trim()) {
      return data.error.message.trim();
    }
  } catch {
    return null;
  }

  return null;
}

function mapSpeakerTone(rawSpeakerLabel: string | null | undefined) {
  const normalized = rawSpeakerLabel?.trim().toLowerCase() ?? "";

  if (
    normalized.includes("teacher") ||
    normalized.includes("교사") ||
    normalized.includes("강사")
  ) {
    return "teacher" satisfies CounselingRecordSpeakerTone;
  }

  if (
    normalized.includes("student") ||
    normalized.includes("학생") ||
    normalized.includes("수강생")
  ) {
    return "student" satisfies CounselingRecordSpeakerTone;
  }

  if (
    normalized.includes("guardian") ||
    normalized.includes("parent") ||
    normalized.includes("보호자") ||
    normalized.includes("학부모")
  ) {
    return "guardian" satisfies CounselingRecordSpeakerTone;
  }

  return "unknown" satisfies CounselingRecordSpeakerTone;
}

function formatSpeakerLabel(rawSpeakerLabel: string | null | undefined) {
  const trimmed = rawSpeakerLabel?.trim();

  if (!trimmed) {
    return "원문";
  }

  if (/speaker[_\s-]?(\d+)/i.test(trimmed)) {
    const match = trimmed.match(/speaker[_\s-]?(\d+)/i);
    const speakerIndex = match ? Number(match[1]) + 1 : null;

    return speakerIndex ? `화자 ${speakerIndex}` : "원문";
  }

  return trimmed.slice(0, 40);
}

function splitTranscriptIntoParagraphs(text: string) {
  const compact = text
    .split(/\n+/)
    .map((line) => sanitizeSingleLine(line))
    .filter(Boolean);

  if (compact.length > 0) {
    return compact;
  }

  return text
    .split(/(?<=[.!?。！？])\s+/)
    .map((line) => sanitizeSingleLine(line))
    .filter(Boolean);
}

function buildFallbackSegments(
  transcriptText: string,
  durationMs: number | null,
  offsetMs = 0,
  startingSegmentIndex = 0,
): PersistedTranscriptSegment[] {
  const paragraphs = splitTranscriptIntoParagraphs(transcriptText);
  const safeParagraphs = paragraphs.length > 0 ? paragraphs : [transcriptText];
  const estimatedChunkMs =
    durationMs && durationMs > 0
      ? Math.max(Math.floor(durationMs / safeParagraphs.length), 1)
      : null;

  return safeParagraphs.map((text, index) => {
    const startMs = estimatedChunkMs === null ? null : index * estimatedChunkMs;
    const endMs =
      estimatedChunkMs === null ? null : (index + 1) * estimatedChunkMs;

    return {
      id: randomUUID(),
      segmentIndex: startingSegmentIndex + index,
      startMs: startMs === null ? null : offsetMs + startMs,
      endMs: endMs === null ? null : offsetMs + endMs,
      speakerLabel: "원문",
      speakerTone: "unknown" satisfies CounselingRecordSpeakerTone,
      text,
    };
  });
}

function mapOpenAiSegments(
  transcriptText: string,
  durationMs: number | null,
  segments: OpenAiTranscriptionSegment[] | undefined,
  offsetMs = 0,
  startingSegmentIndex = 0,
): PersistedTranscriptSegment[] {
  const normalizedSegments: PersistedTranscriptSegment[] = [];

  for (const [index, segment] of (segments ?? []).entries()) {
    const text = sanitizeSingleLine(segment.text ?? "");

    if (!text) {
      continue;
    }

    normalizedSegments.push({
      id: randomUUID(),
      segmentIndex: startingSegmentIndex + index,
      startMs:
        typeof segment.start === "number"
          ? offsetMs + Math.max(Math.round(segment.start * 1000), 0)
          : null,
      endMs:
        typeof segment.end === "number"
          ? offsetMs + Math.max(Math.round(segment.end * 1000), 0)
          : null,
      speakerLabel: formatSpeakerLabel(
        segment.speaker_label ?? segment.speaker,
      ),
      speakerTone: mapSpeakerTone(segment.speaker_label ?? segment.speaker),
      text,
    });
  }

  if (normalizedSegments.length > 0) {
    return normalizedSegments;
  }

  return buildFallbackSegments(
    transcriptText,
    durationMs,
    offsetMs,
    startingSegmentIndex,
  );
}

async function requestOpenAiTranscription(params: {
  apiKey: string;
  source: TranscriptionSource;
  model: string;
  clientRequestId?: string | null;
}): Promise<OpenAiTranscriptionSuccess> {
  const audioBuffer = await readFile(params.source.absolutePath);
  const formData = new FormData();
  const usesDiarization = isDiarizationModel(params.model);

  formData.append(
    "file",
    new Blob([audioBuffer], { type: params.source.mimeType }),
    params.source.originalName,
  );
  formData.append("model", params.model);
  formData.append("language", "ko");
  formData.append("response_format", usesDiarization ? "diarized_json" : "json");
  formData.append("temperature", "0");

  if (!usesDiarization) {
    formData.append("prompt", COUNSELING_TRANSCRIPTION_PROMPT);
  }

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      ...(params.clientRequestId
        ? {
            "X-Client-Request-Id": params.clientRequestId,
          }
        : {}),
    },
    body: formData,
  });

  if (response.ok) {
    return {
      data: (await response.json()) as OpenAiTranscriptionResponse,
      model: params.model,
    };
  }

  const message =
    (await extractOpenAiErrorMessage(response)) ??
    "STT 제공자가 전사 요청을 처리하지 못했습니다.";

  throw new ServiceError(response.status >= 500 ? 502 : response.status, message);
}

async function transcribeStoredAudio(params: {
  recordId: string;
  storagePath: string;
  mimeType: string;
  originalName: string;
  byteSize: number;
  durationMs: number | null;
  clientRequestId?: string | null;
}): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new ServiceError(
      500,
      "OPENAI_API_KEY 환경변수가 없어 음성 전사를 시작할 수 없습니다.",
    );
  }

  const { sources, cleanup } = await buildTranscriptionSources({
    recordId: params.recordId,
    storagePath: params.storagePath,
    mimeType: params.mimeType,
    originalName: params.originalName,
    byteSize: params.byteSize,
    durationMs: params.durationMs,
  });
  const transcriptParts: string[] = [];
  const mergedSegments: PersistedTranscriptSegment[] = [];
  let mergedDurationMs = params.durationMs;
  let language: string | null = null;
  let segmentIndexOffset = 0;
  let resolvedModel: string | null = null;
  const modelCandidates = getTranscriptionModelCandidates();

  try {
    for (const [index, source] of sources.entries()) {
      let transcriptionResult: OpenAiTranscriptionSuccess | null = null;
      let lastError: ServiceError | null = null;

      for (const candidateModel of resolvedModel
        ? [resolvedModel]
        : modelCandidates) {
        try {
          transcriptionResult = await requestOpenAiTranscription({
            apiKey,
            source,
            model: candidateModel,
            clientRequestId: params.clientRequestId
              ? `${params.clientRequestId}-chunk-${index + 1}`
              : null,
          });
          break;
        } catch (error) {
          if (!(error instanceof ServiceError)) {
            throw error;
          }

          lastError = error;

          const shouldFallback =
            !resolvedModel &&
            [400, 403, 404].includes(error.status) &&
            candidateModel !== modelCandidates[modelCandidates.length - 1];

          if (!shouldFallback) {
            throw error;
          }
        }
      }

      if (!transcriptionResult) {
        throw (
          lastError ??
          new ServiceError(502, "STT 제공자가 전사 요청을 처리하지 못했습니다.")
        );
      }

      const { data, model } = transcriptionResult;
      const transcriptText = sanitizeSingleLine(data.text ?? "");
      const durationMs =
        typeof data.duration === "number" && data.duration > 0
          ? Math.round(data.duration * 1000)
          : null;

      if (!transcriptText) {
        throw new ServiceError(
          502,
          `음성 전사 결과가 비어 있습니다. chunk ${index + 1}부터 다시 확인해 주세요.`,
        );
      }

      transcriptParts.push(transcriptText);
      language = language ?? data.language?.trim() ?? "ko";
      resolvedModel = resolvedModel ?? model;

      const mappedSegments = mapOpenAiSegments(
        transcriptText,
        durationMs,
        data.segments,
        source.offsetMs,
        segmentIndexOffset,
      );

      mergedSegments.push(...mappedSegments);
      segmentIndexOffset = mergedSegments.length;

      if (durationMs !== null) {
        const candidateDurationMs = source.offsetMs + durationMs;
        mergedDurationMs =
          mergedDurationMs === null
            ? candidateDurationMs
            : Math.max(mergedDurationMs, candidateDurationMs);
      }
    }
  } finally {
    await cleanup();
  }

  return {
    transcriptText: transcriptParts.join("\n\n"),
    language: language ?? "ko",
    durationMs: mergedDurationMs,
    segments: mergedSegments,
    model:
      sources.length > 1
        ? `${resolvedModel ?? DEFAULT_TRANSCRIPTION_MODEL}+chunked`
        : (resolvedModel ?? DEFAULT_TRANSCRIPTION_MODEL),
  };
}

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
  return [
    record.counselingType,
  ].filter((value): value is string => Boolean(value));
}

function mapRecordListItem(
  record: CounselingRecordRow,
): CounselingRecordListItem {
  return {
    id: record.id,
    studentName: record.studentName,
    sessionTitle: record.sessionTitle,
    counselingType: record.counselingType,
    counselorName: record.counselorName,
    status: record.status as CounselingRecordListItem["status"],
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

function mapSegmentRow(
  segment: CounselingTranscriptSegmentRow,
): CounselingTranscriptSegment {
  return {
    id: segment.id,
    segmentIndex: segment.segmentIndex,
    startMs: segment.startMs,
    endMs: segment.endMs,
    speakerLabel: segment.speakerLabel,
    speakerTone:
      segment.speakerTone as CounselingTranscriptSegment["speakerTone"],
    text: segment.text,
  };
}

function mapRecordDetail(
  record: CounselingRecordRow,
  segments: CounselingTranscriptSegmentRow[],
): CounselingRecordDetail {
  return {
    ...mapRecordListItem(record),
    transcriptText: record.transcriptText,
    transcriptSegments: segments.map(mapSegmentRow),
    audioUrl: `/api/v1/counseling-records/${record.id}/audio`,
  };
}

async function findOwnedRecord(userId: string, recordId: string) {
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

async function findTranscriptSegments(recordId: string) {
  const db = getDb();

  return db
    .select()
    .from(counselingTranscriptSegments)
    .where(eq(counselingTranscriptSegments.recordId, recordId))
    .orderBy(asc(counselingTranscriptSegments.segmentIndex));
}

function parseSingleAudioRange(
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

// 78차: 학생별 기록 요약
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

// 78차: 추이 분석용 다중 기록 조회
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

  // 같은 학생인지 검증
  const names = new Set(results.map((r) => r.studentName));

  if (names.size > 1) {
    throw new ServiceError(400, "같은 학생의 기록만 추이 분석할 수 있습니다.");
  }

  return results;
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
  const db = getDb();

  try {
    const result = await transcribeStoredAudio({
      recordId: params.record.id,
      storagePath: params.record.audioStoragePath,
      mimeType: params.record.audioMimeType,
      originalName: params.record.audioOriginalName,
      byteSize: params.record.audioByteSize,
      durationMs: params.record.audioDurationMs,
      clientRequestId: params.clientRequestId,
    });
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(counselingRecords)
        .set({
          status: "ready",
          transcriptText: result.transcriptText,
          transcriptSegmentCount: result.segments.length,
          language: result.language,
          sttModel: result.model,
          audioDurationMs: result.durationMs ?? params.record.audioDurationMs,
          errorMessage: null,
          transcriptionCompletedAt: now,
          updatedAt: now,
        })
        .where(eq(counselingRecords.id, params.record.id));

      await tx
        .delete(counselingTranscriptSegments)
        .where(eq(counselingTranscriptSegments.recordId, params.record.id));

      if (result.segments.length > 0) {
        await tx.insert(counselingTranscriptSegments).values(
          result.segments.map((segment) => ({
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

export async function createCounselingRecordAndQueueTranscription(
  input: CreateCounselingRecordInput,
) {
  const db = getDb();
  const recordId = randomUUID();
  const studentName = sanitizeRequiredValue(input.studentName, 80, "학생 이름");
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
    contentLength: audio.contentLength ?? (
      byteRange ? byteRange.end - byteRange.start + 1 : record.audioByteSize
    ),
    contentRange:
      audio.contentRange ??
      (byteRange
        ? `bytes ${byteRange.start}-${byteRange.end}/${record.audioByteSize}`
        : null),
    status: byteRange ? 206 : 200,
  };
}

export async function deleteCounselingRecord(
  userId: string,
  recordId: string,
) {
  const record = await findOwnedRecord(userId, recordId);
  const db = getDb();

  await db
    .delete(counselingRecords)
    .where(eq(counselingRecords.id, record.id));

  if (!isPlaceholderAudioStoragePath(record.audioStoragePath)) {
    try {
      await deleteCounselingAudioObject(record.audioStoragePath);
    } catch (error) {
      console.error(
        `상담 기록 ${record.id}의 R2 음성 파일 삭제에 실패했습니다.`,
        error,
      );
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

  const updateFields: Partial<typeof counselingTranscriptSegments.$inferInsert> =
    {};

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

  const updateFields: Partial<typeof counselingTranscriptSegments.$inferInsert> =
    { speakerLabel: toSpeakerLabel };

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

async function rebuildTranscriptText(recordId: string) {
  const db = getDb();
  const segments = await findTranscriptSegments(recordId);
  const fullText = segments.map((s) => s.text).join("\n");

  await db
    .update(counselingRecords)
    .set({
      transcriptText: fullText,
      updatedAt: new Date(),
    })
    .where(eq(counselingRecords.id, recordId));
}
