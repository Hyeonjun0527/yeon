import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockIsDevLoginAllowed = vi.fn();
const mockVerifyDevLoginRequestSecret = vi.fn();
const mockResolveDevLoginUserId = vi.fn();
const mockCreateDevLoginUser = vi.fn();
const mockCreateAuthSession = vi.fn();
const mockApplyAuthSessionCookie = vi.fn();

vi.mock("@/server/auth/dev-login", () => ({
  isDevLoginAllowed: (...args: unknown[]) => mockIsDevLoginAllowed(...args),
  verifyDevLoginRequestSecret: (...args: unknown[]) =>
    mockVerifyDevLoginRequestSecret(...args),
  createDevLoginUser: (...args: unknown[]) => mockCreateDevLoginUser(...args),
  resolveDevLoginUserId: (...args: unknown[]) =>
    mockResolveDevLoginUserId(...args),
}));

vi.mock("@/server/auth/session", () => ({
  createAuthSession: (...args: unknown[]) => mockCreateAuthSession(...args),
  applyAuthSessionCookie: (...args: unknown[]) =>
    mockApplyAuthSessionCookie(...args),
}));

import { GET } from "../route";

describe("api/auth/dev-login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDevLoginAllowed.mockReturnValue(true);
    mockVerifyDevLoginRequestSecret.mockReturnValue(true);
    mockCreateDevLoginUser.mockResolvedValue("new-dev-user-id");
    mockCreateAuthSession.mockResolvedValue({
      sessionToken: "dev-session-token",
      expiresAt: new Date("2026-04-13T10:00:00.000Z"),
    });
    mockApplyAuthSessionCookie.mockImplementation(
      (response: Response) => response,
    );
  });

  it("로컬 dev-login이 비활성화되면 404를 반환한다", async () => {
    mockIsDevLoginAllowed.mockReturnValue(false);

    const response = await GET(
      new NextRequest("http://localhost/api/auth/dev-login"),
    );

    expect(response.status).toBe(404);
    expect(mockIsDevLoginAllowed).toHaveBeenCalled();
  });

  it("account가 없으면 기본 개발자 계정으로 상담 서비스에 리다이렉트한다", async () => {
    mockResolveDevLoginUserId.mockResolvedValue("default-user-id");

    const response = await GET(
      new NextRequest("http://localhost/api/auth/dev-login"),
    );

    expect(mockIsDevLoginAllowed).toHaveBeenCalled();
    expect(mockResolveDevLoginUserId).toHaveBeenCalledWith(null);
    expect(mockCreateAuthSession).toHaveBeenCalledWith("default-user-id");
    expect(mockApplyAuthSessionCookie).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("선택한 account가 있으면 해당 계정으로 next 경로에 리다이렉트한다", async () => {
    mockResolveDevLoginUserId.mockResolvedValue("selected-user-id");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/auth/dev-login?account=user-1&next=%2Fhome%3Ftab%3Drecords",
      ),
    );

    expect(mockIsDevLoginAllowed).toHaveBeenCalled();
    expect(mockResolveDevLoginUserId).toHaveBeenCalledWith("user-1");
    expect(mockCreateAuthSession).toHaveBeenCalledWith("selected-user-id");
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("create=1이면 새 계정을 만든 뒤 즉시 로그인한다", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/auth/dev-login?create=1&next=%2Fhome%3Ftab%3Dspaces",
      ),
    );

    expect(mockIsDevLoginAllowed).toHaveBeenCalled();
    expect(mockCreateDevLoginUser).toHaveBeenCalledTimes(1);
    expect(mockResolveDevLoginUserId).not.toHaveBeenCalled();
    expect(mockCreateAuthSession).toHaveBeenCalledWith("new-dev-user-id");
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("선택한 account를 찾지 못하면 404 오류를 반환한다", async () => {
    mockResolveDevLoginUserId.mockResolvedValue(null);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/auth/dev-login?account=missing-user",
      ),
    );

    expect(mockIsDevLoginAllowed).toHaveBeenCalled();
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "선택한 테스트 계정을 찾지 못했습니다.",
    });
  });

  it("DEV_LOGIN_SECRET 검증을 통과하지 못하면 404를 반환한다", async () => {
    mockVerifyDevLoginRequestSecret.mockReturnValue(false);

    const response = await GET(
      new NextRequest("http://localhost/api/auth/dev-login"),
    );

    expect(response.status).toBe(404);
    expect(mockVerifyDevLoginRequestSecret).toHaveBeenCalled();
    expect(mockResolveDevLoginUserId).not.toHaveBeenCalled();
    expect(mockCreateDevLoginUser).not.toHaveBeenCalled();
    expect(mockCreateAuthSession).not.toHaveBeenCalled();
  });
});
