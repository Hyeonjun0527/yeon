import { errorResponseSchema } from "@yeon/api-contract";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_SESSION_COOKIE_NAME } from "@/server/auth/constants";
import {
  clearAuthSessionCookie,
  getAuthUserBySessionToken,
} from "@/server/auth/session";

export function jsonError(message: string, status: number) {
  return NextResponse.json(errorResponseSchema.parse({ message }), { status });
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
