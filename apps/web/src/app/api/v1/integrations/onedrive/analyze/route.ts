import type { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/app/api/v1/counseling-records/_shared";
import { handleCloudAnalyzeRoute } from "@/app/api/v1/integrations/_shared";
import {
  downloadFile,
  getValidAccessToken,
} from "@/server/services/onedrive-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  return handleCloudAnalyzeRoute({
    request,
    userId: currentUser.id,
    provider: "onedrive",
    providerLabel: "OneDrive",
    getAccessToken: getValidAccessToken,
    downloadFile: (accessToken, fileId) => downloadFile(accessToken, fileId),
    requireMimeType: false,
  });
}
