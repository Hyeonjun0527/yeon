import {
  bulkCounselingRecordDetailsRequestSchema,
  bulkCounselingRecordDetailsResponseSchema,
} from "@yeon/api-contract/counseling-records";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { getMultipleCounselingRecordDetails } from "@/server/services/counseling-records-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문 형식이 올바르지 않습니다.", 400);
  }

  const parsed = bulkCounselingRecordDetailsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("recordIds 형식이 올바르지 않습니다.", 400);
  }

  try {
    const records = await getMultipleCounselingRecordDetails(
      currentUser.id,
      parsed.data.recordIds,
    );

    return NextResponse.json(
      bulkCounselingRecordDetailsResponseSchema.parse({ records }),
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("상담 기록 상세를 불러오지 못했습니다.", 500);
  }
}
