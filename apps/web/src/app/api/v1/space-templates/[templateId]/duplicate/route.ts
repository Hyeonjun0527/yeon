import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  duplicateTemplate,
  summarizeSpaceTemplate,
} from "@/server/services/space-templates-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { templateId } = await params;

  try {
    const template = await duplicateTemplate(templateId, currentUser.id);
    return NextResponse.json(
      { template: summarizeSpaceTemplate(template) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("템플릿을 복제하지 못했습니다.", 500);
  }
}
