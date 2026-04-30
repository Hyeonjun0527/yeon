import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { getAuthSessionTokenFromRequest } from "../request-session-token";

function createRequest(headers?: HeadersInit) {
  return new NextRequest("http://localhost/api/v1/auth/session", { headers });
}

describe("getAuthSessionTokenFromRequest", () => {
  it("토큰이 없으면 null을 반환한다", () => {
    expect(getAuthSessionTokenFromRequest(createRequest())).toBeNull();
  });

  it("Authorization Bearer 토큰을 우선 반환한다", () => {
    expect(
      getAuthSessionTokenFromRequest(
        createRequest({
          authorization: "Bearer bearer-token",
          cookie: "yeon.session=cookie-token",
        }),
      ),
    ).toEqual({ source: "authorization", token: "bearer-token" });
  });

  it("Bearer scheme은 대소문자를 구분하지 않는다", () => {
    expect(
      getAuthSessionTokenFromRequest(
        createRequest({ authorization: "bEaReR mixed-token" }),
      ),
    ).toEqual({ source: "authorization", token: "mixed-token" });
  });

  it("잘못된 Authorization 헤더는 무시하고 쿠키로 fallback한다", () => {
    expect(
      getAuthSessionTokenFromRequest(
        createRequest({
          authorization: "Basic abc",
          cookie: "yeon.session=cookie-token",
        }),
      ),
    ).toEqual({ source: "cookie", token: "cookie-token" });
  });

  it("Bearer 토큰이 비어 있으면 쿠키로 fallback한다", () => {
    expect(
      getAuthSessionTokenFromRequest(
        createRequest({
          authorization: "Bearer   ",
          cookie: "yeon.session=cookie-token",
        }),
      ),
    ).toEqual({ source: "cookie", token: "cookie-token" });
  });
});
