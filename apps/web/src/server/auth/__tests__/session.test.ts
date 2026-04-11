import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateAuthRandomToken = vi.fn();
const mockHashAuthToken = vi.fn();
const mockToAuthUserDto = vi.fn();
const mockCookies = vi.fn();

const { dbResponses, dbChain } = vi.hoisted(() => {
  const dbResponses: unknown[] = [];
  const proxy: unknown = new Proxy({} as Record<string | symbol, unknown>, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (value: unknown) => void) =>
          Promise.resolve(dbResponses.shift() ?? []).then(resolve);
      }
      if (prop === "catch" || prop === "finally") return undefined;
      return () => proxy;
    },
  });
  return { dbResponses, dbChain: proxy };
});

vi.mock("@/server/db", () => ({ getDb: () => dbChain }));
vi.mock("@/server/db/schema", () => ({
  authSessions: {
    id: "id",
    sessionTokenHash: "sessionTokenHash",
    userId: "userId",
  },
  userIdentities: { userId: "userId" },
  users: { id: "id" },
}));
vi.mock("drizzle-orm", () => ({
  eq: (left: unknown, right: unknown) => ({ left, right }),
}));
vi.mock("@/server/auth/crypto", () => ({
  createAuthRandomToken: (...args: unknown[]) =>
    mockCreateAuthRandomToken(...args),
  hashAuthToken: (...args: unknown[]) => mockHashAuthToken(...args),
}));
vi.mock("@/server/auth/auth-user", () => ({
  toAuthUserDto: (...args: unknown[]) => mockToAuthUserDto(...args),
}));
vi.mock("next/headers", () => ({
  cookies: (...args: unknown[]) => mockCookies(...args),
}));

import {
  applyAuthSessionCookie,
  clearAuthSessionCookie,
  createAuthSession,
  deleteCurrentAuthSession,
  getAuthUserBySessionToken,
} from "../session";

describe("auth session service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbResponses.length = 0;
    mockCreateAuthRandomToken.mockReturnValue("session-token");
    mockHashAuthToken.mockImplementation((value: string) => `hashed:${value}`);
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });
  });

  it("createAuthSession은 해시된 토큰을 저장하고 토큰/만료시각을 반환한다", async () => {
    dbResponses.push(undefined);

    const result = await createAuthSession("user-1");

    expect(result.sessionToken).toBe("session-token");
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(mockHashAuthToken).toHaveBeenCalledWith("session-token");
  });

  it("getAuthUserBySessionToken은 만료된 세션이면 null을 반환한다", async () => {
    dbResponses.push([
      {
        id: "session-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() - 1_000),
      },
    ]);
    dbResponses.push(undefined);

    await expect(
      getAuthUserBySessionToken("expired-token"),
    ).resolves.toBeNull();
  });

  it("유저가 없으면 세션을 지우고 null을 반환한다", async () => {
    dbResponses.push([
      {
        id: "session-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    dbResponses.push([]);
    dbResponses.push(undefined);

    await expect(getAuthUserBySessionToken("orphan-token")).resolves.toBeNull();
  });

  it("identity가 없으면 세션을 지우고 null을 반환한다", async () => {
    dbResponses.push([
      {
        id: "session-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    dbResponses.push([{ id: "user-1" }]);
    dbResponses.push([]);
    dbResponses.push(undefined);

    await expect(
      getAuthUserBySessionToken("no-identity-token"),
    ).resolves.toBeNull();
  });

  it("정상 세션이면 lastAccessedAt을 갱신하고 DTO를 반환한다", async () => {
    mockToAuthUserDto.mockReturnValue({ id: "user-1", providers: ["google"] });
    dbResponses.push([
      {
        id: "session-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    dbResponses.push([{ id: "user-1", email: "user@yeon.world" }]);
    dbResponses.push([{ id: "identity-1", provider: "google" }]);
    dbResponses.push(undefined);

    await expect(getAuthUserBySessionToken("valid-token")).resolves.toEqual({
      id: "user-1",
      providers: ["google"],
    });
    expect(mockToAuthUserDto).toHaveBeenCalledTimes(1);
  });

  it("deleteCurrentAuthSession은 현재 쿠키 토큰이 없으면 아무것도 하지 않는다", async () => {
    await expect(deleteCurrentAuthSession()).resolves.toBeUndefined();
  });

  it("apply/clearAuthSessionCookie는 쿠키를 설정한다", () => {
    const response = NextResponse.json({ ok: true });
    const expiresAt = new Date(Date.now() + 60_000);

    applyAuthSessionCookie(response, {
      sessionToken: "session-token",
      expiresAt,
    });
    clearAuthSessionCookie(response);

    expect(response.cookies.get("yeon.session")?.value).toBe("");
  });
});
