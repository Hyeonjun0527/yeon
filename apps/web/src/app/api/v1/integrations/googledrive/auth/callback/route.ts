import type { NextRequest } from "next/server";

import {
  createOAuthCallbackErrorResponse,
  createOAuthCallbackSuccessResponse,
  resolveOAuthCallbackContext,
} from "@/app/api/v1/integrations/_shared";
import {
  exchangeCode,
  getSavedRefreshToken,
  saveTokens,
} from "@/server/services/googledrive-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const context = resolveOAuthCallbackContext({
    request,
    providerKey: "googledrive",
  });

  if ("response" in context) {
    return context.response;
  }

  let tokens: Awaited<ReturnType<typeof exchangeCode>>;
  try {
    const existingRefreshToken = await getSavedRefreshToken(context.userId);
    tokens = await exchangeCode(context.code, existingRefreshToken);
  } catch (error) {
    console.error("Google Drive 토큰 교환 실패:", error);
    return createOAuthCallbackErrorResponse("googledrive", "exchange_failed");
  }

  try {
    await saveTokens(context.userId, tokens);
  } catch (error) {
    console.error("Google Drive 토큰 저장 실패:", error);
    return createOAuthCallbackErrorResponse("googledrive", "save_failed");
  }

  return createOAuthCallbackSuccessResponse("googledrive");
}
