import {
  counselingRecordDetailResponseSchema,
  linkMemberRequestSchema,
  linkMemberResponseSchema,
} from "@yeon/api-contract/counseling-records";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  deleteCounselingRecord,
  getCounselingRecordDetail,
  linkCounselingRecordMember,
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

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { recordId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바르지 않습니다.", 400);
  }

  const parsed = linkMemberRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("memberId 형식이 올바르지 않습니다.", 400);
  }

  try {
    await linkCounselingRecordMember(
      currentUser.id,
      recordId,
      parsed.data.memberId,
    );

    return NextResponse.json(linkMemberResponseSchema.parse({ ok: true }));
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("수강생 연결에 실패했습니다.", 500);
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
