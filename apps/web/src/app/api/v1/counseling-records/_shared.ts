import * as Sentry from "@sentry/nextjs";
import { errorResponseSchema } from "@yeon/api-contract/error";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_SESSION_COOKIE_NAME } from "@/server/auth/constants";
import {
  clearAuthSessionCookie,
  getAuthUserBySessionToken,
} from "@/server/auth/session";
import { ServiceError } from "@/server/services/service-error";

export function jsonError(message: string, status: number) {
  return NextResponse.json(errorResponseSchema.parse({ message }), { status });
}

/**
 * Route handler 공통 try/catch 래퍼.
 * - ServiceError → 도메인 오류 코드 그대로 응답
 * - 나머지 → Sentry 보고 + 500 응답
 */
export async function withHandler(
  fn: () => Promise<Response>,
): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    Sentry.captureException(error);
    console.error(error);
    return jsonError("서버 오류가 발생했습니다.", 500);
  }
}

export async function requireAuthenticatedUser(request: NextRequest) {
  const sessionToken = request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value;
  const currentUser = sessionToken
    ? await getAuthUserBySessionToken(sessionToken)
    : null;

  if (!currentUser) {
    const response = jsonError("로그인이 필요합니다.", 401);

    if (sessionToken) {
      clearAuthSessionCookie(response);
    }

    return {
      currentUser: null,
      response,
    };
  }

  return {
    currentUser,
    response: null,
  };
}
