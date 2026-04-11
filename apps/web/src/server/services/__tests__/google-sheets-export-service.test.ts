import { describe, expect, it } from "vitest";

import { extractSheetId } from "../google-sheets-export-service";

describe("google-sheets-export-service", () => {
  it("정상 구글 시트 URL에서 sheet id를 추출한다", () => {
    expect(
      extractSheetId(
        "https://docs.google.com/spreadsheets/d/abc123_DEF-456/edit#gid=0",
      ),
    ).toBe("abc123_DEF-456");
  });

  it("시트 ID를 추출할 수 없는 URL이면 400을 던진다", () => {
    expect(() =>
      extractSheetId("https://docs.google.com/document/d/abc/edit"),
    ).toThrow();
  });
});
