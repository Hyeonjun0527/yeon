import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  getValidAccessToken,
  listFiles,
} from "@/server/services/onedrive-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  try {
    const accessToken = await getValidAccessToken(currentUser.id);
    if (!accessToken) {
      return jsonError("OneDrive가 연결되어 있지 않습니다.", 401);
    }

    const folderId = request.nextUrl.searchParams.get("folderId") ?? undefined;
    const files = await listFiles(accessToken, folderId);

    return NextResponse.json({ files });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("OneDrive 파일 목록을 불러오지 못했습니다.", 500);
  }
}
