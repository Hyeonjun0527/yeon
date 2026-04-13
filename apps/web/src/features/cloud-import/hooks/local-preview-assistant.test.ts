import { describe, expect, it } from "vitest";

import type { ImportPreview } from "../types";
import { answerLocalPreviewQuestion } from "./local-preview-assistant";

const preview: ImportPreview = {
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
          },
        },
      ],
    },
  ],
};

describe("answerLocalPreviewQuestion", () => {
  it("이름 컬럼 제거 가능 여부 질문에 정책 답변을 반환한다", () => {
    const result = answerLocalPreviewQuestion(
      preview,
      "이름 컬럼 자체를 제거하는 건 불가능하니?",
    );

    expect(result?.message).toContain("이름 컬럼은 제거할 수 없습니다");
  });

  it("전공 커스텀 컬럼 제거 가능 여부 질문에 정책 답변을 반환한다", () => {
    const result = answerLocalPreviewQuestion(
      preview,
      "전공 컬럼은 제거할 수 있어?",
    );

    expect(result?.message).toContain("커스텀 컬럼은 제거할 수 있습니다");
  });
});
