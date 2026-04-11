import * as XLSX from "xlsx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { analyzeBuffer, type ImportPreview } from "../file-analysis-service";

function createSpreadsheetBuffer() {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["이름", "이메일", "노트북사양"],
    ["홍길동", "hong@example.com", "LG Gram"],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "백엔드 1기");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("analyzeBuffer - spreadsheet refine", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("구조화 스프레드시트도 후속 수정 요청을 실제 preview 변환에 반영한다", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    primarySource: "dedicated",
                    sheets: [
                      {
                        sheetName: "백엔드 1기",
                        role: "dedicated",
                        headerRows: [0],
                        dataStartRow: 1,
                        nameColumn: 0,
                        emailColumn: 1,
                        phoneColumn: null,
                        statusColumn: null,
                        spaceColumn: null,
                        notes: null,
                      },
                    ],
                  }),
                },
              },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
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
                  }),
                },
              },
            ],
          }),
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const previousResult: ImportPreview = {
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
    };

    const result = await analyzeBuffer(
      createSpreadsheetBuffer(),
      "students.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "spreadsheet",
      {
        instruction:
          "이메일 컬럼명을 야메일로 바꾸고 노트북사양 컬럼은 제거해줘",
        previousResult,
      },
    );

    expect(result.cohorts[0]?.students[0]).toEqual({
      name: "홍길동",
      email: null,
      phone: null,
      status: "active",
      customFields: {
        야메일: "hong@example.com",
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
