import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAuthUserBySessionToken = vi.fn();
const mockDeleteAuthSessionByToken = vi.fn();
const mockClearAuthSessionCookie = vi.fn();

vi.mock("@/server/auth/session", () => ({
  getAuthUserBySessionToken: (...args: unknown[]) =>
    mockGetAuthUserBySessionToken(...args),
  deleteAuthSessionByToken: (...args: unknown[]) =>
    mockDeleteAuthSessionByToken(...args),
  clearAuthSessionCookie: (...args: unknown[]) =>
    mockClearAuthSessionCookie(...args),
}));

import { DELETE, GET } from "../route";

describe("api/v1/auth/session route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClearAuthSessionCookie.mockImplementation(
      (response: Response) => response,
    );
  });

  it("GET은 세션이 없으면 unauthenticated payload를 반환한다", async () => {
    const request = new NextRequest("http://localhost/api/v1/auth/session");

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      authenticated: false,
      user: null,
    });
  });

  it("GET은 세션이 있지만 사용자 조회 실패면 쿠키 정리를 요청한다", async () => {
    mockGetAuthUserBySessionToken.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/v1/auth/session", {
      headers: { cookie: "yeon.session=stale-token" },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockClearAuthSessionCookie).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({
      authenticated: false,
      user: null,
    });
  });

  it("DELETE는 세션 토큰이 있으면 삭제 후 쿠키 정리를 요청한다", async () => {
    const request = new NextRequest("http://localhost/api/v1/auth/session", {
      method: "DELETE",
      headers: { cookie: "yeon.session=valid-token" },
    });

    const response = await DELETE(request);

    expect(mockDeleteAuthSessionByToken).toHaveBeenCalledWith("valid-token");
    expect(mockClearAuthSessionCookie).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({
      authenticated: false,
      user: null,
    });
  });

  it("DELETE는 삭제 중 예외가 나면 500을 반환한다", async () => {
    mockDeleteAuthSessionByToken.mockRejectedValue(new Error("db error"));
    const request = new NextRequest("http://localhost/api/v1/auth/session", {
      method: "DELETE",
      headers: { cookie: "yeon.session=valid-token" },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "로그아웃을 처리하지 못했습니다.",
    });
  });
});
