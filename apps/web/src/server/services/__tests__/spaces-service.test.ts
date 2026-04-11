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
vi.mock("@/server/db/schema", () => ({ spaces: {} }));
vi.mock("drizzle-orm", () => ({
  desc: (col: unknown) => col,
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

import {
  createSpace,
  getSpaces,
  getSpaceById,
} from "../spaces-service";

/* ── 헬퍼 ── */

const makeSpace = (overrides: Record<string, unknown> = {}) => ({
  id: "space-1",
  name: "테스트 스페이스",
  description: null,
  startDate: null,
  endDate: null,
  createdByUserId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  responses.length = 0;
});

/* ── createSpace ── */

describe("createSpace", () => {
  it("빈 이름이면 400 ServiceError를 던진다", async () => {
    await expect(
      createSpace("user-1", { name: "" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("공백만 있는 이름이면 400 ServiceError를 던진다", async () => {
    await expect(
      createSpace("user-1", { name: "   " }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("정상 이름으로 생성에 성공한다", async () => {
    const space = makeSpace({ name: "백엔드 3기" });
    responses.push([space]);

    const result = await createSpace("user-1", { name: "백엔드 3기" });
    expect(result.name).toBe("백엔드 3기");
  });

  it("이름 100자 초과 시 100자로 truncate하여 저장한다", async () => {
    const longName = "a".repeat(120);
    const space = makeSpace({ name: "a".repeat(100) });
    responses.push([space]);

    const result = await createSpace("user-1", { name: longName });
    expect(result.name.length).toBeLessThanOrEqual(100);
  });

  it("description=null을 허용한다", async () => {
    const space = makeSpace({ description: null });
    responses.push([space]);

    const result = await createSpace("user-1", { name: "스페이스", description: null });
    expect(result.description).toBeNull();
  });

  it("description이 공백만이면 null로 저장된다", async () => {
    const space = makeSpace({ description: null });
    responses.push([space]);

    const result = await createSpace("user-1", { name: "스페이스", description: "   " });
    expect(result.description).toBeNull();
  });
});

/* ── getSpaces ── */

describe("getSpaces", () => {
  it("정상 목록을 반환한다", async () => {
    const spaces = [
      makeSpace({ id: "space-1", name: "스페이스 1" }),
      makeSpace({ id: "space-2", name: "스페이스 2" }),
    ];
    responses.push(spaces);

    const result = await getSpaces("user-1");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("스페이스 1");
    expect(result[1].name).toBe("스페이스 2");
  });

  it("목록이 없으면 빈 배열을 반환한다", async () => {
    responses.push([]);

    const result = await getSpaces("user-1");
    expect(result).toEqual([]);
  });
});

/* ── getSpaceById ── */

describe("getSpaceById", () => {
  it("존재하지 않는 spaceId이면 404 ServiceError를 던진다", async () => {
    responses.push([]);

    await expect(
      getSpaceById("nonexistent"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("존재하는 space를 정상 반환한다", async () => {
    const space = makeSpace({ id: "space-1", name: "백엔드 3기" });
    responses.push([space]);

    const result = await getSpaceById("space-1");
    expect(result.id).toBe("space-1");
    expect(result.name).toBe("백엔드 3기");
  });

  it("존재하지 않으면 \"스페이스를 찾지 못했습니다.\" 메시지를 포함한다", async () => {
    responses.push([]);

    await expect(
      getSpaceById("nonexistent"),
    ).rejects.toMatchObject({ message: "스페이스를 찾지 못했습니다." });
  });
});
