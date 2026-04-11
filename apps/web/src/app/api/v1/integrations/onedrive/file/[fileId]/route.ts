import type { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/app/api/v1/counseling-records/_shared";
import { handleProviderFileProxyRoute } from "@/app/api/v1/integrations/_shared";
import {
  getValidAccessToken,
  downloadFile,
} from "@/server/services/onedrive-service";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { fileId } = await params;
  const mimeType = request.nextUrl.searchParams.get("mimeType") ?? "";

  return handleProviderFileProxyRoute({
    userId: currentUser.id,
    fileId,
    mimeType,
    getAccessToken: getValidAccessToken,
    downloadFile: (accessToken, targetFileId) =>
      downloadFile(accessToken, targetFileId),
    disconnectedMessage: "OneDrive가 연결되지 않았습니다.",
    logLabel: "OneDrive",
  });
}
