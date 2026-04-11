import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  exchangeCode,
  getSavedRefreshToken,
  saveTokens,
} from "@/server/services/googledrive-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("googledrive_oauth_state")?.value;
  const userId = request.cookies.get("googledrive_oauth_user")?.value;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectTarget = `${baseUrl}/home/student-management`;

  if (!code || !state || !savedState || !userId) {
    return NextResponse.redirect(
      `${redirectTarget}?googledrive_error=missing_params`,
    );
  }

  if (state !== savedState) {
    return NextResponse.redirect(
      `${redirectTarget}?googledrive_error=invalid_state`,
    );
  }

  let tokens: Awaited<ReturnType<typeof exchangeCode>>;
  try {
    const existingRefreshToken = await getSavedRefreshToken(userId);
    tokens = await exchangeCode(code, existingRefreshToken);
  } catch (error) {
    console.error("Google Drive 토큰 교환 실패:", error);
    return NextResponse.redirect(
      `${redirectTarget}?googledrive_error=exchange_failed`,
    );
  }

  try {
    await saveTokens(userId, tokens);
  } catch (error) {
    console.error("Google Drive 토큰 저장 실패:", error);
    return NextResponse.redirect(
      `${redirectTarget}?googledrive_error=save_failed`,
    );
  }

  const res = NextResponse.redirect(
    `${redirectTarget}?googledrive_connected=true`,
  );
  res.cookies.delete("googledrive_oauth_state");
  res.cookies.delete("googledrive_oauth_user");
  return res;
}
