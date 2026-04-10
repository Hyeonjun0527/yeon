import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getMemberById, updateMember } from "@/server/services/members-service";
import { ServiceError } from "@/server/services/service-error";
import { jsonError, requireAuthenticatedUser } from "@/app/api/v1/counseling-records/_shared";

export const runtime = "nodejs";

const patchBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).nullish(),
  phone: z.string().max(20).nullish(),
  status: z.enum(["active", "withdrawn", "graduated"]).nullish(),
  initialRiskLevel: z.enum(["low", "medium", "high"]).nullish(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; memberId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { memberId } = await params;

  try {
    const member = await getMemberById(memberId);
    return NextResponse.json({ member });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("수강생 정보를 불러오지 못했습니다.", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; memberId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { memberId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);
  }

  try {
    const member = await updateMember(memberId, parsed.data);
    return NextResponse.json({ member });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("수강생 정보를 수정하지 못했습니다.", 500);
  }
}
