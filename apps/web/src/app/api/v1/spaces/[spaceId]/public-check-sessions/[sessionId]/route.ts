import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updatePublicCheckSessionBodySchema } from "@yeon/api-contract";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { updatePublicCheckSession } from "@/server/services/public-check-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ spaceId: string; sessionId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { spaceId, sessionId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = updatePublicCheckSessionBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("체크인 세션 수정 요청 값이 올바르지 않습니다.", 400);
  }

  try {
    const session = await updatePublicCheckSession({
      userId: currentUser.id,
      spaceId,
      sessionId,
      ...parsed.data,
    });

    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("체크인 세션을 수정하지 못했습니다.", 500);
  }
}
