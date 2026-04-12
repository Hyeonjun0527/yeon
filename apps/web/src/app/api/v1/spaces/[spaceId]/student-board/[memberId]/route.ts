import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateStudentBoardBodySchema } from "@yeon/api-contract";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { ServiceError } from "@/server/services/service-error";
import { upsertMemberBoardStatus } from "@/server/services/student-board-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ spaceId: string; memberId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { spaceId, memberId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = updateStudentBoardBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("학생 보드 수정 요청 값이 올바르지 않습니다.", 400);
  }

  try {
    const board = await upsertMemberBoardStatus({
      userId: currentUser.id,
      spaceId,
      memberId,
      ...parsed.data,
    });

    return NextResponse.json(board);
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("학생 보드 상태를 수정하지 못했습니다.", 500);
  }
}
