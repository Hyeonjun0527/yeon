import { z } from "zod";

import { AuthFlowError, authErrorCodes } from "./auth-errors";
import {
  getAppOrigin,
  socialProviders,
  type SocialProvider,
} from "./constants";

export type SocialIdentityProfile = {
  provider: SocialProvider;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
};

const OAUTH_PROVIDER_REQUEST_TIMEOUT_MS = 10_000;

const googleTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
});

const googleUserInfoSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email().optional(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
});

const kakaoTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
});

const kakaoUserInfoSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  kakao_account: z
    .object({
      email: z.string().email().optional(),
      is_email_verified: z.boolean().optional(),
      profile: z
        .object({
          nickname: z.string().optional(),
          profile_image_url: z.string().url().optional(),
        })
        .optional(),
    })
    .optional(),
});

function getRequiredEnv(name: string, provider: SocialProvider) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new AuthFlowError(
      authErrorCodes.providerNotConfigured,
      `${provider} 로그인 환경변수 ${name}이 필요합니다.`,
    );
  }

  return value;
}

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();

  return value ? value : null;
}

function getProviderCallbackUrl(
  provider: SocialProvider,
  originFallback?: string,
) {
  return new URL(
    `/api/auth/${provider}/callback`,
    getAppOrigin(originFallback),
  ).toString();
}

async function readJsonResponse<TSchema>(
  response: Response,
  schema: z.ZodType<TSchema>,
  errorCode: keyof typeof authErrorCodes,
  contextLabel: string,
) {
  const rawBody = await response.text();
  let parsedBody: unknown = null;

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      console.error(`${contextLabel}: JSON 파싱에 실패했습니다.`, rawBody);
      throw new AuthFlowError(
        authErrorCodes[errorCode],
        `${contextLabel} 응답이 올바르지 않습니다.`,
      );
    }
  }

  if (!response.ok) {
    console.error(`${contextLabel}: 공급자 요청이 실패했습니다.`, {
      status: response.status,
      body: parsedBody ?? rawBody,
    });
    throw new AuthFlowError(
      authErrorCodes[errorCode],
      `${contextLabel} 요청이 실패했습니다.`,
    );
  }

  const parseResult = schema.safeParse(parsedBody);

  if (!parseResult.success) {
    console.error(`${contextLabel}: 응답 스키마가 올바르지 않습니다.`, {
      issues: parseResult.error.issues,
      body: parsedBody,
    });
    throw new AuthFlowError(
      authErrorCodes[errorCode],
      `${contextLabel} 응답 형식이 올바르지 않습니다.`,
    );
  }

  return parseResult.data;
}

