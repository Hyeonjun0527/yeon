import { chatServiceSessionResponseSchema } from "@yeon/api-contract/chat-service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getChatServiceSessionState,
  logoutChatServiceSession,
} from "@/server/services/chat-service/auth-service";
import { ServiceError } from "@/server/services/service-error";

import {
  clearChatServiceSessionCookie,
  getChatServiceSessionToken,
  jsonChatServiceError,
} from "@/app/api/v1/chat-service/_shared";

export async function GET(request: NextRequest) {
  try {
    const response = await getChatServiceSessionState(
      getChatServiceSessionToken(request),
    );

    return NextResponse.json(chatServiceSessionResponseSchema.parse(response));
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("세션 정보를 불러오지 못했습니다.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const response = await logoutChatServiceSession(
      getChatServiceSessionToken(request),
    );
    const nextResponse = NextResponse.json(
      chatServiceSessionResponseSchema.parse(response),
    );

    clearChatServiceSessionCookie(nextResponse);

    return nextResponse;
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("로그아웃에 실패했습니다.", 500);
  }
}
