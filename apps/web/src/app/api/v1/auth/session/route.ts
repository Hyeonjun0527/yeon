import { authSessionResponseSchema } from "@yeon/api-contract/auth";
import { errorResponseSchema } from "@yeon/api-contract/error";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_SESSION_COOKIE_NAME } from "@/server/auth/constants";
import {
  clearAuthSessionCookie,
  deleteAuthSessionByToken,
  getAuthUserBySessionToken,
} from "@/server/auth/session";

function jsonError(message: string, status: number) {
  return NextResponse.json(errorResponseSchema.parse({ message }), { status });
}

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value;
    const user = sessionToken
      ? await getAuthUserBySessionToken(sessionToken)
      : null;
    const response = NextResponse.json(
      authSessionResponseSchema.parse({
        authenticated: !!user,
        user,
      }),
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );

    if (sessionToken && !user) {
      clearAuthSessionCookie(response);
    }

    return response;
  } catch (error) {
    console.error(error);
    return jsonError("현재 로그인 상태를 불러오지 못했습니다.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      await deleteAuthSessionByToken(sessionToken);
    }

    const response = NextResponse.json(
      authSessionResponseSchema.parse({
        authenticated: false,
        user: null,
      }),
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );

    clearAuthSessionCookie(response);

    return response;
  } catch (error) {
    console.error(error);
    return jsonError("로그아웃을 처리하지 못했습니다.", 500);
  }
}
