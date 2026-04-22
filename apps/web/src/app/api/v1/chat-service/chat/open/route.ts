import {
  chatServiceOpenChatBodySchema,
  chatServiceOpenChatResponseSchema,
} from "@yeon/api-contract/chat-service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { openChatServiceRoom } from "@/server/services/chat-service/chat-service";
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
    const parsedBody = chatServiceOpenChatBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonChatServiceError("대화 오픈 대상이 올바르지 않습니다.", 400);
    }

    const response = await openChatServiceRoom(
      profile.id,
      parsedBody.data.targetProfileId,
    );

    return NextResponse.json(
      chatServiceOpenChatResponseSchema.parse(response),
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("대화방을 열지 못했습니다.", 500);
  }
}
