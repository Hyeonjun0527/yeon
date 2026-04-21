import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getRequestHostnameFromHostHeader,
  isDevLoginAllowed,
  isLoopbackHostname,
  verifyDevLoginRequestSecret,
} from "../dev-login";

const originalNodeEnv = process.env.NODE_ENV;
const originalAllowDevLogin = process.env.ALLOW_DEV_LOGIN;
const originalDevLoginSecret = process.env.DEV_LOGIN_SECRET;
const originalAuthSecret = process.env.AUTH_SECRET;

describe("server/auth/dev-login", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "dev-login-test-secret";
  });

  afterEach(() => {
    vi.unstubAllEnvs();

    if (originalNodeEnv !== undefined) {
      vi.stubEnv("NODE_ENV", originalNodeEnv);
    }

    if (originalAllowDevLogin !== undefined) {
      vi.stubEnv("ALLOW_DEV_LOGIN", originalAllowDevLogin);
    }

    if (originalDevLoginSecret === undefined) {
      delete process.env.DEV_LOGIN_SECRET;
    } else {
      process.env.DEV_LOGIN_SECRET = originalDevLoginSecret;
    }

    if (originalAuthSecret === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = originalAuthSecret;
    }
  });

  describe("getRequestHostnameFromHostHeader", () => {
    it("host 헤더에서 포트를 제거해 hostname만 추출한다", () => {
      expect(getRequestHostnameFromHostHeader("localhost:3000")).toBe(
        "localhost",
      );
      expect(getRequestHostnameFromHostHeader("127.0.0.1:4000")).toBe(
        "127.0.0.1",
      );
      expect(getRequestHostnameFromHostHeader("[::1]:3000")).toBe("::1");
    });

    it("proxy 체인의 첫 host만 사용한다", () => {
      expect(
        getRequestHostnameFromHostHeader("localhost:3000, example.com"),
      ).toBe("localhost");
    });
  });

  describe("isLoopbackHostname", () => {
    it("loopback hostname을 로컬로 판별한다", () => {
      expect(isLoopbackHostname("localhost")).toBe(true);
      expect(isLoopbackHostname("app.localhost")).toBe(true);
      expect(isLoopbackHostname("127.0.0.1")).toBe(true);
      expect(isLoopbackHostname("::1")).toBe(true);
      expect(isLoopbackHostname("[::1]:3000")).toBe(true);
    });

    it("일반 도메인은 로컬로 판별하지 않는다", () => {
      expect(isLoopbackHostname("yeon.world")).toBe(false);
      expect(isLoopbackHostname("staging.yeon.world")).toBe(false);
      expect(isLoopbackHostname(null)).toBe(false);
    });
  });

  describe("isDevLoginAllowed", () => {
    it("개발 모드에서는 loopback이 아니어도 env 플래그만으로 허용한다", () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("ALLOW_DEV_LOGIN", "true");

      expect(isDevLoginAllowed("yeon.world")).toBe(true);
    });

    it("production에서는 hostname 무관하게 항상 차단한다", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("ALLOW_DEV_LOGIN", "true");

      expect(isDevLoginAllowed("localhost")).toBe(false);
      expect(isDevLoginAllowed("127.0.0.1")).toBe(false);
      expect(isDevLoginAllowed("yeon.world")).toBe(false);
      expect(isDevLoginAllowed()).toBe(false);
    });

    it("env 플래그가 꺼져 있으면 비-production에서도 허용하지 않는다", () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("ALLOW_DEV_LOGIN", "false");

      expect(isDevLoginAllowed("localhost")).toBe(false);
    });
  });

  describe("verifyDevLoginRequestSecret", () => {
    function makeRequest(headers: Record<string, string>) {
      return { headers: new Headers(headers) };
    }

    it("DEV_LOGIN_SECRET이 비어 있으면 헤더 없이도 통과한다 (로컬 dev 기본 동작)", () => {
      delete process.env.DEV_LOGIN_SECRET;

      expect(verifyDevLoginRequestSecret(makeRequest({}))).toBe(true);
    });

    it("DEV_LOGIN_SECRET이 설정돼 있으면 헤더 누락은 차단한다", () => {
      process.env.DEV_LOGIN_SECRET = "shared-secret";

      expect(verifyDevLoginRequestSecret(makeRequest({}))).toBe(false);
    });

    it("DEV_LOGIN_SECRET이 일치하면 통과한다", () => {
      process.env.DEV_LOGIN_SECRET = "shared-secret";

      expect(
        verifyDevLoginRequestSecret(
          makeRequest({ "x-dev-login-secret": "shared-secret" }),
        ),
      ).toBe(true);
    });

    it("DEV_LOGIN_SECRET이 일치하지 않으면 timing-safe로 차단한다", () => {
      process.env.DEV_LOGIN_SECRET = "shared-secret";

      expect(
        verifyDevLoginRequestSecret(
          makeRequest({ "x-dev-login-secret": "wrong-value-equal-len" }),
        ),
      ).toBe(false);

      expect(
        verifyDevLoginRequestSecret(
          makeRequest({ "x-dev-login-secret": "short" }),
        ),
      ).toBe(false);
    });
  });
});
