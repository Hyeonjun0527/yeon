import type { NextRequest } from "next/server";

import {
  createOAuthCallbackErrorResponse,
  createOAuthCallbackSuccessResponse,
  resolveOAuthCallbackContext,
} from "@/app/api/v1/integrations/_shared";
import { exchangeCode, saveTokens } from "@/server/services/onedrive-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const context = resolveOAuthCallbackContext({
    request,
    providerKey: "onedrive",
  });

  if ("response" in context) {
    return context.response;
  }

  try {
    const tokens = await exchangeCode(context.code);
    await saveTokens(context.userId, tokens);
    return createOAuthCallbackSuccessResponse("onedrive");
  } catch (error) {
    console.error("OneDrive OAuth callback 오류:", error);
    return createOAuthCallbackErrorResponse("onedrive", "exchange_failed");
  }
}
