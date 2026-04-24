import {
  chatServiceSendChatMessageBodySchema,
  chatServiceSendChatMessageResponseSchema,
} from "@yeon/api-contract/chat-service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { sendChatServiceMessage } from "@/server/services/chat-service/chat-service";
import { ServiceError } from "@/server/services/service-error";

import {
  jsonChatServiceError,
  parseJsonBody,
  requireChatServiceAuth,
} from "@/app/api/v1/chat-service/_shared";

type Params = {
  params: Promise<{
    roomId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { profile } = await requireChatServiceAuth(request);
    const body = await parseJsonBody(request);
    const parsedBody = chatServiceSendChatMessageBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonChatServiceError("메시지 입력값이 올바르지 않습니다.", 400);
    }

    const { roomId } = await params;
    const response = await sendChatServiceMessage(
      profile.id,
      roomId,
      parsedBody.data.body,
    );

    return NextResponse.json(
      chatServiceSendChatMessageResponseSchema.parse(response),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("메시지를 전송하지 못했습니다.", 500);
  }
}
