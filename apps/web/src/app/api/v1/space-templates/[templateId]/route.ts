import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  deleteTemplate,
  detailSpaceTemplate,
  getTemplateForUser,
  summarizeSpaceTemplate,
  updateTemplate,
} from "@/server/services/space-templates-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const patchBodySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullish(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { templateId } = await params;

  try {
    const template = await getTemplateForUser(templateId, currentUser.id);
    return NextResponse.json({ template: detailSpaceTemplate(template) });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("템플릿을 불러오지 못했습니다.", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { templateId } = await params;

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
    const template = await updateTemplate(
      templateId,
      currentUser.id,
      parsed.data,
    );
    return NextResponse.json({ template: summarizeSpaceTemplate(template) });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("템플릿을 수정하지 못했습니다.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { templateId } = await params;

  try {
    await deleteTemplate(templateId, currentUser.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("템플릿을 삭제하지 못했습니다.", 500);
  }
}
