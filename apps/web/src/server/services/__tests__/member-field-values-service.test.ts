import { describe, it, expect, beforeEach, vi } from "vitest";

/* ── DB 모킹 ─────────────────────────────────────────────────── */

const { responses, chain } = vi.hoisted(() => {
  const responses: unknown[] = [];
  const proxy: unknown = new Proxy({} as Record<string | symbol, unknown>, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) =>
          Promise.resolve(responses.shift() || []).then(resolve);
      }
      if (prop === "catch" || prop === "finally") return undefined;
      return () => proxy;
    },
  });
  return { responses, chain: proxy };
});

vi.mock("@/server/db", () => ({ getDb: () => chain }));
vi.mock("@/server/db/schema", () => ({
  memberFieldDefinitions: {},
  memberFieldValues: {},
}));
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  eq: (col: unknown, val: unknown) => ({ col, val }),
  inArray: (col: unknown, values: unknown[]) => ({ col, values }),
  sql: (_strings: TemplateStringsArray, ...values: unknown[]) => values,
}));

import {
  getFieldValues,
  upsertFieldValue,
  bulkUpsertFieldValues,
} from "../member-field-values-service";

/* ── 헬퍼 ── */

const makeDefinition = (overrides: Record<string, unknown> = {}) => ({
  id: "def-1",
  spaceId: "space-1",
  tabId: "tab-1",
  name: "테스트 필드",
  fieldType: "text",
  options: null,
  isRequired: false,
  displayOrder: 0,
  createdByUserId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeFieldValue = (overrides: Record<string, unknown> = {}) => ({
  id: "val-1",
  memberId: "member-1",
  fieldDefinitionId: "def-1",
  valueText: null,
  valueNumber: null,
  valueBoolean: null,
  valueJson: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  responses.length = 0;
});

/* ── upsertFieldValue: 정의 조회 실패 ── */

describe("upsertFieldValue - 필드 정의 없음", () => {
  it("필드 정의를 찾지 못하면 404 ServiceError를 던진다", async () => {
    responses.push([]); // definition select → empty

    await expect(
      upsertFieldValue("member-1", "space-1", {
        fieldDefinitionId: "nonexistent",
        value: "some value",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

/* ── upsertFieldValue: fieldType별 컬럼 라우팅 ── */

describe("upsertFieldValue - fieldType별 컬럼 라우팅", () => {
  it("fieldType=text → valueText에 저장, 나머지 컬럼 null", async () => {
    const def = makeDefinition({ fieldType: "text" });
    const inserted = makeFieldValue({
      valueText: "hello",
      valueNumber: null,
      valueBoolean: null,
      valueJson: null,
    });
    responses.push([def]); // definition select
    responses.push([]); // existing value select → 없음
    responses.push([inserted]); // insert.returning()

    const result = await upsertFieldValue("member-1", "space-1", {
      fieldDefinitionId: "def-1",
      value: "hello",
    });
    expect(result.valueText).toBe("hello");
    expect(result.valueNumber).toBeNull();
    expect(result.valueBoolean).toBeNull();
    expect(result.valueJson).toBeNull();
  });

  it("fieldType=long_text → valueText에 저장", async () => {
    const def = makeDefinition({ fieldType: "long_text" });
    const inserted = makeFieldValue({ valueText: "긴 텍스트 내용" });
    responses.push([def]);
    responses.push([]);
    responses.push([inserted]);

    const result = await upsertFieldValue("member-1", "space-1", {
      fieldDefinitionId: "def-1",
      value: "긴 텍스트 내용",
    });
    expect(result.valueText).toBe("긴 텍스트 내용");
  });

  it("fieldType=url → valueText에 저장", async () => {
    const def = makeDefinition({ fieldType: "url" });
    const inserted = makeFieldValue({ valueText: "https://example.com" });
    responses.push([def]);
    responses.push([]);
    responses.push([inserted]);

    const result = await upsertFieldValue("member-1", "space-1", {
      fieldDefinitionId: "def-1",
      value: "https://example.com",
    });
    expect(result.valueText).toBe("https://example.com");
  });

  it("fieldType=number, 값='42' → valueNumber='42'로 저장", async () => {
    const def = makeDefinition({ fieldType: "number" });
    const inserted = makeFieldValue({ valueNumber: "42" });
    responses.push([def]);
    responses.push([]);
    responses.push([inserted]);

    const result = await upsertFieldValue("member-1", "space-1", {
      fieldDefinitionId: "def-1",
      value: "42",
    });
    expect(result.valueNumber).toBe("42");
  });

  it("fieldType=number, 값='abc' → 400 ServiceError (NaN 감지)", async () => {
    const def = makeDefinition({ fieldType: "number" });
    responses.push([def]); // definition select

    await expect(
      upsertFieldValue("member-1", "space-1", {
        fieldDefinitionId: "def-1",
        value: "abc",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("fieldType=number, 값=NaN → 400 ServiceError", async () => {
    const def = makeDefinition({ fieldType: "number" });
    responses.push([def]); // definition select

    await expect(
      upsertFieldValue("member-1", "space-1", {
        fieldDefinitionId: "def-1",
        value: NaN,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("fieldType=checkbox, 값=true → valueBoolean=true로 저장", async () => {
    const def = makeDefinition({ fieldType: "checkbox" });
    const inserted = makeFieldValue({ valueBoolean: true });
    responses.push([def]);
    responses.push([]);
    responses.push([inserted]);

    const result = await upsertFieldValue("member-1", "space-1", {
      fieldDefinitionId: "def-1",
      value: true,
    });
    expect(result.valueBoolean).toBe(true);
  });

  it("fieldType=checkbox, 값=false → valueBoolean=false로 저장", async () => {
    const def = makeDefinition({ fieldType: "checkbox" });
    const inserted = makeFieldValue({ valueBoolean: false });
    responses.push([def]);
    responses.push([]);
    responses.push([inserted]);

    const result = await upsertFieldValue("member-1", "space-1", {
      fieldDefinitionId: "def-1",
      value: false,
    });
    expect(result.valueBoolean).toBe(false);
  });

  it("fieldType=select, 값=['option1'] → valueJson에 저장", async () => {
    const def = makeDefinition({ fieldType: "select" });
    const inserted = makeFieldValue({ valueJson: ["option1"] });
    responses.push([def]);
    responses.push([]);
    responses.push([inserted]);

    const result = await upsertFieldValue("member-1", "space-1", {
      fieldDefinitionId: "def-1",
      value: ["option1"],
    });
    expect(result.valueJson).toEqual(["option1"]);
  });

  it("fieldType=multi_select, 값=['a','b'] → valueJson에 저장", async () => {
    const def = makeDefinition({ fieldType: "multi_select" });
    const inserted = makeFieldValue({ valueJson: ["a", "b"] });
    responses.push([def]);
    responses.push([]);
    responses.push([inserted]);

    const result = await upsertFieldValue("member-1", "space-1", {
      fieldDefinitionId: "def-1",
      value: ["a", "b"],
    });
    expect(result.valueJson).toEqual(["a", "b"]);
  });
});

/* ── upsertFieldValue: null/undefined 값 처리 ── */

describe("upsertFieldValue - null/undefined 값 처리", () => {
  it("값이 null이면 모든 컬럼을 null로 초기화한다", async () => {
    const def = makeDefinition({ fieldType: "text" });
    const inserted = makeFieldValue({
      valueText: null,
      valueNumber: null,
      valueBoolean: null,
      valueJson: null,
    });
    responses.push([def]);
    responses.push([]);
    responses.push([inserted]);

    const result = await upsertFieldValue("member-1", "space-1", {
      fieldDefinitionId: "def-1",
      value: null,
    });
    expect(result.valueText).toBeNull();
    expect(result.valueNumber).toBeNull();
    expect(result.valueBoolean).toBeNull();
    expect(result.valueJson).toBeNull();
  });

  it("값이 undefined이면 모든 컬럼을 null로 초기화한다", async () => {
    const def = makeDefinition({ fieldType: "text" });
    const inserted = makeFieldValue({
      valueText: null,
      valueNumber: null,
      valueBoolean: null,
      valueJson: null,
    });
    responses.push([def]);
    responses.push([]);
    responses.push([inserted]);

    const result = await upsertFieldValue("member-1", "space-1", {
      fieldDefinitionId: "def-1",
      value: undefined,
    });
    expect(result.valueText).toBeNull();
    expect(result.valueNumber).toBeNull();
    expect(result.valueBoolean).toBeNull();
    expect(result.valueJson).toBeNull();
  });
});

/* ── upsertFieldValue: upsert 분기 ── */

describe("upsertFieldValue - upsert 분기", () => {
  it("기존 값이 있으면 UPDATE 경로를 탄다 (INSERT 아님)", async () => {
    const def = makeDefinition({ fieldType: "text" });
    const existing = makeFieldValue({ valueText: "기존값" });
    const updated = makeFieldValue({
      valueText: "새값",
      updatedAt: new Date(),
    });
    responses.push([def]); // definition select
    responses.push([existing]); // existing value select
    responses.push([updated]); // update.returning()

    const result = await upsertFieldValue("member-1", "space-1", {
      fieldDefinitionId: "def-1",
      value: "새값",
    });
    expect(result.valueText).toBe("새값");
  });

  it("기존 값이 없으면 INSERT 경로를 탄다", async () => {
    const def = makeDefinition({ fieldType: "text" });
    const inserted = makeFieldValue({ valueText: "신규값" });
    responses.push([def]); // definition select
    responses.push([]); // existing value select → 없음
    responses.push([inserted]); // insert.returning()

    const result = await upsertFieldValue("member-1", "space-1", {
      fieldDefinitionId: "def-1",
      value: "신규값",
    });
    expect(result.valueText).toBe("신규값");
  });
});

/* ── upsertFieldValue: text 5000자 truncate ── */

describe("upsertFieldValue - text 5000자 truncate", () => {
  it("text 타입에 6000자 입력 시 5000자로 잘린다", async () => {
    const longValue = "a".repeat(6000);
    const def = makeDefinition({ fieldType: "text" });
    const inserted = makeFieldValue({ valueText: "a".repeat(5000) });
    responses.push([def]);
    responses.push([]);
    responses.push([inserted]);

    const result = await upsertFieldValue("member-1", "space-1", {
      fieldDefinitionId: "def-1",
      value: longValue,
    });
    expect((result.valueText as string).length).toBeLessThanOrEqual(5000);
  });
});

/* ── getFieldValues ── */

describe("getFieldValues", () => {
  it("정상 목록을 반환한다 (innerJoin 결과)", async () => {
    const rows = [
      {
        id: "val-1",
        memberId: "member-1",
        fieldDefinitionId: "def-1",
        valueText: "홍길동",
        valueNumber: null,
        valueBoolean: null,
        valueJson: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        fieldType: "text",
        fieldName: "이름",
      },
      {
        id: "val-2",
        memberId: "member-1",
        fieldDefinitionId: "def-2",
        valueText: null,
        valueNumber: "25",
        valueBoolean: null,
        valueJson: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        fieldType: "number",
        fieldName: "나이",
      },
    ];
    responses.push(rows);

    const result = await getFieldValues("member-1", "space-1");
    expect(result).toHaveLength(2);
    expect(result[0].fieldName).toBe("이름");
    expect(result[1].fieldType).toBe("number");
  });

  it("필드 값이 없으면 빈 배열을 반환한다", async () => {
    responses.push([]);

    const result = await getFieldValues("member-1", "space-1");
    expect(result).toEqual([]);
  });
});

/* ── bulkUpsertFieldValues ── */

describe("bulkUpsertFieldValues", () => {
  it("여러 필드 값을 한 번에 upsert한다", async () => {
    const def1 = makeDefinition({ id: "def-1", fieldType: "text" });
    const def2 = makeDefinition({ id: "def-2", fieldType: "number" });
    responses.push([def1, def2]); // definition select
    responses.push(undefined); // insert.onConflictDoUpdate

    await expect(
      bulkUpsertFieldValues("member-1", "space-1", [
        { fieldDefinitionId: "def-1", value: "값1" },
        { fieldDefinitionId: "def-2", value: 99 },
      ]),
    ).resolves.toBeUndefined();
  });

  it("빈 배열로 호출하면 오류 없이 완료된다", async () => {
    await expect(
      bulkUpsertFieldValues("member-1", "space-1", []),
    ).resolves.toBeUndefined();
  });
});
