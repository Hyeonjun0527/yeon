import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { bulkDeleteMembersBodySchema } from "@yeon/api-contract/spaces";

import { bulkDeleteMembersInSpace } from "@/server/services/members-service";
import { ServiceError } from "@/server/services/service-error";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { spaceId } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = bulkDeleteMembersBodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("삭제할 수강생 목록 형식이 올바르지 않습니다.", 400);
  }

  try {
    const result = await bulkDeleteMembersInSpace(
      currentUser.id,
      spaceId,
      parsed.data.memberIds,
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("수강생을 일괄 삭제하지 못했습니다.", 500);
  }
}
