import { describe, expect, it } from "vitest";

import { diffText, runImportAnalysisRequest } from "./import-helpers";
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

function makeSseResponse(events: unknown[], headers?: HeadersInit) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const event of events) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        }
        controller.close();
      },
    }),
    {
      status: 200,
      headers,
    },
  );
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

describe("runImportAnalysisRequest", () => {
  it("draft id 헤더와 progress/done 이벤트를 함께 처리한다", async () => {
    const preview = makePreview();
    const progressSpy: Array<string> = [];
    const draftSpy: Array<string> = [];

    const result = await runImportAnalysisRequest({
      request: async () =>
        makeSseResponse(
          [
            {
              type: "progress",
              text: "분석 중",
              stage: "ai_mapping",
              progress: 50,
            },
            { type: "done", preview },
          ],
          { "x-import-draft-id": "draft-1" },
        ),
      fallbackErrorMessage: "파일 분석에 실패했습니다.",
      onDraftId: (draftId) => draftSpy.push(draftId),
      onProgress: ({ text }) => progressSpy.push(text),
    });

    expect(result).toEqual(preview);
    expect(draftSpy).toEqual(["draft-1"]);
    expect(progressSpy).toEqual(["분석 중"]);
  });

  it("응답이 실패하면 fallback 메시지로 에러를 던진다", async () => {
    await expect(
      runImportAnalysisRequest({
        request: async () => new Response(null, { status: 500 }),
        fallbackErrorMessage: "파일 분석에 실패했습니다.",
        onProgress: () => {},
      }),
    ).rejects.toThrow("파일 분석에 실패했습니다.");
  });
});
