import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { signAuthValue } from "../crypto";
import {
  consumeOAuthStateCookieValue,
  createOAuthStateCookieValue,
} from "../oauth-state";

describe("oauth-state", () => {
  const originalAuthSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "oauth-state-secret";
  });

  afterEach(() => {
    if (originalAuthSecret === undefined) {
      delete process.env.AUTH_SECRET;
      return;
    }

    process.env.AUTH_SECRET = originalAuthSecret;
  });

  it("createOAuthStateCookieValue는 nextPath를 정규화하고 state를 생성한다", () => {
    const result = createOAuthStateCookieValue({
      provider: "google",
      nextPath: "https://evil.example/steal",
    });

    expect(result.state.length).toBeGreaterThanOrEqual(16);
    expect(result.nextPath).toBe("/");
    expect(result.cookieValue).toContain(".");
  });

  it("consumeOAuthStateCookieValue는 일치하는 state를 소비하고 쿠키에서 제거한다", () => {
    const created = createOAuthStateCookieValue({
      provider: "google",
      nextPath: "/home",
    });

    const consumed = consumeOAuthStateCookieValue({
      cookieValue: created.cookieValue,
      provider: "google",
      state: created.state,
    });

    expect(consumed.matchedEntry?.nextPath).toBe("/home");
    expect(consumed.nextCookieValue).toBeNull();
  });

  it("provider나 state가 다르면 매칭되지 않고 쿠키를 유지한다", () => {
    const created = createOAuthStateCookieValue({
      provider: "google",
      nextPath: "/dashboard",
    });

    const consumed = consumeOAuthStateCookieValue({
      cookieValue: created.cookieValue,
      provider: "kakao",
      state: created.state,
    });

    expect(consumed.matchedEntry).toBeNull();
    expect(consumed.nextCookieValue).toBe(created.cookieValue);
  });

  it("서명이 변조된 쿠키는 무시한다", () => {
    const created = createOAuthStateCookieValue({
      provider: "google",
      nextPath: "/home",
    });
    const tampered = `${created.cookieValue}tampered`;

    const consumed = consumeOAuthStateCookieValue({
      cookieValue: tampered,
      provider: "google",
      state: created.state,
    });

    expect(consumed.matchedEntry).toBeNull();
    expect(consumed.nextCookieValue).toBeNull();
  });

  it("최대 8개만 유지하고 가장 오래된 state는 버린다", () => {
    let cookieValue: string | null = null;
    const states: string[] = [];

    for (let index = 0; index < 9; index += 1) {
      const created = createOAuthStateCookieValue({
        provider: "google",
        nextPath: `/path-${index}`,
        existingCookieValue: cookieValue,
      });
      states.push(created.state);
      cookieValue = created.cookieValue;
    }

    const dropped = consumeOAuthStateCookieValue({
      cookieValue,
      provider: "google",
      state: states[0],
    });
    const newest = consumeOAuthStateCookieValue({
      cookieValue,
      provider: "google",
      state: states[8],
    });

    expect(dropped.matchedEntry).toBeNull();
    expect(newest.matchedEntry?.nextPath).toBe("/path-8");
  });

  it("만료된 entry는 decode 단계에서 제거된다", () => {
    const encodedPayload = Buffer.from(
      JSON.stringify({
        entries: [
          {
            state: "expired-state-token",
            provider: "google",
            nextPath: "/expired",
            expiresAt: new Date(Date.now() - 60_000).toISOString(),
          },
        ],
      }),
    ).toString("base64url");
    const cookieValue = `${encodedPayload}.${signAuthValue(encodedPayload)}`;

    const consumed = consumeOAuthStateCookieValue({
      cookieValue,
      provider: "google",
      state: "expired-state-token",
    });

    expect(consumed.matchedEntry).toBeNull();
    expect(consumed.nextCookieValue).toBeNull();
  });
});
