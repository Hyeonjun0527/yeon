import { describe, expect, it } from "vitest";
import { inferFailurePresentation } from "../failure-presentation";
import type { RecordItem } from "../types";

function makeRecord(overrides: Partial<RecordItem> = {}): RecordItem {
  return {
    id: "rec-1",
    spaceId: "space-1",
    memberId: "member-1",
    createdAt: new Date().toISOString(),
    title: "상담 기록",
    status: "error",
    errorMessage: "전사 실패",
    meta: "메타",
    duration: "1:00",
    durationMs: 60000,
    studentName: "홍길동",
    type: "1:1",
    recordSource: "audio_upload",
    audioUrl: null,
    transcript: [],
    aiSummary: "",
    aiMessages: [],
    aiMessagesLoaded: false,
    analysisResult: null,
    processingStage: "error",
    processingProgress: 0,
    processingMessage: null,
    analysisStatus: "idle",
    analysisProgress: 0,
    ...overrides,
  };
}

describe("inferFailurePresentation", () => {
  it("무음 전사 실패는 재시도 CTA 없이 별도 안내를 반환한다", () => {
    const presentation = inferFailurePresentation(
      makeRecord({
        errorMessage:
          "음성 전사 결과가 비어 있습니다. chunk 1부터 다시 확인해 주세요.",
      }),
    );

    expect(presentation.badge).toBe("무음 녹음");
    expect(presentation.title).toBe("녹음된 음성이 없어 전사할 수 없습니다");
    expect(presentation.canRetry).toBe(false);
    expect(presentation.retryLabel).toBeNull();
  });

  it("일반 전사 실패는 재전사 CTA를 유지한다", () => {
    const presentation = inferFailurePresentation(
      makeRecord({
        errorMessage: "STT 제공자가 전사 요청을 처리하지 못했습니다.",
      }),
    );

    expect(presentation.badge).toBe("전사 실패");
    expect(presentation.canRetry).toBe(true);
    expect(presentation.retryLabel).toBe("재전사 다시 시도");
  });

  it("ffmpeg 누락은 전사 환경 오류로 별도 안내한다", () => {
    const presentation = inferFailurePresentation(
      makeRecord({
        errorMessage:
          "긴 음성 파일 분할에 필요한 ffmpeg가 서버 이미지에 없습니다. 배포 컨테이너에 ffmpeg 패키지를 포함해 주세요.",
      }),
    );

    expect(presentation.badge).toBe("전사 환경 오류");
    expect(presentation.title).toBe("긴 음성 전사 도구가 서버에 없습니다");
    expect(presentation.canRetry).toBe(true);
    expect(presentation.retryLabel).toBe("재전사 다시 시도");
  });
});
