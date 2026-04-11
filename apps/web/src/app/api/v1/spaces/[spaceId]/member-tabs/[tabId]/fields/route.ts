import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createMemberFieldBodySchema } from "@yeon/api-contract/spaces";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  createField,
  getFieldsForTab,
} from "@/server/services/member-fields-service";
import { getFieldValuesForDefinitions } from "@/server/services/member-field-values-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; tabId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId, tabId } = await params;
  const memberId = request.nextUrl.searchParams.get("memberId");

  try {
    const fields = await getFieldsForTab(tabId, spaceId);

    if (!memberId) {
      return NextResponse.json({ fields });
    }

    const values = await getFieldValuesForDefinitions(
      memberId,
      spaceId,
      fields.map((field) => field.id),
    );

    return NextResponse.json({ fields, values });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("필드 목록을 불러오지 못했습니다.", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; tabId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId, tabId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = createMemberFieldBodySchema.safeParse(body);
  if (!parsed.success)
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);

  try {
    const field = await createField(
      spaceId,
      tabId,
      currentUser.id,
      parsed.data,
    );
    return NextResponse.json({ field }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("필드를 생성하지 못했습니다.", 500);
  }
}
