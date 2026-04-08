import {
  counselingRecordSpeakerToneSchema,
  type CounselingRecordDetail,
  type CounselingRecordListItem,
} from "@yeon/api-contract/counseling-records";
import { errorResponseSchema } from "@yeon/api-contract/error";
import type { ReactNode } from "react";
import type { ApiRequestError, Message } from "./types";
import { SPEAKER_CYCLE } from "./constants";

export function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDurationLabel(value: number | null) {
  if (!value || value <= 0) {
    return "길이 미확인";
  }

  const totalSeconds = Math.max(Math.round(value / 1000), 1);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${seconds}초`;
  }

  return `${minutes}분 ${seconds}초`;
}

export function formatCompactDuration(value: number | null) {
  if (!value || value <= 0) {
    return "미확인";
  }

  const totalSeconds = Math.max(Math.round(value / 1000), 1);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatTranscriptTime(value: number | null) {
  if (value === null || value < 0) {
    return "원문";
  }

  const totalSeconds = Math.floor(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function isTranscriptSegmentActive(params: {
  currentTimeMs: number | null;
  startMs: number | null;
  endMs: number | null;
  nextStartMs: number | null;
}) {
  if (params.currentTimeMs === null || params.startMs === null) {
    return false;
  }

  const fallbackEndMs =
    params.nextStartMs ?? params.startMs + 4000;
  const effectiveEndMs = Math.max(
    params.endMs ?? fallbackEndMs,
    params.startMs + 500,
  );

  return (
    params.currentTimeMs >= params.startMs &&
    params.currentTimeMs < effectiveEndMs
  );
}

export function formatFileSize(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)}MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)}KB`;
  }

  return `${value}B`;
}

export function getNextSpeaker(currentTone: string) {
  const currentIndex = SPEAKER_CYCLE.findIndex((s) => s.tone === currentTone);
  const nextIndex = (currentIndex + 1) % SPEAKER_CYCLE.length;

  return SPEAKER_CYCLE[nextIndex];
}

export function getSpeakerToneClass(
  speakerTone: CounselingRecordDetail["transcriptSegments"][number]["speakerTone"],
  styles: Record<string, string>,
) {
  const parsedTone = counselingRecordSpeakerToneSchema.parse(speakerTone);

  switch (parsedTone) {
    case "teacher":
      return styles.teacherTone;
    case "student":
      return styles.studentTone;
    case "guardian":
      return styles.guardianTone;
    case "unknown":
    default:
      return styles.unknownTone;
  }
}

export function isTranscriptSegmentMatched(
  segment: CounselingRecordDetail["transcriptSegments"][number],
  normalizedQuery: string,
) {
  if (!normalizedQuery) {
    return false;
  }

  return `${segment.speakerLabel} ${segment.text}`
    .toLowerCase()
    .includes(normalizedQuery);
}

export function renderHighlightedText(
  text: string,
  normalizedQuery: string,
  styles: Record<string, string>,
) {
  if (!normalizedQuery) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const matchIndex = lowerText.indexOf(normalizedQuery, cursor);

    if (matchIndex === -1) {
      parts.push(text.slice(cursor));
      break;
    }

    if (matchIndex > cursor) {
      parts.push(text.slice(cursor, matchIndex));
    }

    parts.push(
      <mark
        key={`${matchIndex}-${normalizedQuery}`}
        className={styles.highlightText}
      >
        {text.slice(matchIndex, matchIndex + normalizedQuery.length)}
      </mark>,
    );
    cursor = matchIndex + normalizedQuery.length;
  }

  return parts;
}

export async function readErrorMessage(response: Response) {
  try {
    const data = await response.json();
    const parsed = errorResponseSchema.safeParse(data);

    if (parsed.success) {
      return parsed.data.message;
    }
  } catch {
    return null;
  }

  return null;
}

export async function fetchApi<TSchema>(
  path: string,
  init: RequestInit,
  parse: (input: unknown) => TSchema,
) {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
  });

  if (!response.ok) {
    const error = new Error(
      (await readErrorMessage(response)) ?? "요청을 처리하지 못했습니다.",
    ) as ApiRequestError;
    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  return parse(data);
}

export async function readAudioDurationMs(file: File) {
  if (typeof window === "undefined") {
    return null;
  }

  return new Promise<number | null>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audioElement = document.createElement("audio");
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audioElement.removeAttribute("src");
    };

    audioElement.preload = "metadata";
    audioElement.onloadedmetadata = () => {
      const durationSeconds = audioElement.duration;
      cleanup();
      resolve(
        Number.isFinite(durationSeconds) && durationSeconds > 0
          ? Math.round(durationSeconds * 1000)
          : null,
      );
    };
    audioElement.onerror = () => {
      cleanup();
      resolve(null);
    };
    audioElement.src = objectUrl;
  });
}

export function buildClientRequestId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `counseling-record-${Date.now()}`;
}

export function upsertRecordList(
  current: CounselingRecordListItem[],
  nextRecord: CounselingRecordListItem,
) {
  const filtered = current.filter((record) => record.id !== nextRecord.id);

  return [nextRecord, ...filtered].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export function buildQuickPrompts(record: CounselingRecordListItem) {
  if (record.status === "error") {
    return [
      "전사 실패 원인부터 정리해줘",
      "재전사 전에 확인할 점만 뽑아줘",
      "원본 상태 기준 운영 메모를 써줘",
    ];
  }

  if (record.status === "processing") {
    return [
      "현재 상태를 알려줘",
    ];
  }

  return [
    "이 상담 내용을 분석해줘",
    "보호자 공유 포인트만 정리해줘",
    "다음 상담에서 물어볼 질문을 만들어줘",
  ];
}

export function buildInitialAssistantMessages(
  record: CounselingRecordListItem,
  statusMeta: Record<string, { label: string }>,
): Message[] {
  if (record.status !== "ready") {
    return [
      {
        id: `${record.id}-assistant-status`,
        role: "assistant",
        content: `${record.studentName} 기록은 현재 ${statusMeta[record.status].label} 상태입니다. 원문이 준비되면 AI 분석을 시작할 수 있습니다.`,
      },
    ];
  }

  return [
    {
      id: `${record.id}-assistant-welcome`,
      role: "assistant",
      content: `${record.studentName} 상담 기록이 준비되었습니다. 원문을 바탕으로 분석, 요약, 후속 조치 제안을 도와드릴게요. 아래 빠른 질문을 눌러보거나 직접 질문해 주세요.`,
    },
  ];
}
