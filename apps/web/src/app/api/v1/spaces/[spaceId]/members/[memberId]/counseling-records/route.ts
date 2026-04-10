import { listCounselingRecordsResponseSchema } from "@yeon/api-contract/counseling-records";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { jsonError, requireAuthenticatedUser } from "@/app/api/v1/counseling-records/_shared";
import { listCounselingRecordsByMember } from "@/server/services/counseling-records-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ spaceId: string; memberId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { memberId } = await context.params;

  try {
    const records = await listCounselingRecordsByMember(
      currentUser.id,
      memberId,
    );

    return NextResponse.json(
      listCounselingRecordsResponseSchema.parse({ records }),
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("수강생의 상담 기록을 불러오지 못했습니다.", 500);
  }
}
