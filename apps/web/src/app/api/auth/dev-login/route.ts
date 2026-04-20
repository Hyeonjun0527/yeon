import { errorResponseSchema } from "@yeon/api-contract/error";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  DEFAULT_POST_LOGIN_PATH,
  getAppOrigin,
  normalizeAuthRedirectPath,
} from "@/server/auth/constants";
import {
  createDevLoginUser,
  isDevLoginAllowed,
  resolveDevLoginUserId,
} from "@/server/auth/dev-login";
import {
  createAuthSession,
  applyAuthSessionCookie,
} from "@/server/auth/session";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json(errorResponseSchema.parse({ message }), { status });
}

export async function GET(request: NextRequest) {
  if (!isDevLoginAllowed(request.nextUrl.hostname)) {
    return new NextResponse(null, { status: 404 });
  }

  const requestedNextPath = request.nextUrl.searchParams.get("next");
  const nextPath = requestedNextPath
    ? normalizeAuthRedirectPath(requestedNextPath)
    : DEFAULT_POST_LOGIN_PATH;
  const shouldCreateAccount =
    request.nextUrl.searchParams.get("create") === "1";
  const userId = shouldCreateAccount
    ? await createDevLoginUser()
    : await resolveDevLoginUserId(request.nextUrl.searchParams.get("account"));

  if (!userId) {
    return jsonError("선택한 테스트 계정을 찾지 못했습니다.", 404);
  }

  const session = await createAuthSession(userId);

  const response = NextResponse.redirect(
    new URL(nextPath, getAppOrigin(request.nextUrl.origin)),
  );

  applyAuthSessionCookie(response, session);

  return response;
}
