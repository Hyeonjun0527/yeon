import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAuthRandomToken,
  hashAuthToken,
  signAuthValue,
  timingSafeEqualString,
  verifySignedAuthValue,
} from "../crypto";

describe("auth crypto", () => {
  const originalAuthSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret";
  });

  afterEach(() => {
    if (originalAuthSecret === undefined) {
      delete process.env.AUTH_SECRET;
      return;
    }

    process.env.AUTH_SECRET = originalAuthSecret;
  });

  it("createAuthRandomToken은 base64url 토큰을 생성한다", () => {
    const token = createAuthRandomToken(24);

    expect(token.length).toBeGreaterThan(0);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("signAuthValue와 verifySignedAuthValue는 같은 값에서 검증에 성공한다", () => {
    const signature = signAuthValue("payload");

    expect(verifySignedAuthValue("payload", signature)).toBe(true);
  });

  it("verifySignedAuthValue는 서명이 다르면 false를 반환한다", () => {
    const signature = signAuthValue("payload");

    expect(verifySignedAuthValue("payload", `${signature}x`)).toBe(false);
  });

  it("hashAuthToken은 같은 토큰에서 안정적인 hex 해시를 반환한다", () => {
    const first = hashAuthToken("session-token");
    const second = hashAuthToken("session-token");

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("AUTH_SECRET이 없으면 서명 생성 시 오류를 던진다", () => {
    delete process.env.AUTH_SECRET;

    expect(() => signAuthValue("payload")).toThrow(
      "AUTH_SECRET 환경변수가 필요합니다.",
    );
  });

  it("timingSafeEqualString은 같은 값에서 true, 다른 값에서 false를 반환한다", () => {
    expect(timingSafeEqualString("abc", "abc")).toBe(true);
    expect(timingSafeEqualString("abc", "abd")).toBe(false);
    expect(timingSafeEqualString("", "")).toBe(true);
  });

  it("timingSafeEqualString은 길이가 다르면 즉시 false를 반환한다", () => {
    expect(timingSafeEqualString("abc", "abcd")).toBe(false);
    expect(timingSafeEqualString("abcd", "abc")).toBe(false);
    expect(timingSafeEqualString("", "x")).toBe(false);
  });
});
