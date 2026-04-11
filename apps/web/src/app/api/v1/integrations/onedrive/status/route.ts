import type { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/app/api/v1/counseling-records/_shared";
import { handleProviderStatusRoute } from "@/app/api/v1/integrations/_shared";
import { isConnected } from "@/server/services/onedrive-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  return handleProviderStatusRoute({
    userId: currentUser.id,
    getPayload: async (userId) => ({ connected: await isConnected(userId) }),
    failureMessage: "OneDrive 연결 상태를 확인하지 못했습니다.",
  });
}
