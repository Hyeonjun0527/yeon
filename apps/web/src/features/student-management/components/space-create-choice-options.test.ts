import { describe, expect, it } from "vitest";

import { SPACE_CREATE_CHOICES } from "./space-create-choice-options";

describe("SPACE_CREATE_CHOICES", () => {
  it("AI 가져오기 CTA를 최상단에 둔다", () => {
    expect(SPACE_CREATE_CHOICES.map((choice) => choice.step)).toEqual([
      "import",
      "blank",
    ]);
    expect(SPACE_CREATE_CHOICES[0]).toMatchObject({
      step: "import",
      title: "AI로 파일 가져와 스페이스 만들기",
      badgeLabel: "권장",
      tone: "recommended",
    });
  });
});
