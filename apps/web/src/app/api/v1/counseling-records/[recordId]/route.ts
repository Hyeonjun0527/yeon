import { counselingRecordDetailResponseSchema } from "@yeon/api-contract";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  deleteCounselingRecord,
  getCounselingRecordDetail,
} from "@/server/services/counseling-records-service";
import { ServiceError } from "@/server/services/service-error";

import { jsonError, requireAuthenticatedUser } from "../_shared";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { recordId } = await context.params;

  try {
    const record = await getCounselingRecordDetail(currentUser.id, recordId);

    return NextResponse.json(
      counselingRecordDetailResponseSchema.parse({ record }),
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("상담 기록 상세를 불러오지 못했습니다.", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { recordId } = await context.params;

  try {
    await deleteCounselingRecord(currentUser.id, recordId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("상담 기록을 삭제하지 못했습니다.", 500);
  }
}
