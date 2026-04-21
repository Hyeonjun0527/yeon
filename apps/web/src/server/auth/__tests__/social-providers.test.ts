import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authErrorCodes } from "../auth-errors";
import {
  buildSocialAuthorizationUrl,
  fetchSocialIdentityProfile,
} from "../social-providers";

describe("social providers", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.KAKAO_REST_API_KEY = "kakao-rest-key";
    process.env.KAKAO_CLIENT_SECRET = "kakao-secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://yeon.world";
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("buildSocialAuthorizationUrl은 google auth URL을 만든다 (PKCE S256 포함)", () => {
    const url = buildSocialAuthorizationUrl({
      provider: "google",
      state: "state-token",
      codeChallenge: "challenge-abc",
    });

    expect(url).toContain("accounts.google.com");
    expect(url).toContain("client_id=google-client-id");
    expect(url).toContain("state=state-token");
    expect(url).toContain("code_challenge=challenge-abc");
    expect(url).toContain("code_challenge_method=S256");
  });

  it("buildSocialAuthorizationUrl은 kakao auth URL에도 PKCE를 포함한다", () => {
    const url = buildSocialAuthorizationUrl({
      provider: "kakao",
      state: "kakao-state",
      codeChallenge: "kakao-challenge",
    });

    expect(url).toContain("kauth.kakao.com");
    expect(url).toContain("code_challenge=kakao-challenge");
    expect(url).toContain("code_challenge_method=S256");
  });

  it("필수 env가 없으면 providerNotConfigured 오류를 던진다", () => {
    delete process.env.GOOGLE_CLIENT_ID;

    expect(() =>
      buildSocialAuthorizationUrl({
        provider: "google",
        state: "state-token",
        codeChallenge: "challenge-abc",
      }),
    ).toThrowError(
      expect.objectContaining({ code: authErrorCodes.providerNotConfigured }),
    );
  });

  it("google profile fetch는 정상 응답을 프로필로 변환하고 token 교환에 PKCE verifier를 동봉한다", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "token", token_type: "Bearer" }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sub: "google-user-1",
            email: "User@Yeon.World",
            email_verified: true,
            name: "  홍길동  ",
            picture: "https://yeon.world/avatar.png",
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchSocialIdentityProfile({
        provider: "google",
        code: "code-1",
        codeVerifier: "verifier-abc-1234567890-1234567890-1234567890",
      }),
    ).resolves.toEqual({
      provider: "google",
      providerUserId: "google-user-1",
      email: "User@Yeon.World",
      emailVerified: true,
      displayName: "홍길동",
      avatarUrl: "https://yeon.world/avatar.png",
    });

    const tokenRequest = fetchMock.mock.calls[0]![1] as RequestInit;
    const tokenBody = (tokenRequest.body as URLSearchParams).toString();
    expect(tokenBody).toContain(
      "code_verifier=verifier-abc-1234567890-1234567890-1234567890",
    );
  });

  it("kakao 토큰 응답이 깨지면 oauthExchangeFailed 오류를 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("not-json", { status: 200 })),
    );

    await expect(
      fetchSocialIdentityProfile({
        provider: "kakao",
        code: "code-1",
        codeVerifier: "verifier-kakao-1234567890-1234567890-1234567",
      }),
    ).rejects.toMatchObject({
      code: authErrorCodes.oauthExchangeFailed,
    });
  });
});
