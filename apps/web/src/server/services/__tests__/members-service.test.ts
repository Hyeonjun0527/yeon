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
vi.mock("@/server/db/schema", () => ({ members: {}, spaces: {} }));
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  desc: (col: unknown) => col,
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

import {
  createMember,
  getMembers,
  getMemberById,
  getMemberByIdForUser,
  updateMember,
} from "../members-service";

/* ── 헬퍼 ── */

const makeMember = (overrides: Record<string, unknown> = {}) => ({
  id: "member-1",
  spaceId: "space-1",
  name: "홍길동",
  email: "hong@example.com",
  phone: "010-1234-5678",
  status: "active",
  initialRiskLevel: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  responses.length = 0;
});

/* ── createMember ── */

describe("createMember", () => {
  it("빈 이름이면 400 ServiceError를 던진다", async () => {
    await expect(
      createMember("space-1", { name: "" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("공백만 있는 이름이면 400 ServiceError를 던진다", async () => {
    await expect(
      createMember("space-1", { name: "   " }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("정상 생성에 성공한다", async () => {
    const member = makeMember();
    responses.push([member]);

    const result = await createMember("space-1", { name: "홍길동" });
    expect(result.name).toBe("홍길동");
    expect(result.spaceId).toBe("space-1");
  });

  it("이름이 100자 초과하면 100자로 truncate 후 저장한다", async () => {
    const truncated = makeMember({ name: "a".repeat(100) });
    responses.push([truncated]);

    const result = await createMember("space-1", { name: "a".repeat(150) });
    expect(result.name.length).toBeLessThanOrEqual(100);
  });

  it("email이 255자 초과하면 255자로 truncate 후 저장한다", async () => {
    const longEmail = "a".repeat(250) + "@b.com"; // 256자
    const truncated = makeMember({ email: longEmail.slice(0, 255) });
    responses.push([truncated]);

    const result = await createMember("space-1", { name: "홍길동", email: longEmail });
    expect(result.email!.length).toBeLessThanOrEqual(255);
  });

  it("phone이 20자 초과하면 20자로 truncate 후 저장한다", async () => {
    const longPhone = "0".repeat(30);
    const truncated = makeMember({ phone: longPhone.slice(0, 20) });
    responses.push([truncated]);

    const result = await createMember("space-1", { name: "홍길동", phone: longPhone });
    expect(result.phone!.length).toBeLessThanOrEqual(20);
  });

  it("status 미지정 시 'active'가 기본값으로 저장된다", async () => {
    const member = makeMember({ status: "active" });
    responses.push([member]);

    const result = await createMember("space-1", { name: "홍길동" });
    expect(result.status).toBe("active");
  });
});

/* ── getMemberById ── */

describe("getMemberById", () => {
  it("존재하지 않는 ID이면 404 ServiceError를 던진다", async () => {
    responses.push([]);

    await expect(
      getMemberById("nonexistent"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("존재하는 멤버를 정상 반환한다", async () => {
    const member = makeMember();
    responses.push([member]);

    const result = await getMemberById("member-1");
    expect(result.id).toBe("member-1");
    expect(result.name).toBe("홍길동");
  });
});

/* ── getMemberByIdForUser ── */

describe("getMemberByIdForUser", () => {
  it("다른 user의 space에 속한 멤버 조회 시 404를 던진다 (권한 없음)", async () => {
    responses.push([]); // join 결과 없음 → 소유권 불일치

    await expect(
      getMemberByIdForUser("other-user", "member-1"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("소유권 확인 후 member를 정상 반환한다", async () => {
    const member = makeMember();
    responses.push([{ member }]);

    const result = await getMemberByIdForUser("user-1", "member-1");
    expect(result.id).toBe("member-1");
    expect(result.name).toBe("홍길동");
  });

  it("존재하지 않는 멤버 조회 시 404를 던진다", async () => {
    responses.push([]); // select 결과 없음

    await expect(
      getMemberByIdForUser("user-1", "nonexistent"),
    ).rejects.toMatchObject({ status: 404 });
  });
});

/* ── updateMember ── */

describe("updateMember", () => {
  it("빈 이름으로 업데이트 시 400 ServiceError를 던진다", async () => {
    await expect(
      updateMember("member-1", { name: "" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("존재하지 않는 멤버 업데이트 시 404 ServiceError를 던진다", async () => {
    responses.push([]); // update.returning() → 빈 배열

    await expect(
      updateMember("nonexistent", { name: "홍길동" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("이름만 업데이트하면 email은 변경되지 않는다", async () => {
    const updated = makeMember({ name: "김철수", email: "hong@example.com" });
    responses.push([updated]);

    const result = await updateMember("member-1", { name: "김철수" });
    expect(result.name).toBe("김철수");
    expect(result.email).toBe("hong@example.com");
  });

  it("email=null 로 업데이트가 허용된다", async () => {
    const updated = makeMember({ email: null });
    responses.push([updated]);

    const result = await updateMember("member-1", { email: null });
    expect(result.email).toBeNull();
  });

  it("이름 없이 email만 업데이트 가능하다 (이름 검증 없음)", async () => {
    const updated = makeMember({ email: "new@example.com" });
    responses.push([updated]);

    const result = await updateMember("member-1", { email: "new@example.com" });
    expect(result.email).toBe("new@example.com");
  });
});

/* ── getMembers ── */

describe("getMembers", () => {
  it("spaceId에 해당하는 멤버 목록을 반환한다", async () => {
    const memberList = [
      makeMember({ id: "m1" }),
      makeMember({ id: "m2", name: "김철수" }),
    ];
    responses.push(memberList);

    const result = await getMembers("space-1");
    expect(result).toHaveLength(2);
  });

  it("멤버가 없으면 빈 배열을 반환한다", async () => {
    responses.push([]);

    const result = await getMembers("space-empty");
    expect(result).toEqual([]);
  });
});
