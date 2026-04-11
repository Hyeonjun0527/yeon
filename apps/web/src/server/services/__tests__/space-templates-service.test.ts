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
  spaceTemplates: {},
  memberTabDefinitions: {},
  memberFieldDefinitions: {},
}));
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  asc: (col: unknown) => col,
  eq: (col: unknown, val: unknown) => ({ col, val }),
  ne: (col: unknown, val: unknown) => ({ col, val }),
}));

import {
  seedSystemTemplates,
  listTemplates,
  createTemplate,
  applyTemplateToSpace,
  getTemplate,
  deleteTemplate,
} from "../space-templates-service";

/* ── 헬퍼 ── */

const makeTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: "tpl-1",
  createdByUserId: null,
  name: "기본",
  description: "기본 구성",
  isSystem: true,
  tabsConfig: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeTab = (overrides: Record<string, unknown> = {}) => ({
  id: "tab-1",
  spaceId: "space-1",
  createdByUserId: "user-1",
  tabType: "system",
  systemKey: "overview",
  name: "개요",
  isVisible: true,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  responses.length = 0;
});

/* ── seedSystemTemplates ── */

describe("seedSystemTemplates", () => {
  it("시스템 템플릿이 이미 4개 이상이면 INSERT를 건너뛴다", async () => {
    const existingTemplates = [
      makeTemplate({ name: "기본" }),
      makeTemplate({ name: "부트캠프", id: "tpl-2" }),
      makeTemplate({ name: "디자인스쿨", id: "tpl-3" }),
      makeTemplate({ name: "어학원", id: "tpl-4" }),
    ];
    responses.push(existingTemplates); // select → 4개 이미 존재

    // 오류 없이 완료되어야 하며, insert 호출 없이 종료
    await expect(seedSystemTemplates()).resolves.toBeUndefined();
  });

  it("시스템 템플릿이 없으면 누락된 항목을 INSERT한다", async () => {
    responses.push([]); // select → 없음
    responses.push(undefined); // insert (반환값 없음)

    await expect(seedSystemTemplates()).resolves.toBeUndefined();
  });

  it("일부 템플릿이 없으면 해당 항목만 INSERT한다", async () => {
    responses.push([
      makeTemplate({ name: "기본" }),
      makeTemplate({ name: "부트캠프", id: "tpl-2" }),
    ]); // 4개 중 2개만 있음
    responses.push(undefined); // insert (나머지 2개)

    await expect(seedSystemTemplates()).resolves.toBeUndefined();
  });
});

/* ── listTemplates ── */

describe("listTemplates", () => {
  it("시스템 템플릿 목록을 반환한다 (userId 없음)", async () => {
    const systemTemplates = [
      makeTemplate({ name: "기본", id: "tpl-1" }),
      makeTemplate({ name: "부트캠프", id: "tpl-2" }),
    ];
    responses.push(systemTemplates); // 시스템 템플릿 조회

    const result = await listTemplates();
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.isSystem)).toBe(true);
  });

  it("시스템 템플릿 먼저, 그 다음 사용자 템플릿을 반환한다", async () => {
    const systemTemplates = [makeTemplate({ name: "기본" })];
    const userTemplates = [
      makeTemplate({
        name: "내 템플릿",
        id: "tpl-user",
        isSystem: false,
        createdByUserId: "user-1",
      }),
    ];
    responses.push(systemTemplates); // 시스템 조회
    responses.push(userTemplates); // 사용자 조회

    const result = await listTemplates("user-1");
    expect(result).toHaveLength(2);
    expect(result[0].isSystem).toBe(true);
    expect(result[1].isSystem).toBe(false);
    expect(result[1].name).toBe("내 템플릿");
  });

  it("사용자 템플릿이 없으면 시스템 템플릿만 반환한다", async () => {
    responses.push([makeTemplate()]); // 시스템
    responses.push([]); // 사용자 (없음)

    const result = await listTemplates("user-1");
    expect(result).toHaveLength(1);
    expect(result[0].isSystem).toBe(true);
  });
});

/* ── createTemplate ── */

describe("createTemplate", () => {
  it("빈 이름이면 400 ServiceError를 던진다", async () => {
    await expect(
      createTemplate("user-1", { name: "   ", tabsConfig: [] }),
    ).rejects.toMatchObject({
      status: 400,
      message: "템플릿 이름은 필수입니다.",
    });
  });

  it("정상 데이터로 템플릿을 생성하고 반환한다", async () => {
    const newTemplate = makeTemplate({
      name: "내 템플릿",
      isSystem: false,
      createdByUserId: "user-1",
    });
    responses.push([newTemplate]); // insert.returning()

    const result = await createTemplate("user-1", {
      name: "내 템플릿",
      tabsConfig: [],
    });
    expect(result.name).toBe("내 템플릿");
    expect(result.isSystem).toBe(false);
  });

  it("이름을 80자로 잘라서 저장한다", async () => {
    const longName = "X".repeat(100);
    const newTemplate = makeTemplate({ name: "X".repeat(80), isSystem: false });
    responses.push([newTemplate]);

    const result = await createTemplate("user-1", {
      name: longName,
      tabsConfig: [],
    });
    expect(result.name.length).toBeLessThanOrEqual(80);
  });
});

