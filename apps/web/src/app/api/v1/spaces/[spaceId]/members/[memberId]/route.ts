import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateMemberBodySchema } from "@yeon/api-contract/spaces";

import {
  deleteMember,
  getMemberByIdForUser,
  updateMember,
} from "@/server/services/members-service";
import { ServiceError } from "@/server/services/service-error";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; memberId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { spaceId, memberId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = updateMemberBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);
  }

  try {
    const member = await getMemberByIdForUser(currentUser.id, memberId);

    if (member.spaceId !== spaceId) {
      return jsonError(
        "해당 수강생을 찾을 수 없거나 접근 권한이 없습니다.",
        404,
      );
    }

    const updatedMember = await updateMember(memberId, parsed.data);
    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("수강생 정보를 수정하지 못했습니다.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; memberId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { memberId } = await params;

  try {
    await deleteMember(currentUser.id, memberId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("수강생을 삭제하지 못했습니다.", 500);
  }
}
