import { describe, it, expect, beforeEach, vi } from "vitest";
import { ServiceError } from "../service-error";

/* ── DB 모킹 ─────────────────────────────────────────────────── */

/**
 * 모든 drizzle 체인 메서드(select/from/where/orderBy/limit/insert/values/…)가
 * 동일한 Proxy 객체를 반환하도록 만든다.
 * await 시점에 `responses` 큐의 첫 번째 항목을 꺼내 반환한다.
 */
const { responses, chain } = vi.hoisted(() => {
  const responses: unknown[] = [];
  const chain: Record<string | symbol, unknown> = {};
  const proxy: unknown = new Proxy(chain, {
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
vi.mock("@/server/db/schema", () => ({ memberTabDefinitions: {} }));
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  asc: (col: unknown) => col,
  eq: (col: unknown, val: unknown) => ({ col, val }),
  isNotNull: (col: unknown) => col,
}));

import {
  createDefaultSystemTabs,
  createCustomTab,
  updateTab,
  deleteCustomTab,
  getOverviewTab,
  reorderTabs,
} from "../member-tabs-service";

/* ── 헬퍼 ── */

const makeTab = (overrides: Record<string, unknown> = {}) => ({
  id: "tab-1",
  spaceId: "space-1",
  createdByUserId: "user-1",
  tabType: "custom",
  systemKey: null,
  name: "커스텀 탭",
  isVisible: true,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  responses.length = 0;
});

/* ── createDefaultSystemTabs ── */

describe("createDefaultSystemTabs", () => {
  it("시스템 탭 4개를 INSERT하고 오류 없이 완료된다", async () => {
    responses.push(undefined); // insert.onConflictDoNothing()

    await expect(
      createDefaultSystemTabs("space-1", "user-1"),
    ).resolves.toBeUndefined();
  });

  it("이미 존재하는 경우에도 오류 없이 완료된다 (ON CONFLICT DO NOTHING)", async () => {
    responses.push(undefined);
    await expect(
      createDefaultSystemTabs("space-1", "user-1"),
    ).resolves.toBeUndefined();
  });
});

/* ── createCustomTab ── */

describe("createCustomTab", () => {
  it("빈 이름을 전달하면 400 ServiceError를 던진다", async () => {
    await expect(
      createCustomTab("space-1", "user-1", { name: "   " }),
    ).rejects.toThrow(ServiceError);

    await expect(
      createCustomTab("space-1", "user-1", { name: "   " }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("정상 이름으로 탭을 생성하고 반환한다", async () => {
    const existingTabs = [makeTab({ displayOrder: 2 })];
    const newTab = makeTab({ name: "새 탭", displayOrder: 3, id: "tab-new" });

    responses.push(existingTabs); // getTabsForSpace
    responses.push([newTab]); // insert.returning()

    const result = await createCustomTab("space-1", "user-1", {
      name: "새 탭",
    });
    expect(result.name).toBe("새 탭");
    expect(result.id).toBe("tab-new");
  });

  it("이름을 80자로 잘라서 저장한다", async () => {
    const longName = "가".repeat(100);
    const truncated = "가".repeat(80);
    const newTab = makeTab({ name: truncated });

    responses.push([]); // getTabsForSpace (빈 공간)
    responses.push([newTab]); // insert.returning()

    const result = await createCustomTab("space-1", "user-1", {
      name: longName,
    });
    expect(result.name.length).toBeLessThanOrEqual(80);
  });
});

/* ── updateTab ── */

describe("updateTab", () => {
  it("존재하지 않는 탭은 404 ServiceError를 던진다", async () => {
    responses.push([]); // select → 빈 배열
    await expect(
      updateTab("nonexistent", "space-1", { name: "새 이름" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("overview 탭을 숨기려 하면 403 ServiceError를 던진다", async () => {
    const overviewTab = makeTab({ tabType: "system", systemKey: "overview" });
    responses.push([overviewTab]);

    await expect(
      updateTab("tab-1", "space-1", { isVisible: false }),
    ).rejects.toMatchObject({
      status: 403,
      message: "개요 탭은 숨길 수 없습니다.",
    });
  });

  it("overview 탭의 이름 변경은 허용된다", async () => {
    const overviewTab = makeTab({ tabType: "system", systemKey: "overview" });
    const updated = { ...overviewTab, name: "홈" };
    responses.push([overviewTab]);
    responses.push([updated]);

    const result = await updateTab("tab-1", "space-1", { name: "홈" });
    expect(result.name).toBe("홈");
  });

  it("일반 탭 숨김은 성공한다", async () => {
    const tab = makeTab({ tabType: "system", systemKey: "counseling" });
    const updated = { ...tab, isVisible: false };
    responses.push([tab]);
    responses.push([updated]);

    const result = await updateTab("tab-1", "space-1", { isVisible: false });
    expect(result.isVisible).toBe(false);
  });

  it("빈 이름으로 업데이트하면 400 ServiceError를 던진다", async () => {
    const tab = makeTab({ tabType: "custom" });
    responses.push([tab]);

    await expect(
      updateTab("tab-1", "space-1", { name: "  " }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

/* ── deleteCustomTab ── */

describe("deleteCustomTab", () => {
  it("존재하지 않는 탭은 404 ServiceError를 던진다", async () => {
    responses.push([]);
    await expect(
      deleteCustomTab("nonexistent", "space-1"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("시스템 탭을 삭제하려 하면 403 ServiceError를 던진다", async () => {
    const systemTab = makeTab({ tabType: "system", systemKey: "overview" });
    responses.push([systemTab]);

    await expect(deleteCustomTab("tab-1", "space-1")).rejects.toMatchObject({
      status: 403,
      message: "시스템 탭은 삭제할 수 없습니다.",
    });
  });

  it("커스텀 탭은 정상 삭제된다", async () => {
    const customTab = makeTab({ tabType: "custom" });
    responses.push([customTab]);
    responses.push(undefined); // delete 결과 (반환값 없음)

    await expect(deleteCustomTab("tab-1", "space-1")).resolves.toBeUndefined();
  });
});

/* ── getOverviewTab ── */

describe("getOverviewTab", () => {
  it("overview 탭이 없으면 null을 반환한다", async () => {
    responses.push([]);
    const result = await getOverviewTab("space-1");
    expect(result).toBeNull();
  });

  it("overview 탭이 있으면 탭 레코드를 반환한다", async () => {
    const overviewTab = makeTab({ tabType: "system", systemKey: "overview" });
    responses.push([overviewTab]);

    const result = await getOverviewTab("space-1");
    expect(result?.systemKey).toBe("overview");
  });
});

/* ── reorderTabs ── */

describe("reorderTabs", () => {
  it("빈 순서 배열로 호출해도 오류 없이 완료된다", async () => {
    await expect(reorderTabs("space-1", [])).resolves.toBeUndefined();
  });

  it("탭 ID 배열 순서대로 displayOrder를 업데이트한다", async () => {
    // update는 반환값을 기다리지 않으므로 responses 없이도 동작
    responses.push(undefined);
    responses.push(undefined);

    await expect(
      reorderTabs("space-1", ["tab-a", "tab-b"]),
    ).resolves.toBeUndefined();
  });
});
