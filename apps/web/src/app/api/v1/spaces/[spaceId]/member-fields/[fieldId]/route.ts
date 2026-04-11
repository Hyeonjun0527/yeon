import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateMemberFieldBodySchema } from "@yeon/api-contract/spaces";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  deleteField,
  updateField,
} from "@/server/services/member-fields-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; fieldId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId, fieldId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = updateMemberFieldBodySchema.safeParse(body);
  if (!parsed.success)
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);

  try {
    const field = await updateField(fieldId, spaceId, parsed.data);
    return NextResponse.json({ field });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("필드를 수정하지 못했습니다.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; fieldId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId, fieldId } = await params;

  try {
    await deleteField(fieldId, spaceId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("필드를 삭제하지 못했습니다.", 500);
  }
}
