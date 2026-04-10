import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { analyzeBuffer } from "@/server/services/file-analysis-service";
import type { ImportPreview, RefineContext } from "@/server/services/file-analysis-service";
import { detectFileKind } from "@/features/cloud-import/file-kind";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("multipart form 데이터를 읽을 수 없습니다.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return jsonError("file 필드가 필요합니다.", 400);
  }

  const fileName = (file as File).name;
  const mimeType = file.type;

  const instruction = formData.get("instruction");
  const previousResultRaw = formData.get("previousResult");
  let refine: RefineContext | undefined;
  if (typeof instruction === "string" && instruction.trim() && typeof previousResultRaw === "string") {
    try {
      const previousResult = JSON.parse(previousResultRaw) as ImportPreview;
      refine = { instruction: instruction.trim(), previousResult };
    } catch {
      // 파싱 실패 시 refinement 없이 진행
    }
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const kind = detectFileKind(fileName, mimeType);
    const preview = await analyzeBuffer(buffer, fileName, mimeType, kind, refine);

    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("파일 분석에 실패했습니다.", 500);
  }
}
