import { errorResponseSchema } from "@yeon/api-contract/error";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { type AuthErrorCode, AuthFlowError, authErrorCodes } from "@/server/auth/auth-errors";

const AUTH_ERROR_STATUS: Record<AuthErrorCode, number> = {
  [authErrorCodes.providerDenied]: 400,
  [authErrorCodes.invalidState]: 400,
  [authErrorCodes.missingCode]: 400,
  [authErrorCodes.providerNotConfigured]: 500,
  [authErrorCodes.oauthExchangeFailed]: 502,
  [authErrorCodes.profileFetchFailed]: 502,
  [authErrorCodes.emailRequired]: 400,
  [authErrorCodes.emailNotVerified]: 403,
  [authErrorCodes.providerConflict]: 409,
  [authErrorCodes.invalidCredentials]: 401,
  [authErrorCodes.passwordPolicyViolation]: 400,
  [authErrorCodes.emailAlreadyRegistered]: 409,
  [authErrorCodes.accountLocked]: 423,
  [authErrorCodes.rateLimitExceeded]: 429,
  [authErrorCodes.invalidVerificationToken]: 400,
  [authErrorCodes.invalidResetToken]: 400,
  [authErrorCodes.serverError]: 500,
};

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const real = request.headers.get("x-real-ip");
  if (real) {
    return real.trim();
  }

  return "unknown";
}

export function respondWithAuthError(error: AuthFlowError) {
  const status = AUTH_ERROR_STATUS[error.code] ?? 500;
  return NextResponse.json(
    errorResponseSchema.parse({ message: error.message }),
    { status },
  );
}

export function respondWithInvalidInput(message: string) {
  return NextResponse.json(
    errorResponseSchema.parse({ message }),
    { status: 400 },
  );
}

export function respondWithServerError() {
  return NextResponse.json(
    errorResponseSchema.parse({
      message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    }),
    { status: 500 },
  );
}
