import * as XLSX from "xlsx";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./import-ocr-service", () => ({
  extractTableFromImageWithGoogleVision: vi.fn(),
}));

import { analyzeBuffer, parseExcelToText } from "../file-analysis-service";

describe("file-analysis-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("지원하지 않는 파일 형식은 400을 던진다", async () => {
    await expect(
      analyzeBuffer(
        Buffer.from("x"),
        "archive.zip",
        "application/zip",
        "unsupported",
      ),
    ).rejects.toMatchObject({
      status: 400,
      message: "분석을 지원하지 않는 파일 형식입니다.",
    });
  });

  it("빈 PDF는 빈 cohort 결과로 fallback한다", async () => {
    await expect(
      analyzeBuffer(
        Buffer.from("%PDF"),
        "sample.pdf",
        "application/pdf",
        "pdf",
      ),
    ).resolves.toEqual({ cohorts: [] });
  });

  it("parseExcelToText는 시트 이름과 CSV 텍스트를 포함한다", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["이름", "이메일"],
      ["홍길동", "hong@yeon.world"],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "학생목록");
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;

    const text = parseExcelToText(buffer);

    expect(text).toContain("=== 시트: 학생목록 ===");
    expect(text).toContain("홍길동");
  });
});
