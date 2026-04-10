import { describe, it, expect, beforeEach, vi } from "vitest";
import { DatabaseError } from "pg";

/* ── Repository 모킹 ── */

const mockFindUserRowByEmail = vi.fn();
const mockInsertUserRow = vi.fn();
const mockListUserRows = vi.fn();

vi.mock("@/server/repositories/users-repository", () => ({
  findUserRowByEmail: (...args: unknown[]) => mockFindUserRowByEmail(...args),
  insertUserRow: (...args: unknown[]) => mockInsertUserRow(...args),
  listUserRows: (...args: unknown[]) => mockListUserRows(...args),
}));

vi.mock("@yeon/api-contract/users", () => ({
  userDtoSchema: {
    parse: (v: unknown) => v,
  },
}));

import { createUser } from "../users-service";

/* ── 헬퍼 ── */

const makeUserRow = (overrides: Record<string, unknown> = {}) => ({
  id: "user-1",
  email: "test@example.com",
  displayName: "테스터",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

/* ── createUser ── */

describe("createUser", () => {
  it("email을 소문자로 정규화하여 중복 조회한다 (대소문자 혼합 입력)", async () => {
    // "USER@Example.COM" → 내부적으로 "user@example.com"으로 변환 후 조회
    mockFindUserRowByEmail.mockResolvedValue(null);
    const created = makeUserRow({ email: "user@example.com" });
    mockInsertUserRow.mockResolvedValue(created);

    await createUser({ email: "USER@Example.COM", displayName: "테스터" });

    expect(mockFindUserRowByEmail).toHaveBeenCalledWith("user@example.com");
  });

  it("이미 존재하는 이메일이면 409 ServiceError를 던진다", async () => {
    mockFindUserRowByEmail.mockResolvedValue(makeUserRow());

    await expect(
      createUser({ email: "existing@example.com", displayName: "중복" }),
    ).rejects.toMatchObject({ status: 409, message: "이미 등록된 이메일입니다." });
  });

  it("insert 시 pg unique 충돌(23505) race condition → 409 ServiceError로 변환한다", async () => {
    // findUserRowByEmail은 null 반환 (사전 체크 통과),
    // 그러나 실제 INSERT 시 unique 제약 위반 — race condition 시나리오
    mockFindUserRowByEmail.mockResolvedValue(null);

    const pgError = new DatabaseError("unique constraint", 0, "error");
    pgError.code = "23505";
    mockInsertUserRow.mockRejectedValue(pgError);

    await expect(
      createUser({ email: "race@example.com", displayName: "경합" }),
    ).rejects.toMatchObject({ status: 409, message: "이미 등록된 이메일입니다." });
  });
});
