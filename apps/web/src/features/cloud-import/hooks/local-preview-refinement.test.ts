import { describe, expect, it } from "vitest";

import type { ImportPreview } from "../types";
import { applyLocalPreviewRefinement } from "./local-preview-refinement";

function makePreview(): ImportPreview {
  return {
    cohorts: [
      {
        name: "1기(백엔드)",
        students: [
          {
            name: "정서연",
            email: "seoyeon@example.com",
            phone: "010-1111-2222",
            status: "active",
            customFields: {
              전공: "국어국문",
              출신학교: "연세대",
            },
          },
          {
            name: "성동현",
            email: "donghyun@example.com",
            phone: "010-3333-4444",
            status: "withdrawn",
            customFields: {
              전공: "통계학",
              출신학교: "한국외대",
            },
          },
        ],
      },
    ],
  };
}

describe("applyLocalPreviewRefinement", () => {
  it("전공 컬럼 제거 요청을 로컬에서 즉시 반영한다", () => {
    const preview = makePreview();

    const result = applyLocalPreviewRefinement(
      preview,
      "전공컬럼은 필요가 없을거같아",
    );

    expect(result).not.toBeNull();
    expect(result?.removedColumns).toEqual(["전공"]);
    expect(result?.preview.cohorts[0]?.students[0]?.customFields).toEqual({
      출신학교: "연세대",
    });
    expect(result?.preview.cohorts[0]?.students[1]?.customFields).toEqual({
      출신학교: "한국외대",
    });
    expect(result?.message).toContain("전공 커스텀 컬럼을 제거했습니다");
  });

  it("연락처 열 삭제 요청도 로컬에서 반영한다", () => {
    const preview = makePreview();

    const result = applyLocalPreviewRefinement(preview, "연락처 열은 제거해줘");

    expect(result).not.toBeNull();
    expect(result?.removedColumns).toEqual(["연락처"]);
    expect(result?.preview.cohorts[0]?.students[0]?.phone).toBeNull();
    expect(result?.preview.cohorts[0]?.students[1]?.phone).toBeNull();
  });

  it("값 수정처럼 컬럼 제거가 아닌 요청은 로컬 처리하지 않는다", () => {
    const preview = makePreview();

    const result = applyLocalPreviewRefinement(
      preview,
      "정서연 이메일을 seoyeon.jung@example.com으로 바꿔줘",
    );

    expect(result).toBeNull();
  });
});
