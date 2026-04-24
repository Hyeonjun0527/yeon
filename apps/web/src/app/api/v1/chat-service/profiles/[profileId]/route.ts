import { chatServiceGetProfileResponseSchema } from "@yeon/api-contract/chat-service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getChatServiceProfile } from "@/server/services/chat-service/profile-service";
import { ServiceError } from "@/server/services/service-error";

import {
  jsonChatServiceError,
  requireChatServiceAuth,
} from "@/app/api/v1/chat-service/_shared";

type Params = {
  params: Promise<{
    profileId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { profile } = await requireChatServiceAuth(request);
    const { profileId } = await params;
    const response = await getChatServiceProfile(profile.id, profileId);

    return NextResponse.json(
      chatServiceGetProfileResponseSchema.parse(response),
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("프로필을 불러오지 못했습니다.", 500);
  }
}
