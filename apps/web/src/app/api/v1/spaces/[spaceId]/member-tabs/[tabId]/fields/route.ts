import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, requireAuthenticatedUser } from "@/app/api/v1/counseling-records/_shared";
import {
  createField,
  getFieldsForTab,
} from "@/server/services/member-fields-service";
import type { FieldType } from "@/server/services/member-fields-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const createFieldBodySchema = z.object({
  name: z.string().min(1).max(80),
  fieldType: z.string(),
  options: z
    .array(
      z.object({
        value: z.string(),
        color: z.string(),
      }),
    )
    .nullish(),
  isRequired: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; tabId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId, tabId } = await params;

  try {
    const fields = await getFieldsForTab(tabId, spaceId);
    return NextResponse.json({ fields });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, error.status);
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

  const parsed = createFieldBodySchema.safeParse(body);
  if (!parsed.success) return jsonError("요청 데이터가 올바르지 않습니다.", 400);

  try {
    const field = await createField(spaceId, tabId, currentUser.id, {
      ...parsed.data,
      fieldType: parsed.data.fieldType as FieldType,
    });
    return NextResponse.json({ field }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("필드를 생성하지 못했습니다.", 500);
  }
}
