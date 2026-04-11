import { describe, expect, it } from "vitest";

import { diffText } from "./import-helpers";
import type { ImportPreview } from "../types";

function makePreview(overrides?: Partial<ImportPreview>): ImportPreview {
  return {
    cohorts: [
      {
        name: "1기(백엔드)",
        students: [
          {
            name: "홍길동",
            email: "hong@example.com",
            phone: null,
            status: "active",
            customFields: {
              노트북사양: "LG Gram",
            },
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("diffText", () => {
  it("실제 변경이 없으면 업데이트 완료 대신 재요청 안내를 반환한다", () => {
    const preview = makePreview();

    expect(diffText(preview, structuredClone(preview))).toContain(
      "반영된 변경을 찾지 못했습니다",
    );
  });

  it("개수 변화 없이 내용만 바뀌어도 업데이트로 안내한다", () => {
    const prev = makePreview();
    const next = makePreview({
      cohorts: [
        {
          name: "1기(백엔드)",
          students: [
            {
              name: "홍길동",
              email: null,
              phone: null,
              status: "active",
              customFields: {
                야메일: "hong@example.com",
              },
            },
          ],
        },
      ],
    });

    expect(diffText(prev, next)).toContain("데이터 내용을 업데이트했습니다");
  });
});
