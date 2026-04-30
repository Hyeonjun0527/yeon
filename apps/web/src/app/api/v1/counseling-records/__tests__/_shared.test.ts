import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/server/services/service-error";

const mockGetAuthUserBySessionToken = vi.fn();
const mockClearAuthSessionCookie = vi.fn();
const mockCaptureException = vi.fn();

vi.mock("@/server/auth/session", () => ({
  getAuthUserBySessionToken: (...args: unknown[]) =>
    mockGetAuthUserBySessionToken(...args),
  clearAuthSessionCookie: (...args: unknown[]) =>
    mockClearAuthSessionCookie(...args),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

import { jsonError, requireAuthenticatedUser, withHandler } from "../_shared";

describe("counseling-records api shared helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClearAuthSessionCookie.mockImplementation(
      (response: Response) => response,
    );
  });

  it("jsonError는 표준 에러 payload와 status를 반환한다", async () => {
    const response = jsonError("실패", 400);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "실패" });
  });

  it("withHandler는 ServiceError를 그대로 응답으로 변환한다", async () => {
    const response = await withHandler(async () => {
      throw new ServiceError(403, "권한 없음");
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: "권한 없음" });
  });

  it("withHandler는 일반 예외를 Sentry에 보고하고 500을 반환한다", async () => {
    const error = new Error("boom");
    const response = await withHandler(async () => {
      throw error;
    });

    expect(response.status).toBe(500);
    expect(mockCaptureException).toHaveBeenCalledWith(error);
    await expect(response.json()).resolves.toEqual({
      message: "서버 오류가 발생했습니다.",
    });
  });

  it("requireAuthenticatedUser는 세션이 없으면 401을 반환한다", async () => {
    const request = new NextRequest(
      "http://localhost/api/v1/counseling-records",
    );

    const result = await requireAuthenticatedUser(request);

    expect(result.currentUser).toBeNull();
    expect(result.response?.status).toBe(401);
    expect(mockClearAuthSessionCookie).not.toHaveBeenCalled();
  });

  it("세션 쿠키는 있지만 사용자 조회 실패면 쿠키 정리를 요청한다", async () => {
    mockGetAuthUserBySessionToken.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/v1/counseling-records",
      {
        headers: {
          cookie: "yeon.session=stale-token",
        },
      },
    );

    const result = await requireAuthenticatedUser(request);

    expect(result.currentUser).toBeNull();
    expect(result.response?.status).toBe(401);
    expect(mockClearAuthSessionCookie).toHaveBeenCalledTimes(1);
  });

  it("유효한 세션이면 currentUser를 반환한다", async () => {
    mockGetAuthUserBySessionToken.mockResolvedValue({ id: "user-1" });

    const request = new NextRequest(
      "http://localhost/api/v1/counseling-records",
      {
        headers: {
          cookie: "yeon.session=valid-token",
        },
      },
    );

    const result = await requireAuthenticatedUser(request);

    expect(mockGetAuthUserBySessionToken).toHaveBeenCalledWith("valid-token");
    expect(result.currentUser).toEqual({ id: "user-1" });
    expect(result.response).toBeNull();
  });

  it("bearer 세션이 쿠키보다 우선하고 유효하면 currentUser를 반환한다", async () => {
    mockGetAuthUserBySessionToken.mockResolvedValue({ id: "user-1" });

    const request = new NextRequest(
      "http://localhost/api/v1/counseling-records",
      {
        headers: {
          authorization: "Bearer bearer-token",
          cookie: "yeon.session=cookie-token",
        },
      },
    );

    const result = await requireAuthenticatedUser(request);

    expect(mockGetAuthUserBySessionToken).toHaveBeenCalledWith("bearer-token");
    expect(mockClearAuthSessionCookie).not.toHaveBeenCalled();
    expect(result.currentUser).toEqual({ id: "user-1" });
    expect(result.response).toBeNull();
  });

  it("bearer 세션이 stale이면 쿠키를 정리하지 않고 401을 반환한다", async () => {
    mockGetAuthUserBySessionToken.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/v1/counseling-records",
      {
        headers: {
          authorization: "Bearer stale-bearer-token",
          cookie: "yeon.session=cookie-token",
        },
      },
    );

    const result = await requireAuthenticatedUser(request);

    expect(mockGetAuthUserBySessionToken).toHaveBeenCalledWith(
      "stale-bearer-token",
    );
    expect(result.currentUser).toBeNull();
    expect(result.response?.status).toBe(401);
    expect(mockClearAuthSessionCookie).not.toHaveBeenCalled();
  });
});
