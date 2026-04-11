import { describe, expect, it } from "vitest";

import {
  createImportAnalysisProgressState,
  getImportAnalysisChecklistStep,
} from "../import-analysis-progress";

describe("import-analysis-progress", () => {
  it("stage별 기본 progress와 message를 제공한다", () => {
    const state = createImportAnalysisProgressState("extracting_rows");

    expect(state.progress).toBe(58);
    expect(state.message).toContain("수강생 정보를 추출");
  });

  it("stage를 체크리스트 step으로 변환한다", () => {
    expect(getImportAnalysisChecklistStep("queued")).toBe(0);
    expect(getImportAnalysisChecklistStep("loading_bytes")).toBe(1);
    expect(getImportAnalysisChecklistStep("ai_mapping")).toBe(3);
    expect(getImportAnalysisChecklistStep("preview_ready")).toBe(5);
  });
});