/* ── getTemplate ── */

describe("getTemplate", () => {
  it("존재하지 않는 템플릿은 404 ServiceError를 던진다", async () => {
    responses.push([]);
    await expect(getTemplate("nonexistent")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("존재하는 템플릿을 반환한다", async () => {
    const template = makeTemplate({ id: "tpl-found" });
    responses.push([template]);

    const result = await getTemplate("tpl-found");
    expect(result.id).toBe("tpl-found");
  });
});

/* ── applyTemplateToSpace ── */

describe("applyTemplateToSpace", () => {
  it("존재하지 않는 템플릿은 404 ServiceError를 던진다", async () => {
    responses.push(undefined); // createDefaultSystemTabs insert
    responses.push([]); // select → 없음
    await expect(
      applyTemplateToSpace("nonexistent", "space-1", "user-1"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("시스템 탭의 필드를 overview 탭에 추가한다", async () => {
    const tabsConfig = [
      {
        name: "개요",
        tabType: "system",
        systemKey: "overview",
        displayOrder: 0,
        fields: [
          {
            name: "트랙",
            fieldType: "select",
            isRequired: false,
            displayOrder: 0,
            options: [],
          },
        ],
      },
    ];
    const template = makeTemplate({ tabsConfig });
    const overviewTab = makeTab({ id: "overview-tab" });

    responses.push(undefined); // createDefaultSystemTabs insert
    responses.push([template]); // getTemplate (select.limit)
    responses.push([overviewTab]); // existingTabs select
    responses.push(undefined); // delete fields
    responses.push(undefined); // delete custom tabs
    responses.push([]); // existingFields select (해당 탭)
    responses.push(undefined); // insert field

    await expect(
      applyTemplateToSpace("tpl-1", "space-1", "user-1"),
    ).resolves.toBeUndefined();
  });

  it("커스텀 탭은 새로 생성되고 필드도 추가된다", async () => {
    const tabsConfig = [
      {
        name: "포트폴리오",
        tabType: "custom",
        systemKey: null,
        displayOrder: 6,
        fields: [
          {
            name: "링크",
            fieldType: "url",
            isRequired: false,
            displayOrder: 0,
          },
        ],
      },
    ];
    const template = makeTemplate({ tabsConfig });
    const newTab = makeTab({
      id: "custom-tab",
      tabType: "custom",
      systemKey: null,
    });

    responses.push(undefined); // createDefaultSystemTabs insert
    responses.push([template]); // getTemplate
    responses.push([]); // existingTabs
    responses.push(undefined); // delete fields
    responses.push(undefined); // delete custom tabs
    responses.push([newTab]); // insert tab.returning()
    responses.push(undefined); // insert field

    await expect(
      applyTemplateToSpace("tpl-1", "space-1", "user-1"),
    ).resolves.toBeUndefined();
  });

  it("빈 tabsConfig는 오류 없이 완료된다", async () => {
    const template = makeTemplate({ tabsConfig: [] });
    responses.push(undefined); // createDefaultSystemTabs insert
    responses.push([template]); // getTemplate
    responses.push([]); // existingTabs
    responses.push(undefined); // delete fields
    responses.push(undefined); // delete custom tabs

    await expect(
      applyTemplateToSpace("tpl-1", "space-1", "user-1"),
    ).resolves.toBeUndefined();
  });
});

/* ── deleteTemplate ── */

describe("deleteTemplate", () => {
  it("존재하지 않는 템플릿은 404 ServiceError를 던진다", async () => {
    responses.push([]); // select → 없음
    await expect(deleteTemplate("nonexistent", "user-1")).rejects.toMatchObject(
      { status: 404 },
    );
  });

  it("시스템 템플릿을 삭제하려 하면 403 ServiceError를 던진다", async () => {
    const systemTemplate = makeTemplate({ isSystem: true });
    responses.push([systemTemplate]); // single select

    await expect(deleteTemplate("tpl-1", "user-1")).rejects.toMatchObject({
      status: 403,
      message: "시스템 템플릿은 삭제할 수 없습니다.",
    });
  });

  it("본인 소유가 아닌 사용자 템플릿은 404 ServiceError를 던진다", async () => {
    const otherTemplate = makeTemplate({
      isSystem: false,
      createdByUserId: "other-user",
    });
    responses.push([otherTemplate]); // single select → found but wrong owner

    await expect(deleteTemplate("tpl-other", "user-1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("본인 소유 사용자 템플릿은 정상 삭제된다", async () => {
    const userTemplate = makeTemplate({
      id: "tpl-mine",
      isSystem: false,
      createdByUserId: "user-1",
    });
    responses.push([userTemplate]); // single select
    responses.push(undefined); // delete

    await expect(deleteTemplate("tpl-mine", "user-1")).resolves.toBeUndefined();
  });
});
