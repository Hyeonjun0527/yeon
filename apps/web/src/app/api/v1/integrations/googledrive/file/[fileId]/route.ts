import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  getValidAccessToken,
  downloadFile,
} from "@/server/services/googledrive-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { fileId } = await params;
  const mimeType = request.nextUrl.searchParams.get("mimeType") ?? "";

  try {
    const accessToken = await getValidAccessToken(currentUser.id);
    if (!accessToken) {
      return jsonError("Google Drive가 연결되지 않았습니다.", 401);
    }

    const buffer = await downloadFile(accessToken, fileId, mimeType);

    // Google Sheets는 XLSX로 export되므로 Content-Type 고정
    const isGoogleSheet =
      mimeType === "application/vnd.google-apps.spreadsheet";
    const contentType = isGoogleSheet
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : mimeType || "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error("Google Drive 파일 프록시 오류:", error);
    return jsonError("파일을 가져오지 못했습니다.", 500);
  }
}
