import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getRequestHostnameFromHostHeader,
  isDevLoginAllowed,
  isLoopbackHostname,
} from "../dev-login";

const originalNodeEnv = process.env.NODE_ENV;
const originalAllowDevLogin = process.env.ALLOW_DEV_LOGIN;

describe("server/auth/dev-login", () => {
  afterEach(() => {
    vi.unstubAllEnvs();

    if (originalNodeEnv !== undefined) {
      vi.stubEnv("NODE_ENV", originalNodeEnv);
    }

    if (originalAllowDevLogin !== undefined) {
      vi.stubEnv("ALLOW_DEV_LOGIN", originalAllowDevLogin);
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

    it("production에서는 loopback hostname일 때만 허용한다", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("ALLOW_DEV_LOGIN", "true");

      expect(isDevLoginAllowed("localhost")).toBe(true);
      expect(isDevLoginAllowed("127.0.0.1")).toBe(true);
      expect(isDevLoginAllowed("yeon.world")).toBe(false);
    });

    it("env 플래그가 꺼져 있으면 loopback production도 허용하지 않는다", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("ALLOW_DEV_LOGIN", "false");

      expect(isDevLoginAllowed("localhost")).toBe(false);
    });
  });
});
