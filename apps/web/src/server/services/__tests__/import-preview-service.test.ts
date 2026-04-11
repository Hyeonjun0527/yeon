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

import { importPreviewIntoSpaces } from "../import-preview-service";

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
            students: [{ name: "홍길동" }, { name: "김영희" }],
          },
          {
            name: "2기 백엔드",
            students: [{ name: "이철수" }],
          },
        ],
      }),
    ).resolves.toEqual({ spaces: 2, members: 3 });
  });
});
