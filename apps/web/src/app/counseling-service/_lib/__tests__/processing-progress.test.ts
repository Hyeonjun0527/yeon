import { describe, expect, it } from "vitest";

import { getProcessingChecklistStep } from "../processing-progress";

describe("getProcessingChecklistStep", () => {
  it("백엔드 processingStage를 체크리스트 step으로 변환한다", () => {
    expect(getProcessingChecklistStep({ processingStage: "queued" })).toBe(0);
    expect(
      getProcessingChecklistStep({ processingStage: "transcribing" }),
    ).toBe(2);
    expect(
      getProcessingChecklistStep({ processingStage: "resolving_speakers" }),
    ).toBe(3);
    expect(getProcessingChecklistStep({ processingStage: "completed" })).toBe(
      5,
    );
  });

  it("analysisStatus가 ready면 마지막 step을 고정한다", () => {
    expect(
      getProcessingChecklistStep({
        processingStage: "analyzing",
        analysisStatus: "ready",
      }),
    ).toBe(5);
  });
});
