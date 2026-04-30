import { describe, expect, it } from "vitest";

import { parseBulkCardImportInput } from "./bulk-card-import-parser";

describe("parseBulkCardImportInput", () => {
  it("[[Q]], [[A]], [[CARD]] 마커로 여러 카드를 파싱한다", () => {
    const result = parseBulkCardImportInput(`[[Q]]
문제 1
[[A]]
정답 1
[[CARD]]
[[Q]]
문제 2
[[A]]
정답 2`);

    expect(result.errors).toEqual([]);
    expect(result.cards).toEqual([
      { frontText: "문제 1", backText: "정답 1" },
      { frontText: "문제 2", backText: "정답 2" },
    ]);
  });

  it("마커와 내용이 같은 줄에 붙어도 파싱한다", () => {
    const result = parseBulkCardImportInput(`[[Q]]문제 1
[[A]]정답 1
[[CARD]]
[[Q]]문제 2
[[A]]정답 2`);

    expect(result.errors).toEqual([]);
    expect(result.cards).toEqual([
      { frontText: "문제 1", backText: "정답 1" },
      { frontText: "문제 2", backText: "정답 2" },
    ]);
  });

  it("문제와 정답 안의 일반 대괄호는 내용으로 유지한다", () => {
    const result = parseBulkCardImportInput(`[[Q]]
배열 [1, 2, 3]에서 [0]은?
[[A]]
첫 번째 값 [1]`);

    expect(result.errors).toEqual([]);
    expect(result.cards[0]).toEqual({
      frontText: "배열 [1, 2, 3]에서 [0]은?",
      backText: "첫 번째 값 [1]",
    });
  });

  it("마커는 trim한 한 줄 전체가 일치할 때만 인식한다", () => {
    const result = parseBulkCardImportInput(`  [[Q]]
문제 안의 [[A]] 문자열은 마커가 아니다
[[A]]
정답 안의 [[CARD]] 문자열도 마커가 아니다`);

    expect(result.errors).toEqual([]);
    expect(result.cards[0]).toEqual({
      frontText: "문제 안의 [[A]] 문자열은 마커가 아니다",
      backText: "정답 안의 [[CARD]] 문자열도 마커가 아니다",
    });
  });

  it("문제와 정답의 줄바꿈을 카드 경계로 쓰지 않는다", () => {
    const result = parseBulkCardImportInput(`[[Q]]
첫 줄
둘째 줄
[[A]]
정답 첫 줄
정답 둘째 줄`);

    expect(result.errors).toEqual([]);
    expect(result.cards[0]).toEqual({
      frontText: "첫 줄\n둘째 줄",
      backText: "정답 첫 줄\n정답 둘째 줄",
    });
  });

  it("앞면이나 뒷면이 비어 있으면 오류를 반환한다", () => {
    const result = parseBulkCardImportInput(`[[Q]]
문제만 있음`);

    expect(result.cards).toEqual([]);
    expect(result.errors[0]).toContain("앞면([[Q]])과 뒷면([[A]])");
  });

  it("내용으로 마커 한 줄이 필요하면 백슬래시로 이스케이프할 수 있다", () => {
    const result = parseBulkCardImportInput(`[[Q]]
\\[[Q]]
[[A]]
\\[[CARD]]`);

    expect(result.errors).toEqual([]);
    expect(result.cards[0]).toEqual({
      frontText: "[[Q]]",
      backText: "[[CARD]]",
    });
  });
});
