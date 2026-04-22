import {
  chatServiceFriendMutationResponseSchema,
  chatServiceSendFriendRequestBodySchema,
} from "@yeon/api-contract/chat-service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { sendChatServiceFriendRequest } from "@/server/services/chat-service/friends-service";
import { ServiceError } from "@/server/services/service-error";

import {
  jsonChatServiceError,
  parseJsonBody,
  requireChatServiceAuth,
} from "@/app/api/v1/chat-service/_shared";

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireChatServiceAuth(request);
    const body = await parseJsonBody(request);
    const parsedBody = chatServiceSendFriendRequestBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonChatServiceError("친구 요청 대상이 올바르지 않습니다.", 400);
    }

    const response = await sendChatServiceFriendRequest(
      profile.id,
      parsedBody.data.targetProfileId,
    );

    return NextResponse.json(
      chatServiceFriendMutationResponseSchema.parse(response),
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("친구 요청을 처리하지 못했습니다.", 500);
  }
}