async function fetchProviderJsonResponse<TSchema>(options: {
  input: RequestInfo | URL;
  init: RequestInit;
  schema: z.ZodType<TSchema>;
  errorCode: keyof typeof authErrorCodes;
  contextLabel: string;
}) {
  let response: Response;

  try {
    response = await fetch(options.input, {
      ...options.init,
      signal: AbortSignal.timeout(OAUTH_PROVIDER_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(
      `${options.contextLabel}: 공급자 요청이 실패했습니다.`,
      error,
    );
    throw new AuthFlowError(
      authErrorCodes[options.errorCode],
      `${options.contextLabel} 요청이 실패했습니다.`,
    );
  }

  return readJsonResponse(
    response,
    options.schema,
    options.errorCode,
    options.contextLabel,
  );
}

function normalizeProfileString(value?: string | null, maxLength?: number) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function normalizeProfileUrl(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).toString().slice(0, 2048);
  } catch {
    return null;
  }
}

function buildGoogleAuthorizationUrl(state: string, originFallback?: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set(
    "client_id",
    getRequiredEnv("GOOGLE_CLIENT_ID", socialProviders.google),
  );
  url.searchParams.set(
    "redirect_uri",
    getProviderCallbackUrl(socialProviders.google, originFallback),
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("include_granted_scopes", "true");

  return url.toString();
}

async function fetchGoogleIdentityProfile(
  code: string,
  originFallback?: string,
): Promise<SocialIdentityProfile> {
  const token = await fetchProviderJsonResponse({
    input: "https://oauth2.googleapis.com/token",
    init: {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: getRequiredEnv("GOOGLE_CLIENT_ID", socialProviders.google),
        client_secret: getRequiredEnv(
          "GOOGLE_CLIENT_SECRET",
          socialProviders.google,
        ),
        redirect_uri: getProviderCallbackUrl(
          socialProviders.google,
          originFallback,
        ),
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    },
    schema: googleTokenResponseSchema,
    errorCode: "oauthExchangeFailed",
    contextLabel: "구글 토큰 교환",
  });

  const userInfo = await fetchProviderJsonResponse({
    input: "https://openidconnect.googleapis.com/v1/userinfo",
    init: {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
      cache: "no-store",
    },
    schema: googleUserInfoSchema,
    errorCode: "profileFetchFailed",
    contextLabel: "구글 사용자 정보 조회",
  });

  return {
    provider: socialProviders.google,
    providerUserId: userInfo.sub,
    email: normalizeProfileString(userInfo.email),
    emailVerified: userInfo.email_verified === true,
    displayName: normalizeProfileString(userInfo.name, 80),
    avatarUrl: normalizeProfileUrl(userInfo.picture),
  };
}

function buildKakaoAuthorizationUrl(state: string, originFallback?: string) {
  const url = new URL("https://kauth.kakao.com/oauth/authorize");

  url.searchParams.set(
    "client_id",
    getRequiredEnv("KAKAO_REST_API_KEY", socialProviders.kakao),
  );
  url.searchParams.set(
    "redirect_uri",
    getProviderCallbackUrl(socialProviders.kakao, originFallback),
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "account_email");

  return url.toString();
}

async function fetchKakaoIdentityProfile(
  code: string,
  originFallback?: string,
): Promise<SocialIdentityProfile> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: getRequiredEnv("KAKAO_REST_API_KEY", socialProviders.kakao),
    redirect_uri: getProviderCallbackUrl(socialProviders.kakao, originFallback),
    code,
  });
  const kakaoClientSecret = getOptionalEnv("KAKAO_CLIENT_SECRET");

  if (kakaoClientSecret) {
    body.set("client_secret", kakaoClientSecret);
  }

  const token = await fetchProviderJsonResponse({
    input: "https://kauth.kakao.com/oauth/token",
    init: {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body,
      cache: "no-store",
    },
    schema: kakaoTokenResponseSchema,
    errorCode: "oauthExchangeFailed",
    contextLabel: "카카오 토큰 교환",
  });

  const userInfo = await fetchProviderJsonResponse({
    input: "https://kapi.kakao.com/v2/user/me?secure_resource=true",
    init: {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
      cache: "no-store",
    },
    schema: kakaoUserInfoSchema,
    errorCode: "profileFetchFailed",
    contextLabel: "카카오 사용자 정보 조회",
  });

  return {
    provider: socialProviders.kakao,
    providerUserId: userInfo.id,
    email: normalizeProfileString(userInfo.kakao_account?.email),
    emailVerified: userInfo.kakao_account?.is_email_verified === true,
    displayName: normalizeProfileString(
      userInfo.kakao_account?.profile?.nickname,
      80,
    ),
    avatarUrl: normalizeProfileUrl(
      userInfo.kakao_account?.profile?.profile_image_url,
    ),
  };
}

export function buildSocialAuthorizationUrl(options: {
  provider: SocialProvider;
  state: string;
  originFallback?: string;
}) {
  switch (options.provider) {
    case socialProviders.google:
      return buildGoogleAuthorizationUrl(options.state, options.originFallback);
    case socialProviders.kakao:
      return buildKakaoAuthorizationUrl(options.state, options.originFallback);
  }
}

export async function fetchSocialIdentityProfile(options: {
  provider: SocialProvider;
  code: string;
  originFallback?: string;
}) {
  switch (options.provider) {
    case socialProviders.google:
      return fetchGoogleIdentityProfile(options.code, options.originFallback);
    case socialProviders.kakao:
      return fetchKakaoIdentityProfile(options.code, options.originFallback);
  }
}
