import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  snapshotSpaceAsTemplate,
  summarizeSpaceTemplate,
} from "@/server/services/space-templates-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).nullish(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success)
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);

  try {
    const template = await snapshotSpaceAsTemplate(
      spaceId,
      currentUser.id,
      parsed.data.name,
      parsed.data.description ?? null,
    );
    return NextResponse.json(
      { template: summarizeSpaceTemplate(template) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("템플릿 스냅샷을 저장하지 못했습니다.", 500);
  }
}
