import {
  chatServiceCreateAskPostBodySchema,
  chatServiceCreateAskPostResponseSchema,
  chatServiceListAskPostsResponseSchema,
} from "@yeon/api-contract/chat-service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  createChatServiceAskPost,
  listChatServiceAskPosts,
} from "@/server/services/chat-service/ask-service";
import { ServiceError } from "@/server/services/service-error";

import {
  jsonChatServiceError,
  parseJsonBody,
  requireChatServiceAuth,
} from "@/app/api/v1/chat-service/_shared";

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireChatServiceAuth(request);
    const response = await listChatServiceAskPosts(profile.id);

    return NextResponse.json(
      chatServiceListAskPostsResponseSchema.parse(response),
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("에스크 목록을 불러오지 못했습니다.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireChatServiceAuth(request);
    const body = await parseJsonBody(request);
    const parsedBody = chatServiceCreateAskPostBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonChatServiceError("에스크 작성값이 올바르지 않습니다.", 400);
    }

    const response = await createChatServiceAskPost(
      profile.id,
      parsedBody.data,
    );

    return NextResponse.json(
      chatServiceCreateAskPostResponseSchema.parse(response),
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("에스크 글을 생성하지 못했습니다.", 500);
  }
}
