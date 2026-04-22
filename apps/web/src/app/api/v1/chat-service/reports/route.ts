import {
  chatServiceCreateReportBodySchema,
  chatServiceCreateReportResponseSchema,
} from "@yeon/api-contract/chat-service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createChatServiceReport } from "@/server/services/chat-service/moderation-service";
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
    const parsedBody = chatServiceCreateReportBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonChatServiceError("신고 요청값이 올바르지 않습니다.", 400);
    }

    const response = await createChatServiceReport(profile.id, parsedBody.data);

    return NextResponse.json(
      chatServiceCreateReportResponseSchema.parse(response),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonChatServiceError(error.message, error.status);
    }

    console.error(error);
    return jsonChatServiceError("신고를 접수하지 못했습니다.", 500);
  }
}
