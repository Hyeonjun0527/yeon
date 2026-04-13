import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  memberStudentBoardResponseSchema,
  studentBoardHistoryPeriodSchema,
} from "@yeon/api-contract";

import {
  jsonError,
  requireAuthenticatedUser,
  withHandler,
} from "@/app/api/v1/counseling-records/_shared";
import { ServiceError } from "@/server/services/service-error";
import { listMemberStudentBoardHistory } from "@/server/services/student-board-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ spaceId: string; memberId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return withHandler(async () => {
    const { currentUser, response } = await requireAuthenticatedUser(request);

    if (!currentUser) {
      return response as Response;
    }

    const { spaceId, memberId } = await context.params;
    const periodResult = studentBoardHistoryPeriodSchema.safeParse(
      request.nextUrl.searchParams.get("period") ?? "30d",
    );

    if (!periodResult.success) {
      return jsonError("학생 이력 기간 값이 올바르지 않습니다.", 400);
    }

    try {
      const data = await listMemberStudentBoardHistory({
        userId: currentUser.id,
        spaceId,
        memberId,
        period: periodResult.data,
      });

      return NextResponse.json(memberStudentBoardResponseSchema.parse(data));
    } catch (error) {
      if (error instanceof ServiceError) {
        return jsonError(error.message, error.status);
      }

      console.error(error);
      return jsonError("학생 출석·과제 이력을 불러오지 못했습니다.", 500);
    }
  });
}
