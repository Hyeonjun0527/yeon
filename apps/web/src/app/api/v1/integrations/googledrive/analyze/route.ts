import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  downloadFile,
  getValidAccessToken,
} from "@/server/services/googledrive-service";
import { analyzeBuffer, type ImportPreview, type RefineContext } from "@/server/services/file-analysis-service";
import { detectFileKind } from "@/features/cloud-import/file-kind";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const bodySchema = z.object({
  fileId: z.string().min(1),
  mimeType: z.string().min(1),
  fileName: z.string().optional(),
  instruction: z.string().optional(),
  previousResult: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("fileId와 mimeType이 필요합니다.", 400);

  try {
    const accessToken = await getValidAccessToken(currentUser.id);
    if (!accessToken) return jsonError("Google Drive가 연결되어 있지 않습니다.", 401);

    const buffer = await downloadFile(accessToken, parsed.data.fileId, parsed.data.mimeType);
    const fileName = parsed.data.fileName ?? parsed.data.fileId;
    const kind = detectFileKind(fileName, parsed.data.mimeType);
    const refine: RefineContext | undefined =
      parsed.data.instruction?.trim() && parsed.data.previousResult
        ? { instruction: parsed.data.instruction.trim(), previousResult: parsed.data.previousResult as ImportPreview }
        : undefined;
    const preview = await analyzeBuffer(buffer, fileName, parsed.data.mimeType, kind, refine);
    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("파일 분석에 실패했습니다.", 500);
  }
}
