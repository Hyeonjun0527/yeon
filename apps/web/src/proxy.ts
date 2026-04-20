import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getPlatformServiceByPathname,
  serviceRequiresAuthentication,
} from "@/lib/platform-services";
import { AUTH_SESSION_COOKIE_NAME } from "@/server/auth/constants";

const LEGACY_COUNSELING_BASE_PATH = "/home";
const COUNSELING_SERVICE_BASE_PATH = "/counseling-service";
const LEGACY_COUNSELING_ENTRY_PATHS = new Set([
  "/legacy-counseling-records",
  "/counseling-records",
]);

function buildCounselingServicePath(pathname: string) {
  if (pathname === LEGACY_COUNSELING_BASE_PATH) {
    return COUNSELING_SERVICE_BASE_PATH;
  }

  return `${COUNSELING_SERVICE_BASE_PATH}${pathname.slice(
    LEGACY_COUNSELING_BASE_PATH.length,
  )}`;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(`${COUNSELING_SERVICE_BASE_PATH}/api/`)) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = pathname.slice(COUNSELING_SERVICE_BASE_PATH.length);
    return NextResponse.rewrite(rewriteUrl);
  }

  if (
    pathname === LEGACY_COUNSELING_BASE_PATH ||
    pathname.startsWith(`${LEGACY_COUNSELING_BASE_PATH}/`)
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = buildCounselingServicePath(pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (LEGACY_COUNSELING_ENTRY_PATHS.has(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = COUNSELING_SERVICE_BASE_PATH;
    return NextResponse.redirect(redirectUrl);
  }

  const matchedService = getPlatformServiceByPathname(pathname);
  const isServiceApiRequest =
    matchedService !== null &&
    pathname.startsWith(`${matchedService.href}/api/`);
  const hasSessionCookie = Boolean(
    request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value,
  );

  if (
    matchedService &&
    serviceRequiresAuthentication(matchedService) &&
    !isServiceApiRequest &&
    !hasSessionCookie
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("login", "1");
    redirectUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
