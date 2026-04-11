import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { extractTableFromImageWithGoogleVision } from "../import-ocr-service";

function makeVisionWord(
  text: string,
  x: number,
  y: number,
  width = 32,
  height = 18,
) {
  return {
    symbols: text.split("").map((char) => ({ text: char })),
    boundingBox: {
      vertices: [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ],
    },
  };
}

describe("extractTableFromImageWithGoogleVision", () => {
  beforeEach(() => {
    process.env.GOOGLE_VISION_API_KEY = "vision-test-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_VISION_API_KEY;
  });

  it("중간 빈 셀이 있는 OCR 행도 컬럼 위치를 유지한다", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          responses: [
            {
              fullTextAnnotation: {
                text: "이름 등록일 기수\n조현우 7기",
                pages: [
                  {
                    blocks: [
                      {
                        paragraphs: [
                          {
                            words: [
                              makeVisionWord("이름", 10, 10),
                              makeVisionWord("등록일", 110, 10, 48),
                              makeVisionWord("기수", 220, 10),
                            ],
                          },
                          {
                            words: [
                              makeVisionWord("조현우", 10, 90, 48),
                              makeVisionWord("7기", 220, 90),
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          ],
        }),
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await extractTableFromImageWithGoogleVision({
      buffer: Buffer.from("fake-image"),
      mimeType: "image/png",
    });

    expect(result.rows).toEqual([
      ["이름", "등록일", "기수"],
      ["조현우", "", "7기"],
    ]);
    expect(result.maxColumnCount).toBe(3);
  });
});
