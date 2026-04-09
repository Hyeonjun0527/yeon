import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  analyzeFileWithAI,
  downloadFile,
  getValidAccessToken,
  parseExcelToText,
} from "@/server/services/onedrive-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const bodySchema = z.object({
  fileId: z.string().min(1),
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("fileId가 필요합니다.", 400);
  }

  try {
    const accessToken = await getValidAccessToken(currentUser.id);
    if (!accessToken) {
      return jsonError("OneDrive가 연결되어 있지 않습니다.", 401);
    }

    const buffer = await downloadFile(accessToken, parsed.data.fileId);
    const text = parseExcelToText(buffer);
    const preview = await analyzeFileWithAI(text);

    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("파일 분석에 실패했습니다.", 500);
  }
}
