import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { getOAuthUrl } from "@/server/services/googledrive-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  try {
    const state = randomUUID();
    const redirectUrl = getOAuthUrl(state);

    const res = NextResponse.redirect(redirectUrl);
    res.cookies.set("googledrive_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    res.cookies.set("googledrive_oauth_user", currentUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return res;
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Google Drive 인증 URL 생성에 실패했습니다.", 500);
  }
}
