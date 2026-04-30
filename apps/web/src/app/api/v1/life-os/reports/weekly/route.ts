import { NextResponse, type NextRequest } from "next/server";
import { lifeOsWeeklyReportQuerySchema } from "@yeon/api-contract/life-os";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { buildLifeOsWeeklyReport } from "@/server/services/life-os-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) {
    return response;
  }

  const searchParams = request.nextUrl.searchParams;
  const parsed = lifeOsWeeklyReportQuerySchema.safeParse({
    periodStart: searchParams.get("periodStart"),
    periodEnd: searchParams.get("periodEnd"),
  });
  if (!parsed.success) {
    return jsonError("주간 리포트 기간 형식이 올바르지 않습니다.", 400);
  }

  try {
    const report = await buildLifeOsWeeklyReport(
      currentUser.id,
      parsed.data.periodStart,
      parsed.data.periodEnd,
    );
    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Life OS 주간 리포트를 생성하지 못했습니다.", 500);
  }
}
