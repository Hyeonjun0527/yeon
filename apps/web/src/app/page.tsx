import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LandingHome } from "@/features/landing-home";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildAuthSessionCleanupHref,
  normalizeAuthRedirectPath,
} from "@/server/auth/constants";
import { getAuthUserBySessionToken } from "@/server/auth/session";

type HomePageProps = {
  searchParams: Promise<{
    next?: string | string[];
    login?: string | string[];
  }>;
};

const AUTHENTICATED_HOME_REDIRECT_PATH = "/counseling-records";

function pickFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getAuthenticatedRedirectPath(options: {
  nextPath: string;
  hasNextPath: boolean;
}) {
  if (!options.hasNextPath || options.nextPath === "/") {
    return AUTHENTICATED_HOME_REDIRECT_PATH;
  }

  return options.nextPath;
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
  const requestedLoginModalOpen =
    pickFirstValue(resolvedSearchParams.login) === "1";
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value ?? null;
  const currentUser = sessionToken
    ? await getAuthUserBySessionToken(sessionToken)
    : null;
  const openLoginModalOnLoad = requestedLoginModalOpen && !currentUser;

  if (currentUser) {
    redirect(
      getAuthenticatedRedirectPath({
        nextPath,
        hasNextPath: !!requestedNextPath,
      }),
    );
  }

  if (sessionToken && !currentUser) {
    redirect(
      buildAuthSessionCleanupHref(
        buildHomeRedirectPath({
          nextPath,
          hasNextPath: !!requestedNextPath,
          openLoginModalOnLoad,
        }),
      ),
    );
  }

  return (
    <LandingHome
      nextPath={nextPath}
      initialLoginModalOpen={openLoginModalOnLoad}
    />
  );
}
