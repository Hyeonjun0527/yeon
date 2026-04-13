import type { RecordItem } from "./types";

function isSilentTranscriptionFailure(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("전사 결과가 비어") ||
    normalized.includes("음성 전사 결과가 비어") ||
    normalized.includes("transcription result is empty")
  );
}

export function inferFailurePresentation(selected: RecordItem) {
  const message = selected.errorMessage ?? "알 수 없는 오류가 발생했습니다.";
  const normalized = message.toLowerCase();
  const isAnalysisFailure =
    selected.analysisStatus === "error" ||
    normalized.includes("analysis") ||
    normalized.includes("분석");
  const isLongAudioFailure =
    normalized.includes("audio duration") ||
    normalized.includes("longer than") ||
    normalized.includes("maximum for this model") ||
    normalized.includes("1400 seconds") ||
    normalized.includes("길이") ||
    normalized.includes("duration");
  const isSilentFailure = isSilentTranscriptionFailure(message);

  if (isAnalysisFailure) {
    return {
      badge: "AI 분석 실패",
      title: "AI 분석에 실패했습니다",
      description:
        "전사는 남아 있으므로 AI 분석 단계만 다시 시도할 수 있습니다.",
      retryLabel: "AI 분석 다시 시도",
      toneClass: "text-accent",
      isAnalysisFailure: true,
      canRetry: true,
    };
  }

  if (isLongAudioFailure) {
    return {
      badge: "전사 실패",
      title: "음성 전사 길이 제한으로 실패했습니다",
      description:
        "현재 모델 한도를 넘는 긴 음성이라 재시도 전 전사 전략이 바뀌어야 할 수 있습니다. 그래도 재전사를 다시 시도할 수 있습니다.",
      retryLabel: "전사 다시 시도",
      toneClass: "text-red",
      isAnalysisFailure: false,
      canRetry: true,
    };
  }

  if (isSilentFailure) {
    return {
      badge: "무음 녹음",
      title: "녹음된 음성이 없어 전사할 수 없습니다",
      description:
        "이 경우 재전사를 반복해도 같은 결과가 날 가능성이 큽니다. 이 기록은 삭제하거나 실제 음성이 포함되도록 다시 녹음해 주세요.",
      retryLabel: null,
      toneClass: "text-text-secondary",
      isAnalysisFailure: false,
      canRetry: false,
    };
  }

  return {
    badge: "전사 실패",
    title: "음성 분석에 실패했습니다",
    description: "원본 음성에서 전사 파이프라인을 다시 시작할 수 있습니다.",
    retryLabel: "재전사 다시 시도",
    toneClass: "text-red",
    isAnalysisFailure: false,
    canRetry: true,
  };
}
