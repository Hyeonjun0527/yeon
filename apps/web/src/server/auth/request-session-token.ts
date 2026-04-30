import type { NextRequest } from "next/server";

import { AUTH_SESSION_COOKIE_NAME } from "./constants";

export type AuthSessionTokenSource = "authorization" | "cookie";

export type AuthSessionTokenFromRequest = {
  source: AuthSessionTokenSource;
  token: string;
} | null;

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const [scheme, token] = authorization?.split(/\s+/, 2) ?? [];

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export function getAuthSessionTokenFromRequest(
  request: NextRequest,
): AuthSessionTokenFromRequest {
  const bearerToken = getBearerToken(request);

  if (bearerToken) {
    return {
      source: "authorization",
      token: bearerToken,
    };
  }

  const cookieToken = request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value;

  if (!cookieToken) {
    return null;
  }

  return {
    source: "cookie",
    token: cookieToken,
  };
}
