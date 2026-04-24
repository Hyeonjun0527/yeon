import {
  chatServiceCreateFeedPostBodySchema,
  chatServiceCreateFeedPostResponseSchema,
  chatServiceListFeedRepliesResponseSchema,
} from "@yeon/api-contract/chat-service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  createChatServiceFeedPost,
  listChatServiceFeedReplies,
} from "@/server/services/chat-service/feed-service";
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

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { profile } = await requireChatServiceAuth(request);
    const { postId } = await params;
    const response = await listChatServiceFeedReplies(profile.id, postId);

    return NextResponse.json(
      chatServiceListFeedRepliesResponseSchema.parse(response),
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("답글 목록을 불러오지 못했습니다.", 500);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { profile } = await requireChatServiceAuth(request);
    const body = await parseJsonBody(request);
    const parsedBody = chatServiceCreateFeedPostBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonChatServiceError("답글 입력값이 올바르지 않습니다.", 400);
    }

    const { postId } = await params;
    const response = await createChatServiceFeedPost(
      profile.id,
      parsedBody.data.body,
      postId,
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
    return jsonChatServiceError("답글을 생성하지 못했습니다.", 500);
  }
}
