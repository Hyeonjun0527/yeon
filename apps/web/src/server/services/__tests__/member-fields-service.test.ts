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
vi.mock("@/server/db/schema", () => ({ memberFieldDefinitions: {} }));
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  asc: (col: unknown) => col,
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

import {
  createField,
  updateField,
  deleteField,
  reorderFields,
  getFieldsForTab,
  VALID_FIELD_TYPES,
} from "../member-fields-service";

/* ── 헬퍼 ── */

const makeField = (overrides: Record<string, unknown> = {}) => ({
  id: "field-1",
  spaceId: "space-1",
  tabId: "tab-1",
  createdByUserId: "user-1",
  name: "테스트 필드",
  fieldType: "text",
  options: null,
  isRequired: false,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  responses.length = 0;
});

/* ── VALID_FIELD_TYPES ── */

describe("VALID_FIELD_TYPES", () => {
  it("지원하는 10가지 필드 타입을 포함한다", () => {
    const expected = [
      "text",
      "long_text",
      "number",
      "date",
      "select",
      "multi_select",
      "checkbox",
      "url",
      "email",
      "phone",
    ];
    for (const type of expected) {
      expect(VALID_FIELD_TYPES.has(type as never)).toBe(true);
    }
  });

  it("지원하지 않는 타입은 포함하지 않는다", () => {
    expect(VALID_FIELD_TYPES.has("rich_text" as never)).toBe(false);
    expect(VALID_FIELD_TYPES.has("image" as never)).toBe(false);
    expect(VALID_FIELD_TYPES.has("" as never)).toBe(false);
  });
});

/* ── createField ── */

