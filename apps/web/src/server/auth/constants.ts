import { DEFAULT_PLATFORM_SERVICE_HREF } from "@/lib/platform-services";

export const socialProviders = {
  google: "google",
  kakao: "kakao",
} as const;

export type SocialProvider =
  (typeof socialProviders)[keyof typeof socialProviders];

export const DEFAULT_POST_LOGIN_PATH = DEFAULT_PLATFORM_SERVICE_HREF;
export const AUTH_SESSION_COOKIE_NAME = "yeon.session";
export const AUTH_OAUTH_STATE_COOKIE_NAME = "yeon.oauth.state";
export const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const AUTH_OAUTH_STATE_TTL_SECONDS = 60 * 10;

const REDIRECT_PATH_BASE_URL = "https://yeon.world";

function isAllowedAuthRedirectPath(path: string) {
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/api/") &&
    path !== "/auth/error"
  );
}

export function normalizeAuthRedirectPath(
  candidate: string | null | undefined,
) {
  if (!candidate) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  try {
    const url = new URL(candidate, REDIRECT_PATH_BASE_URL);

    if (url.origin !== REDIRECT_PATH_BASE_URL) {
      return DEFAULT_POST_LOGIN_PATH;
    }

    const normalizedPath = `${url.pathname}${url.search}${url.hash}`;

    return isAllowedAuthRedirectPath(normalizedPath)
      ? normalizedPath
      : DEFAULT_POST_LOGIN_PATH;
  } catch {
    return DEFAULT_POST_LOGIN_PATH;
  }
}

export function buildAuthSessionCleanupHref(nextPath: string) {
  const url = new URL("/api/auth/session/cleanup", REDIRECT_PATH_BASE_URL);

  url.searchParams.set("next", nextPath);

  return `${url.pathname}${url.search}`;
}

export function getAppOrigin(originFallback?: string) {
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? originFallback;

  if (!rawAppUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL 또는 요청 origin이 필요합니다.");
  }

  return new URL(rawAppUrl).origin;
}

export function isSecureAuthCookie() {
  return process.env.NODE_ENV === "production";
}
