import type { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/app/api/v1/counseling-records/_shared";
import { handleOAuthStartRoute } from "@/app/api/v1/integrations/_shared";
import { getOAuthUrl } from "@/server/services/onedrive-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  return handleOAuthStartRoute({
    userId: currentUser.id,
    providerKey: "onedrive",
    getOAuthUrl,
    failureMessage: "OneDrive 인증 URL 생성에 실패했습니다.",
  });
}
