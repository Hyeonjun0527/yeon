import type { CounselingRecordSpeakerTone } from "@yeon/api-contract/counseling-records";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { ServiceError } from "./service-error";
import { downloadCounselingAudioObject } from "./counseling-record-audio-storage";

const execFileAsync = promisify(execFile);

const MAX_OPENAI_TRANSCRIPTION_BYTES = 24 * 1024 * 1024;
const MAX_TRANSCRIPTION_CHUNK_DURATION_SECONDS = 8 * 60;
const MAX_DIARIZE_CHUNK_DURATION_SECONDS = 30;
const DEFAULT_TRANSCRIPTION_MODEL =
  process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || "gpt-4o-transcribe-diarize";
const DEFAULT_TRANSCRIPTION_FALLBACK_MODELS = (
  process.env.OPENAI_TRANSCRIPTION_FALLBACK_MODELS?.trim() ||
  "gpt-4o-transcribe"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const COUNSELING_TRANSCRIPTION_PROMPT =
  "한국어 교육 상담 녹취를 정확히 전사하세요. 학생, 교사, 보호자 발화를 최대한 원문 그대로 보존하고 과목명, 결석, 지각, 과제, 시험, 제출, 보호자 요청, 상담 일정 같은 표현을 왜곡하지 마세요.";

export type PersistedTranscriptSegment = {
  id: string;
  segmentIndex: number;
  startMs: number | null;
  endMs: number | null;
  speakerLabel: string;
  speakerTone: CounselingRecordSpeakerTone;
  text: string;
};

export type TranscriptionResult = {
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
    path.extname(params.originalName) ||
    guessExtensionFromMimeType(params.mimeType);
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
  formData.append(
    "response_format",
    usesDiarization ? "diarized_json" : "json",
  );
  formData.append("temperature", "0");

  if (!usesDiarization) {
    formData.append("prompt", COUNSELING_TRANSCRIPTION_PROMPT);
  }

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
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
    },
  );

  if (response.ok) {
    return {
      data: (await response.json()) as OpenAiTranscriptionResponse,
      model: params.model,
    };
  }

  const message =
    (await extractOpenAiErrorMessage(response)) ??
    "STT 제공자가 전사 요청을 처리하지 못했습니다.";

  throw new ServiceError(
    response.status >= 500 ? 502 : response.status,
    message,
  );
}

export async function transcribeStoredAudio(params: {
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
