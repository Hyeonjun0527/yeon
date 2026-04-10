import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { analyzeRecordResponseSchema } from "@yeon/api-contract/counseling-records";
import { runAnalysisForRecord } from "@/server/services/counseling-records-service";
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
    const result = await runAnalysisForRecord(currentUser.id, recordId);

    return NextResponse.json(
      analyzeRecordResponseSchema.parse({ analysisResult: result }),
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error("counseling-record-analyze-error", error);
    return jsonError("AI 분석에 실패했습니다.", 500);
  }
}
