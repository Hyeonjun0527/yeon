import { NextResponse, type NextRequest } from "next/server";
import { lifeOsDailyReportQuerySchema } from "@yeon/api-contract/life-os";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { buildLifeOsDailyReport } from "@/server/services/life-os-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) {
    return response;
  }

  const searchParams = request.nextUrl.searchParams;
  const parsed = lifeOsDailyReportQuerySchema.safeParse({
    localDate: searchParams.get("localDate") ?? searchParams.get("date"),
  });
  if (!parsed.success) {
    return jsonError("리포트 날짜 형식이 올바르지 않습니다.", 400);
  }

  try {
    const report = await buildLifeOsDailyReport(
      currentUser.id,
      parsed.data.localDate,
    );
    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Life OS 일간 리포트를 생성하지 못했습니다.", 500);
  }
}
