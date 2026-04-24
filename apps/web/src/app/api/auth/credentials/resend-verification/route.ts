import { credentialResendVerificationBodySchema } from "@yeon/api-contract/credential";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { resendVerificationEmail } from "@/server/auth/credentials/resend-verification-service";
import {
  getClientIp,
  respondWithInvalidInput,
  respondWithServerError,
} from "@/server/auth/credentials/route-helpers";
import { isEmailSendRateLimited } from "@/server/auth/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return respondWithInvalidInput("요청 본문을 해석할 수 없습니다.");
  }

  const parsed = credentialResendVerificationBodySchema.safeParse(rawBody);

  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "입력 형식이 올바르지 않습니다.";
    return respondWithInvalidInput(message);
  }

  const ipAddress = getClientIp(request);

  if (isEmailSendRateLimited(ipAddress)) {
    return NextResponse.json(
      { message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  try {
    await resendVerificationEmail({
      email: parsed.data.email,
      originFallback: request.nextUrl.origin,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("인증 메일 재발송 요청 처리 중 오류", error);
    return respondWithServerError();
  }
}
