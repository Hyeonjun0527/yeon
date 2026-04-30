import { credentialLoginBodySchema } from "@yeon/api-contract/credential";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AuthFlowError } from "@/server/auth/auth-errors";
import { loginWithCredential } from "@/server/auth/credentials/login-service";
import {
  getClientIp,
  respondWithAuthError,
  respondWithInvalidInput,
  respondWithServerError,
} from "@/server/auth/credentials/route-helpers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return respondWithInvalidInput("요청 본문을 해석할 수 없습니다.");
  }

  const parsed = credentialLoginBodySchema.safeParse(rawBody);

  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "입력 형식이 올바르지 않습니다.";
    return respondWithInvalidInput(message);
  }

  const ipAddress = getClientIp(request);

  try {
    const result = await loginWithCredential({
      email: parsed.data.email,
      password: parsed.data.password,
      ipAddress,
    });

    return NextResponse.json(
      {
        userId: result.userId,
        expiresAt: result.session.expiresAt.toISOString(),
        sessionToken: result.session.sessionToken,
      },
      {
        headers: { "cache-control": "no-store" },
        status: 200,
      },
    );
  } catch (error) {
    if (error instanceof AuthFlowError) {
      return respondWithAuthError(error);
    }
    console.error("모바일 일반 로그인 처리 중 오류", error);
    return respondWithServerError();
  }
}
