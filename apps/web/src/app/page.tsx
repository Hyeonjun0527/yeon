import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { LandingHome } from "@/features/landing-home";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildAuthSessionCleanupHref,
  normalizeAuthRedirectPath,
} from "@/server/auth/constants";
import {
  getRequestHostnameFromHostHeader,
  listDevLoginOptions,
} from "@/server/auth/dev-login";
import { getAuthUserBySessionToken } from "@/server/auth/session";
import {
  PLATFORM_HOME_HREF,
  getPlatformServices,
} from "@/lib/platform-services";

type HomePageProps = {
  searchParams: Promise<{
    next?: string | string[];
    login?: string | string[];
  }>;
};

function pickFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildHomeRedirectPath(options: {
  nextPath: string;
  hasNextPath: boolean;
  openLoginModalOnLoad: boolean;
}) {
  const searchParams = new URLSearchParams();

  if (options.openLoginModalOnLoad) {
    searchParams.set("login", "1");
  }

  if (options.hasNextPath) {
    searchParams.set("next", options.nextPath);
  }

  const query = searchParams.toString();

  return query ? `/?${query}` : "/";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedNextPath = pickFirstValue(resolvedSearchParams.next);
  const nextPath = normalizeAuthRedirectPath(requestedNextPath);
  const hasRequestedNextPath = !!requestedNextPath;
  const requestedLoginModalOpen =
    pickFirstValue(resolvedSearchParams.login) === "1";
  const cookieStore = await cookies();
  const headerStore = await headers();
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value ?? null;
  const currentUser = sessionToken
    ? await getAuthUserBySessionToken(sessionToken)
    : null;
  const openLoginModalOnLoad = requestedLoginModalOpen && !currentUser;

  if (currentUser && hasRequestedNextPath) {
    redirect(nextPath);
  }

  if (sessionToken && !currentUser) {
    redirect(
      buildAuthSessionCleanupHref(
        buildHomeRedirectPath({
          nextPath,
          hasNextPath: hasRequestedNextPath,
          openLoginModalOnLoad,
        }),
      ),
    );
  }

  const requestHostname = getRequestHostnameFromHostHeader(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
  );
  const devLoginOptions = await listDevLoginOptions(requestHostname);

  return (
    <LandingHome
      nextPath={hasRequestedNextPath ? nextPath : PLATFORM_HOME_HREF}
      initialLoginModalOpen={openLoginModalOnLoad}
      devLoginOptions={devLoginOptions}
      services={getPlatformServices()}
      isAuthenticated={!!currentUser}
    />
  );
}
