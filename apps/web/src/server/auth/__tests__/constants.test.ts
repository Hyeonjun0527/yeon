import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_POST_LOGIN_PATH,
  buildAuthSessionCleanupHref,
  getAppOrigin,
  isSecureAuthCookie,
  normalizeAuthRedirectPath,
} from "../constants";

describe("auth constants", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  function setNodeEnv(value?: string) {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, "NODE_ENV");
      return;
    }

    Object.assign(process.env, { NODE_ENV: value });
  }

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }

    setNodeEnv(originalNodeEnv);
  });

  it("정상 앱 경로는 query/hash를 유지한 채 그대로 허용한다", () => {
    expect(normalizeAuthRedirectPath("/home?tab=records#section")).toBe(
      "/home?tab=records#section",
    );
  });

  it("외부 origin URL은 기본 경로로 되돌린다", () => {
    expect(normalizeAuthRedirectPath("https://evil.example/login")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
  });

  it("/api 경로는 로그인 후 이동 경로로 허용하지 않는다", () => {
    expect(normalizeAuthRedirectPath("/api/v1/users")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
  });

  it("cleanup href는 next 파라미터를 안전하게 붙인다", () => {
    expect(buildAuthSessionCleanupHref("/home?tab=records")).toBe(
      "/api/auth/session/cleanup?next=%2Fhome%3Ftab%3Drecords",
    );
  });

  it("getAppOrigin은 NEXT_PUBLIC_APP_URL이 없으면 fallback origin을 사용한다", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getAppOrigin("https://dev.yeon.world/abc")).toBe(
      "https://dev.yeon.world",
    );
  });

  it("isSecureAuthCookie는 production에서만 true다", () => {
    setNodeEnv("production");
    expect(isSecureAuthCookie()).toBe(true);

    setNodeEnv("development");
    expect(isSecureAuthCookie()).toBe(false);
  });
});
