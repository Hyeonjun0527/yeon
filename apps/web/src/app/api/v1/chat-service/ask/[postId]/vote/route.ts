import {
  chatServiceVoteAskPostBodySchema,
  chatServiceVoteAskPostResponseSchema,
} from "@yeon/api-contract/chat-service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { voteChatServiceAskPost } from "@/server/services/chat-service/ask-service";
import { ServiceError } from "@/server/services/service-error";

import {
  jsonChatServiceError,
  parseJsonBody,
  requireChatServiceAuth,
} from "@/app/api/v1/chat-service/_shared";

type Params = {
  params: Promise<{
    postId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { profile } = await requireChatServiceAuth(request);
    const body = await parseJsonBody(request);
    const parsedBody = chatServiceVoteAskPostBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonChatServiceError("투표 요청값이 올바르지 않습니다.", 400);
    }

    const { postId } = await params;
    const response = await voteChatServiceAskPost(
      profile.id,
      postId,
      parsedBody.data.optionIndex,
    );

    return NextResponse.json(
      chatServiceVoteAskPostResponseSchema.parse(response),
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("투표를 처리하지 못했습니다.", 500);
  }
}
