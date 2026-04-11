import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { reorderMemberFieldsBodySchema } from "@yeon/api-contract/spaces";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { reorderFields } from "@/server/services/member-fields-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; tabId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = reorderMemberFieldsBodySchema.safeParse(body);
  if (!parsed.success)
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);

  try {
    await reorderFields(spaceId, parsed.data.order);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("필드 순서를 변경하지 못했습니다.", 500);
  }
}
