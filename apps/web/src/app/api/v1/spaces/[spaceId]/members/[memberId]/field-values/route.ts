import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { bulkUpsertMemberFieldValuesBodySchema } from "@yeon/api-contract/spaces";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  bulkUpsertFieldValues,
  getFieldValues,
  getFieldValuesForDefinitions,
} from "@/server/services/member-field-values-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; memberId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId, memberId } = await params;
  const fieldDefinitionIds = request.nextUrl.searchParams
    .getAll("fieldDefinitionId")
    .filter(Boolean);

  try {
    const values =
      fieldDefinitionIds.length > 0
        ? await getFieldValuesForDefinitions(
            memberId,
            spaceId,
            fieldDefinitionIds,
          )
        : await getFieldValues(memberId, spaceId);
    return NextResponse.json({ values });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("필드 값을 불러오지 못했습니다.", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; memberId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId, memberId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = bulkUpsertMemberFieldValuesBodySchema.safeParse(body);
  if (!parsed.success)
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);

  try {
    await bulkUpsertFieldValues(memberId, spaceId, parsed.data.values);
    const values = await getFieldValuesForDefinitions(
      memberId,
      spaceId,
      parsed.data.values.map((value) => value.fieldDefinitionId),
    );
    return NextResponse.json({ ok: true, values });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("필드 값을 저장하지 못했습니다.", 500);
  }
}
