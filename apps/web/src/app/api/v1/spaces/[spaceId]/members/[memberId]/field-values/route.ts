import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  bulkUpsertFieldValues,
  getFieldValues,
} from "@/server/services/member-field-values-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const upsertBodySchema = z.object({
  values: z.array(
    z.object({
      fieldDefinitionId: z.string().uuid(),
      value: z.unknown(),
    }),
  ),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; memberId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId, memberId } = await params;

  try {
    const values = await getFieldValues(memberId, spaceId);
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

  const parsed = upsertBodySchema.safeParse(body);
  if (!parsed.success)
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);

  try {
    await bulkUpsertFieldValues(memberId, spaceId, parsed.data.values);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("필드 값을 저장하지 못했습니다.", 500);
  }
}
