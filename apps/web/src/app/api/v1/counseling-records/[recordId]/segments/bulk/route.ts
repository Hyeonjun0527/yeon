import {
  bulkUpdateSpeakerRequestSchema,
  bulkUpdateSpeakerResponseSchema,
} from "@yeon/api-contract/counseling-records";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { bulkUpdateSpeakerLabel } from "@/server/services/counseling-records-service";
import { ServiceError } from "@/server/services/service-error";

import { jsonError, requireAuthenticatedUser } from "../../../_shared";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { recordId } = await context.params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("요청 형식이 올바르지 않습니다.", 400);
  }

  const parsed = bulkUpdateSpeakerRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("화자 변경 요청이 올바르지 않습니다.", 400);
  }

  try {
    const updatedCount = await bulkUpdateSpeakerLabel(
      currentUser.id,
      recordId,
      parsed.data.fromSpeakerLabel,
      parsed.data.toSpeakerLabel,
      parsed.data.toSpeakerTone,
    );

    return NextResponse.json(
      bulkUpdateSpeakerResponseSchema.parse({ updatedCount }),
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("화자 일괄 변경에 실패했습니다.", 500);
  }
}
