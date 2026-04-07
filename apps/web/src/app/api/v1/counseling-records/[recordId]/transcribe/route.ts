import { counselingRecordDetailResponseSchema } from "@yeon/api-contract";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { retryCounselingRecordTranscription } from "@/server/services/counseling-records-service";
import { ServiceError } from "@/server/services/service-error";

import { jsonError, requireAuthenticatedUser } from "../../_shared";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { recordId } = await context.params;

  try {
    const record = await retryCounselingRecordTranscription(
      currentUser,
      recordId,
      request.headers.get("x-client-request-id"),
    );

    return NextResponse.json(
      counselingRecordDetailResponseSchema.parse({ record }),
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("상담 음성 재전사를 처리하지 못했습니다.", 500);
  }
}
