import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { markImportDraftImported } from "@/server/services/import-drafts-service";
import {
  importPreviewBodySchema,
  importPreviewIntoSpaces,
} from "@/server/services/import-preview-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const importRequestSchema = z.object({
  draftId: z.string().uuid().optional(),
  preview: importPreviewBodySchema,
});

export async function POST(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = importRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);
  }

  try {
    const created = await importPreviewIntoSpaces(
      currentUser.id,
      parsed.data.preview,
    );

    if (parsed.data.draftId) {
      await markImportDraftImported({
        userId: currentUser.id,
        draftId: parsed.data.draftId,
        result: created,
      });
    }

    return NextResponse.json({ created }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("스페이스/수강생 생성에 실패했습니다.", 500);
  }
}
