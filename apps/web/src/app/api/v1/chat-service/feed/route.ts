import {
  chatServiceCreateFeedPostBodySchema,
  chatServiceCreateFeedPostResponseSchema,
  chatServiceListFeedResponseSchema,
} from "@yeon/api-contract/chat-service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  createChatServiceFeedPost,
  listChatServiceFeed,
} from "@/server/services/chat-service/feed-service";
import { ServiceError } from "@/server/services/service-error";

import {
  jsonChatServiceError,
  parseJsonBody,
  requireChatServiceAuth,
} from "@/app/api/v1/chat-service/_shared";

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireChatServiceAuth(request);
    const response = await listChatServiceFeed(profile.id);

    return NextResponse.json(chatServiceListFeedResponseSchema.parse(response));
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("피드를 불러오지 못했습니다.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireChatServiceAuth(request);
    const body = await parseJsonBody(request);
    const parsedBody = chatServiceCreateFeedPostBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonChatServiceError("피드 글 입력값이 올바르지 않습니다.", 400);
    }

    const response = await createChatServiceFeedPost(
      profile.id,
      parsedBody.data.body,
    );

    return NextResponse.json(
      chatServiceCreateFeedPostResponseSchema.parse(response),
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("피드 글을 생성하지 못했습니다.", 500);
  }
}
