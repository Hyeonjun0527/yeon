import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  dbChain,
  txChain: _txChain,
  txResponses,
} = vi.hoisted(() => {
  const txResponses: unknown[] = [];
  const txProxy: unknown = new Proxy({} as Record<string | symbol, unknown>, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (value: unknown) => void) =>
          Promise.resolve(txResponses.shift() ?? undefined).then(resolve);
      }
      if (prop === "catch" || prop === "finally") return undefined;
      return () => txProxy;
    },
  });

  const dbChain = {
    transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(txProxy),
  };

  return { dbChain, txChain: txProxy, txResponses };
});

vi.mock("@/server/db", () => ({ getDb: () => dbChain }));
vi.mock("@/server/db/schema", () => ({
  memberFieldDefinitions: {},
  memberFieldValues: {},
  memberTabDefinitions: {},
  members: {},
  spaces: {},
}));
vi.mock("./member-field-values-service", () => ({
  buildValueColumns: (_type: string, value: string) => ({ valueText: value }),
}));

import {
  importPreviewIntoSpaces,
  inferCustomFieldType,
} from "../import-preview-service";

describe("import-preview-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txResponses.length = 0;
  });

  it("빈 스페이스 이름은 400을 던진다", async () => {
    await expect(
      importPreviewIntoSpaces("user-1", {
        cohorts: [{ name: "   ", students: [{ name: "홍길동" }] }],
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "스페이스 이름은 필수입니다.",
    });
  });

  it("빈 수강생 이름은 400을 던진다", async () => {
    await expect(
      importPreviewIntoSpaces("user-1", {
        cohorts: [{ name: "1기", students: [{ name: "   " }] }],
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "수강생 이름은 필수입니다.",
    });
  });

  it("여러 cohort를 spaces/members 개수로 집계한다", async () => {
    txResponses.push(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    await expect(
      importPreviewIntoSpaces("user-1", {
        cohorts: [
          {
            name: "1기 프론트엔드",
            startDate: "2026-04-01",
            endDate: "2026-10-31",
            students: [{ name: "홍길동" }, { name: "김영희" }],
          },
          {
            name: "2기 백엔드",
            startDate: "2026-05-01",
            endDate: "2026-11-30",
            students: [{ name: "이철수" }],
          },
        ],
      }),
    ).resolves.toMatchObject({
      spaces: 2,
      members: 3,
      spaceIds: [expect.any(String), expect.any(String)],
    });
  });

  it("cohort 진행기간은 시작일과 종료일을 함께 입력해야 한다", async () => {
    await expect(
      importPreviewIntoSpaces("user-1", {
        cohorts: [
          {
            name: "1기",
            startDate: "2026-04-01",
            students: [{ name: "홍길동" }],
          },
        ],
      }),
    ).rejects.toMatchObject({
      status: 400,
      message:
        '"1기" 진행기간이 올바르지 않습니다. 진행기간을 입력하려면 시작일과 종료일을 모두 선택해 주세요.',
    });
  });

  it("cohort 진행기간은 종료일이 시작일보다 빠를 수 없다", async () => {
    await expect(
      importPreviewIntoSpaces("user-1", {
        cohorts: [
          {
            name: "1기",
            startDate: "2026-04-10",
            endDate: "2026-04-01",
            students: [{ name: "홍길동" }],
          },
        ],
      }),
    ).rejects.toMatchObject({
      status: 400,
      message:
        '"1기" 진행기간이 올바르지 않습니다. 종료일은 시작일보다 빠를 수 없습니다.',
    });
  });

  it("긴급연락처 계열 필드는 링크 타입 대신 text로 추론한다", () => {
    expect(inferCustomFieldType("긴급연락처", ["010-6287-3533"])).toBe("text");
    expect(inferCustomFieldType("비상 연락처", ["010-6287-3533"])).toBe("text");
    expect(inferCustomFieldType("긴급연락처관계", ["부"])).toBe("text");
    expect(inferCustomFieldType("비상 연락처 관계", ["모"])).toBe("text");
  });

  it("관계 계열 필드는 phone 대신 text로 추론한다", () => {
    expect(inferCustomFieldType("보호자 관계", ["부"])).toBe("text");
    expect(inferCustomFieldType("guardian relation", ["father"])).toBe("text");
  });
});
