import { describe, expect, it } from "vitest";

import {
  authErrorCodes,
  buildAuthErrorRedirectPath,
  getAuthErrorCopy,
  isAuthErrorCode,
} from "../auth-errors";

describe("auth-errors", () => {
  it("isAuthErrorCode는 정의된 코드만 true를 반환한다", () => {
    expect(isAuthErrorCode(authErrorCodes.invalidState)).toBe(true);
    expect(isAuthErrorCode("unknown_code")).toBe(false);
    expect(isAuthErrorCode(null)).toBe(false);
  });

  it("providerDenied copy는 공급자 라벨을 포함한다", () => {
    const copy = getAuthErrorCopy(authErrorCodes.providerDenied, "google");

    expect(copy.title).toContain("구글");
    expect(copy.reason).toBe(authErrorCodes.providerDenied);
  });

  it("알 수 없는 reason은 serverError copy로 fallback한다", () => {
    const copy = getAuthErrorCopy("unexpected_reason", "kakao");

    expect(copy.reason).toBe(authErrorCodes.serverError);
    expect(copy.title).toContain("오류");
  });

  it("buildAuthErrorRedirectPath는 안전한 next만 포함한다", () => {
    const withSafeNext = buildAuthErrorRedirectPath({
      provider: "google",
      reason: authErrorCodes.invalidState,
      nextPath: "/counseling-service?tab=records",
    });
    const withUnsafeNext = buildAuthErrorRedirectPath({
      provider: "google",
      reason: authErrorCodes.invalidState,
      nextPath: "https://evil.example/steal",
    });
    const withLegacyHomeNext = buildAuthErrorRedirectPath({
      provider: "google",
      reason: authErrorCodes.invalidState,
      nextPath: "/home?tab=records",
    });

    expect(withSafeNext).toContain(
      "next=%2Fcounseling-service%3Ftab%3Drecords",
    );
    expect(withUnsafeNext).not.toContain("next=");
    expect(withLegacyHomeNext).not.toContain("next=");
  });
});
