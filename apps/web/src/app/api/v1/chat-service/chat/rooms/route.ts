import { chatServiceListChatRoomsResponseSchema } from "@yeon/api-contract/chat-service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { listChatServiceRooms } from "@/server/services/chat-service/chat-service";
import { ServiceError } from "@/server/services/service-error";

import {
  jsonChatServiceError,
  requireChatServiceAuth,
} from "@/app/api/v1/chat-service/_shared";

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireChatServiceAuth(request);
    const response = await listChatServiceRooms(profile.id);

    return NextResponse.json(
      chatServiceListChatRoomsResponseSchema.parse(response),
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("대화방 목록을 불러오지 못했습니다.", 500);
  }
}
