import type { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/app/api/v1/counseling-records/_shared";
import { handleProviderFilesRoute } from "@/app/api/v1/integrations/_shared";
import {
  getValidAccessToken,
  listFiles,
} from "@/server/services/googledrive-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  return handleProviderFilesRoute({
    request,
    userId: currentUser.id,
    getAccessToken: getValidAccessToken,
    listFiles,
    disconnectedMessage: "Google Drive가 연결되어 있지 않습니다.",
    failureMessage: "Google Drive 파일 목록을 불러오지 못했습니다.",
  });
}