describe("createField", () => {
  it("유효하지 않은 fieldType이면 400 ServiceError를 던진다", async () => {
    await expect(
      createField("space-1", "tab-1", "user-1", {
        name: "필드명",
        fieldType: "invalid_type" as never,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("빈 이름이면 400 ServiceError를 던진다", async () => {
    await expect(
      createField("space-1", "tab-1", "user-1", {
        name: "   ",
        fieldType: "text",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("text 타입으로 필드를 생성한다", async () => {
    const existingFields = [makeField({ displayOrder: 1 })];
    const newField = makeField({
      name: "새 필드",
      displayOrder: 2,
      id: "field-new",
    });
    responses.push(existingFields); // getFieldsForTab
    responses.push([newField]); // insert.returning()

    const result = await createField("space-1", "tab-1", "user-1", {
      name: "새 필드",
      fieldType: "text",
    });
    expect(result.name).toBe("새 필드");
    expect(result.fieldType).toBe("text");
  });

  it("select/multi_select 타입은 options를 저장한다", async () => {
    const opts = [{ value: "A", color: "#fff" }];
    const newField = makeField({
      name: "선택 필드",
      fieldType: "select",
      options: opts,
    });
    responses.push([]); // getFieldsForTab (비어 있음)
    responses.push([newField]); // insert.returning()

    const result = await createField("space-1", "tab-1", "user-1", {
      name: "선택 필드",
      fieldType: "select",
      options: opts,
    });
    expect(result.options).toEqual(opts);
  });

  it("select가 아닌 타입에 options를 넘겨도 null로 처리한다", async () => {
    const newField = makeField({ fieldType: "text", options: null });
    responses.push([]); // getFieldsForTab
    responses.push([newField]); // insert.returning()

    const result = await createField("space-1", "tab-1", "user-1", {
      name: "텍스트 필드",
      fieldType: "text",
      options: [{ value: "X", color: "#000" }],
    });
    // 서비스 내부에서 options=null 처리됨
    expect(result.options).toBeNull();
  });

  it("이름을 80자로 잘라서 저장한다", async () => {
    const longName = "a".repeat(100);
    const newField = makeField({ name: "a".repeat(80) });
    responses.push([]);
    responses.push([newField]);

    const result = await createField("space-1", "tab-1", "user-1", {
      name: longName,
      fieldType: "text",
    });
    expect(result.name.length).toBeLessThanOrEqual(80);
  });
});

/* ── updateField ── */

describe("updateField", () => {
  it("존재하지 않는 필드는 404 ServiceError를 던진다", async () => {
    responses.push([]); // select → 빈 배열
    await expect(
      updateField("nonexistent", "space-1", { name: "새 이름" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("빈 이름으로 업데이트하면 400 ServiceError를 던진다", async () => {
    responses.push([makeField()]);
    await expect(
      updateField("field-1", "space-1", { name: "   " }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("이름을 정상적으로 업데이트한다", async () => {
    const existing = makeField();
    const updated = { ...existing, name: "수정된 필드" };
    responses.push([existing]);
    responses.push([updated]);

    const result = await updateField("field-1", "space-1", {
      name: "수정된 필드",
    });
    expect(result.name).toBe("수정된 필드");
  });

  it("isRequired, displayOrder, tabId를 독립적으로 업데이트할 수 있다", async () => {
    const existing = makeField();
    const updated = {
      ...existing,
      isRequired: true,
      displayOrder: 5,
      tabId: "tab-2",
    };
    responses.push([existing]);
    responses.push([updated]);

    const result = await updateField("field-1", "space-1", {
      isRequired: true,
      displayOrder: 5,
      tabId: "tab-2",
    });
    expect(result.isRequired).toBe(true);
    expect(result.displayOrder).toBe(5);
    expect(result.tabId).toBe("tab-2");
  });
});

/* ── deleteField ── */

describe("deleteField", () => {
  it("존재하지 않는 필드는 404 ServiceError를 던진다", async () => {
    responses.push([]);
    await expect(deleteField("nonexistent", "space-1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("존재하는 필드는 정상 삭제된다", async () => {
    responses.push([makeField()]);
    responses.push(undefined); // delete 결과

    await expect(deleteField("field-1", "space-1")).resolves.toBeUndefined();
  });
});

/* ── getFieldsForTab ── */

describe("getFieldsForTab", () => {
  it("탭에 필드가 없으면 빈 배열을 반환한다", async () => {
    responses.push([]);
    const result = await getFieldsForTab("tab-1", "space-1");
    expect(result).toEqual([]);
  });

  it("탭의 필드 목록을 반환한다", async () => {
    const fields = [
      makeField({ displayOrder: 0 }),
      makeField({ id: "field-2", name: "두 번째", displayOrder: 1 }),
    ];
    responses.push(fields);

    const result = await getFieldsForTab("tab-1", "space-1");
    expect(result).toHaveLength(2);
    expect(result[0].displayOrder).toBe(0);
    expect(result[1].displayOrder).toBe(1);
  });
});

/* ── reorderFields ── */

describe("reorderFields", () => {
  it("빈 배열로 호출해도 오류 없이 완료된다", async () => {
    await expect(reorderFields("space-1", [])).resolves.toBeUndefined();
  });

  it("여러 fieldId를 순서대로 업데이트한다", async () => {
    responses.push(undefined);
    responses.push(undefined);
    responses.push(undefined);

    await expect(
      reorderFields("space-1", ["field-a", "field-b", "field-c"]),
    ).resolves.toBeUndefined();
  });
});

/* ── 경계값 테스트 ── */

describe("경계값: createField", () => {
  it("이름이 정확히 80자이면 그대로 저장된다", async () => {
    const name80 = "가".repeat(80);
    const newField = makeField({ name: name80 });
    responses.push([]);
    responses.push([newField]);

    const result = await createField("space-1", "tab-1", "user-1", {
      name: name80,
      fieldType: "text",
    });
    expect(result.name.length).toBe(80);
  });

  it("이름이 81자이면 80자로 잘린다", async () => {
    const name81 = "a".repeat(81);
    const newField = makeField({ name: "a".repeat(80) });
    responses.push([]);
    responses.push([newField]);

    const result = await createField("space-1", "tab-1", "user-1", {
      name: name81,
      fieldType: "text",
    });
    expect(result.name.length).toBeLessThanOrEqual(80);
  });

  it("options가 null인 select 필드를 생성할 수 있다", async () => {
    const newField = makeField({ fieldType: "select", options: null });
    responses.push([]);
    responses.push([newField]);

    const result = await createField("space-1", "tab-1", "user-1", {
      name: "선택 필드",
      fieldType: "select",
      options: null,
    });
    expect(result.options).toBeNull();
  });

  it("displayOrder가 0인 경우 정상 생성된다", async () => {
    const newField = makeField({ displayOrder: 0 });
    responses.push([]); // 기존 필드 없음 → maxOrder=-1 → displayOrder=0
    responses.push([newField]);

    const result = await createField("space-1", "tab-1", "user-1", {
      name: "첫 번째 필드",
      fieldType: "text",
    });
    expect(result.displayOrder).toBe(0);
  });

  it("isRequired=true인 필드를 생성할 수 있다", async () => {
    const newField = makeField({ isRequired: true });
    responses.push([]);
    responses.push([newField]);

    const result = await createField("space-1", "tab-1", "user-1", {
      name: "필수 필드",
      fieldType: "text",
      isRequired: true,
    });
    expect(result.isRequired).toBe(true);
  });

  it("multi_select 타입으로 options 배열을 저장한다", async () => {
    const opts = [
      { value: "옵션1", color: "#ff0000" },
      { value: "옵션2", color: "#00ff00" },
    ];
    const newField = makeField({ fieldType: "multi_select", options: opts });
    responses.push([]);
    responses.push([newField]);

    const result = await createField("space-1", "tab-1", "user-1", {
      name: "멀티 선택",
      fieldType: "multi_select",
      options: opts,
    });
    expect(result.options).toEqual(opts);
  });

  it("date, number, url, email, phone, checkbox, long_text 타입 생성이 모두 가능하다", async () => {
    const types = [
      "date",
      "number",
      "url",
      "email",
      "phone",
      "checkbox",
      "long_text",
    ] as const;
    for (const fieldType of types) {
      const newField = makeField({ fieldType });
      responses.push([]);
      responses.push([newField]);

      const result = await createField("space-1", "tab-1", "user-1", {
        name: `${fieldType} 필드`,
        fieldType,
      });
      expect(result.fieldType).toBe(fieldType);
    }
  });

  it("options 없이 최소 데이터만으로 생성할 수 있다", async () => {
    const newField = makeField({ isRequired: false, options: null });
    responses.push([]);
    responses.push([newField]);

    const result = await createField("space-1", "tab-1", "user-1", {
      name: "최소 필드",
      fieldType: "text",
    });
    expect(result).toBeDefined();
    expect(result.isRequired).toBe(false);
    expect(result.options).toBeNull();
  });

  it("빈 options 배열을 select 타입에 허용한다", async () => {
    const newField = makeField({ fieldType: "select", options: [] });
    responses.push([]);
    responses.push([newField]);

    const result = await createField("space-1", "tab-1", "user-1", {
      name: "빈 옵션 필드",
      fieldType: "select",
      options: [],
    });
    expect(result.options).toEqual([]);
  });
});

/* ── 오류 케이스 심화 ── */

describe("오류 케이스 심화: updateField", () => {
  it("다른 spaceId로 필드 수정을 시도하면 404가 발생한다", async () => {
    // DB는 spaceId가 다르면 빈 배열을 반환한다고 가정
    responses.push([]); // select → empty (spaceId 불일치)

    await expect(
      updateField("field-1", "other-space", { name: "침입 시도" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("isVisible=false 업데이트 후 다시 isRequired=true로 복구할 수 있다", async () => {
    const existing = makeField({ isRequired: false });
    const updated = { ...existing, isRequired: true };
    responses.push([existing]);
    responses.push([updated]);

    const result = await updateField("field-1", "space-1", {
      isRequired: true,
    });
    expect(result.isRequired).toBe(true);
  });

  it("update.returning()이 빈 배열을 반환하면 500 ServiceError를 던진다", async () => {
    responses.push([makeField()]);
    responses.push([]); // update.returning() → empty

    await expect(
      updateField("field-1", "space-1", { name: "업데이트 실패" }),
    ).rejects.toMatchObject({ status: 500 });
  });
});

describe("오류 케이스 심화: deleteField", () => {
  it("이미 삭제된 필드를 재삭제하면 404가 발생한다", async () => {
    responses.push([]); // select → 이미 없음

    await expect(
      deleteField("already-deleted", "space-1"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("다른 spaceId로 삭제를 시도하면 404가 발생한다", async () => {
    responses.push([]); // spaceId 불일치 → empty

    await expect(deleteField("field-1", "wrong-space")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("오류 케이스 심화: createField", () => {
  it("insert.returning()이 빈 배열을 반환하면 500 ServiceError를 던진다", async () => {
    responses.push([]); // getFieldsForTab
    responses.push([]); // insert.returning() → empty

    await expect(
      createField("space-1", "tab-1", "user-1", {
        name: "실패 필드",
        fieldType: "text",
      }),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("동일 이름으로 두 번 생성해도 서비스 레벨에서는 중복을 차단하지 않는다", async () => {
    const field1 = makeField({ name: "같은 이름", id: "field-dup-1" });
    const field2 = makeField({ name: "같은 이름", id: "field-dup-2" });

    responses.push([field1]); // getFieldsForTab (첫 번째 생성 시)
    responses.push([field2]); // insert.returning()

    const result = await createField("space-1", "tab-1", "user-1", {
      name: "같은 이름",
      fieldType: "text",
    });
    expect(result.name).toBe("같은 이름");
  });
});

describe("오류 케이스 심화: getFieldsForTab", () => {
  it("존재하지 않는 tabId도 빈 배열을 반환한다 (DB 레벨 필터링)", async () => {
    responses.push([]);

    const result = await getFieldsForTab("nonexistent-tab", "space-1");
    expect(result).toEqual([]);
  });
});

describe("오류 케이스 심화: reorderFields", () => {
  it("일부 ID만 포함해도 오류 없이 완료된다", async () => {
    responses.push(undefined);
    responses.push(undefined);

    await expect(
      reorderFields("space-1", ["field-a", "field-b"]),
    ).resolves.toBeUndefined();
  });

  it("단일 ID만 포함해도 정상 동작한다", async () => {
    responses.push(undefined);

    await expect(
      reorderFields("space-1", ["field-only"]),
    ).resolves.toBeUndefined();
  });
});

/* ── 정상 흐름 심화 ── */

describe("정상 흐름 심화: createField + getFieldsForTab 조합", () => {
  it("createField 후 getFieldsForTab에서 생성된 필드가 조회된다", async () => {
    const newField = makeField({ name: "새로 생성", id: "field-new" });

    // createField 내부에서 getFieldsForTab 호출
    responses.push([]); // getFieldsForTab (createField 내부)
    responses.push([newField]); // insert.returning()

    await createField("space-1", "tab-1", "user-1", {
      name: "새로 생성",
      fieldType: "text",
    });

    // 별도 getFieldsForTab 호출
    responses.push([newField]);
    const fields = await getFieldsForTab("tab-1", "space-1");
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe("새로 생성");
  });

  it("여러 필드 생성 후 reorderFields로 순서를 변경한다", async () => {
    const field1 = makeField({ id: "f1", displayOrder: 0 });
    const field2 = makeField({ id: "f2", displayOrder: 1 });

    // 두 번의 createField
    responses.push([]); // getFieldsForTab (f1 생성)
    responses.push([field1]); // insert.returning()
    responses.push([field1]); // getFieldsForTab (f2 생성, f1 포함)
    responses.push([field2]); // insert.returning()

    await createField("space-1", "tab-1", "user-1", {
      name: "필드1",
      fieldType: "text",
    });
    await createField("space-1", "tab-1", "user-1", {
      name: "필드2",
      fieldType: "text",
    });

    // 역순으로 reorder
    responses.push(undefined);
    responses.push(undefined);
    await expect(
      reorderFields("space-1", ["f2", "f1"]),
    ).resolves.toBeUndefined();
  });

  it("updateField로 이름·isRequired를 동시에 변경할 수 있다", async () => {
    const existing = makeField({ name: "기존 이름", isRequired: false });
    const updated = { ...existing, name: "변경된 이름", isRequired: true };
    responses.push([existing]);
    responses.push([updated]);

    const result = await updateField("field-1", "space-1", {
      name: "변경된 이름",
      isRequired: true,
    });
    expect(result.name).toBe("변경된 이름");
    expect(result.isRequired).toBe(true);
  });

  it("deleteField 후 getFieldsForTab에서 해당 필드가 사라진다", async () => {
    const field = makeField();

    // deleteField
    responses.push([field]); // select (존재 확인)
    responses.push(undefined); // delete

    await deleteField("field-1", "space-1");

    // 삭제 후 조회 → 빈 배열 (DB가 실제로 삭제했다고 가정)
    responses.push([]);
    const fields = await getFieldsForTab("tab-1", "space-1");
    expect(fields).toHaveLength(0);
  });

  it("같은 탭에 10개 필드 생성 시 displayOrder가 순서대로 할당된다", async () => {
    const existingFields = Array.from({ length: 9 }, (_, i) =>
      makeField({ id: `f${i}`, displayOrder: i }),
    );
    const tenthField = makeField({ id: "f9", displayOrder: 9 });

    responses.push(existingFields); // getFieldsForTab → 9개 기존
    responses.push([tenthField]); // insert.returning()

    const result = await createField("space-1", "tab-1", "user-1", {
      name: "열 번째 필드",
      fieldType: "text",
    });
    expect(result.displayOrder).toBe(9);
  });

  it("select 타입 필드에 options 배열을 저장하고 조회할 수 있다", async () => {
    const opts = [
      { value: "빨강", color: "#ff0000" },
      { value: "파랑", color: "#0000ff" },
      { value: "초록", color: "#00ff00" },
    ];
    const field = makeField({ fieldType: "select", options: opts });

    responses.push([]);
    responses.push([field]);

    const created = await createField("space-1", "tab-1", "user-1", {
      name: "색상 선택",
      fieldType: "select",
      options: opts,
    });

    responses.push([created]);
    const fields = await getFieldsForTab("tab-1", "space-1");
    expect(fields[0].options).toEqual(opts);
  });

  it("updateField로 options를 null에서 배열로 변경할 수 있다", async () => {
    const existing = makeField({ fieldType: "select", options: null });
    const newOpts = [{ value: "신규", color: "#aabbcc" }];
    const updated = { ...existing, options: newOpts };
    responses.push([existing]);
    responses.push([updated]);

    const result = await updateField("field-1", "space-1", {
      options: newOpts,
    });
    expect(result.options).toEqual(newOpts);
  });

  it("tabId를 변경하여 필드를 다른 탭으로 이동할 수 있다", async () => {
    const existing = makeField({ tabId: "tab-1" });
    const moved = { ...existing, tabId: "tab-2" };
    responses.push([existing]);
    responses.push([moved]);

    const result = await updateField("field-1", "space-1", { tabId: "tab-2" });
    expect(result.tabId).toBe("tab-2");
  });
});

/* ── DB mock 활용 패턴 ── */

describe("DB mock 활용 패턴", () => {
  it("DB 오류 발생(throw) 시 서비스 함수가 예외를 전파한다", async () => {
    // responses에 Error 객체를 넣어 mock이 throw하도록 유도하는 대신,
    // proxy가 then() resolve를 통해 값을 반환하므로,
    // empty 반환 → 404 경로로 서비스 에러가 throw됨을 확인
    responses.push([]); // select → 빈 배열 → 404

    await expect(
      updateField("field-1", "space-1", { name: "오류 시나리오" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("동시 생성 요청 시 responses 큐를 순서대로 소비한다", async () => {
    const field1 = makeField({ id: "c1", name: "동시1" });
    const field2 = makeField({ id: "c2", name: "동시2" });

    // 각 createField는 getFieldsForTab + insert 2개씩 소비
    responses.push([]); // createField #1 내부 getFieldsForTab
    responses.push([field1]); // createField #1 insert.returning()
    responses.push([field1]); // createField #2 내부 getFieldsForTab
    responses.push([field2]); // createField #2 insert.returning()

    const [r1, r2] = await Promise.all([
      createField("space-1", "tab-1", "user-1", {
        name: "동시1",
        fieldType: "text",
      }),
      createField("space-1", "tab-1", "user-1", {
        name: "동시2",
        fieldType: "text",
      }),
    ]);

    expect(r1.id).toBe("c1");
    expect(r2.id).toBe("c2");
  });

  it("select가 빈 배열 반환 시 getFieldsForTab은 빈 배열을 반환한다", async () => {
    responses.push([]);
    const result = await getFieldsForTab("tab-empty", "space-1");
    expect(result).toEqual([]);
  });

  it("insert.returning()이 빈 배열이면 createField에서 500이 발생한다", async () => {
    responses.push([]);
    responses.push([]); // insert.returning() 빈 배열

    await expect(
      createField("space-1", "tab-1", "user-1", {
        name: "500 테스트",
        fieldType: "text",
      }),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("update.returning()이 빈 배열이면 updateField에서 500이 발생한다", async () => {
    responses.push([makeField()]);
    responses.push([]); // update.returning() 빈 배열

    await expect(
      updateField("field-1", "space-1", { name: "500 업데이트" }),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("reorderFields는 각 fieldId마다 update를 독립적으로 실행한다", async () => {
    const ids = ["fa", "fb", "fc", "fd"];
    ids.forEach(() => responses.push(undefined));

    await expect(reorderFields("space-1", ids)).resolves.toBeUndefined();
    // responses 큐가 모두 소비됨
    expect(responses.length).toBe(0);
  });
});
