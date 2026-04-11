import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { exchangeCode, saveTokens } from "@/server/services/onedrive-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("onedrive_oauth_state")?.value;
  const userId = request.cookies.get("onedrive_oauth_user")?.value;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectTarget = `${baseUrl}/home/student-management`;

  if (!code || !state || !savedState || !userId) {
    return NextResponse.redirect(
      `${redirectTarget}?onedrive_error=missing_params`,
    );
  }

  if (state !== savedState) {
    return NextResponse.redirect(
      `${redirectTarget}?onedrive_error=invalid_state`,
    );
  }

  try {
    const tokens = await exchangeCode(code);
    await saveTokens(userId, tokens);

    const res = NextResponse.redirect(
      `${redirectTarget}?onedrive_connected=true`,
    );
    res.cookies.delete("onedrive_oauth_state");
    res.cookies.delete("onedrive_oauth_user");
    return res;
  } catch (error) {
    console.error("OneDrive OAuth callback 오류:", error);
    return NextResponse.redirect(
      `${redirectTarget}?onedrive_error=exchange_failed`,
    );
  }
}
