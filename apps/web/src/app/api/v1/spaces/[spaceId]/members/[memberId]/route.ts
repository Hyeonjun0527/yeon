import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { deleteMember } from "@/server/services/members-service";
import { ServiceError } from "@/server/services/service-error";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";

export const runtime = "nodejs";

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
