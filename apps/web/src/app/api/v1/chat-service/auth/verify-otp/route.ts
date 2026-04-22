import {
  chatServiceVerifyOtpBodySchema,
  chatServiceVerifyOtpResponseSchema,
} from "@yeon/api-contract/chat-service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  CHAT_SERVICE_SESSION_COOKIE_NAME,
  verifyChatServiceOtp,
} from "@/server/services/chat-service/auth-service";
import { ServiceError } from "@/server/services/service-error";

import {
  jsonChatServiceError,
  parseJsonBody,
} from "@/app/api/v1/chat-service/_shared";

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);
    const parsedBody = chatServiceVerifyOtpBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonChatServiceError("OTP 인증 요청값이 올바르지 않습니다.", 400);
    }

    const response = await verifyChatServiceOtp(parsedBody.data);
    const nextResponse = NextResponse.json(
      chatServiceVerifyOtpResponseSchema.parse(response),
    );

    nextResponse.cookies.set(
      CHAT_SERVICE_SESSION_COOKIE_NAME,
      response.session.token,
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        expires: new Date(response.session.expiresAt),
      },
    );

    return nextResponse;
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("OTP 인증에 실패했습니다.", 500);
  }
}
