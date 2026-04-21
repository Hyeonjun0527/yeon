import { NextRequest, NextResponse } from "next/server";

import { upsertSocialLogin } from "@/server/services/auth-service";

import {
  type AuthErrorCode,
  AuthFlowError,
  authErrorCodes,
  buildAuthErrorRedirectPath,
} from "./auth-errors";
import {
  AUTH_OAUTH_STATE_COOKIE_NAME,
  AUTH_OAUTH_STATE_TTL_SECONDS,
  getAppOrigin,
  isSecureAuthCookie,
  type SocialProvider,
} from "./constants";
import { createPkceCodeChallenge } from "./crypto";
import {
  createOAuthStateCookieValue,
  consumeOAuthStateCookieValue,
} from "./oauth-state";
import { createAuthSession, applyAuthSessionCookie } from "./session";
import {
  buildSocialAuthorizationUrl,
  fetchSocialIdentityProfile,
} from "./social-providers";

function redirectWithinApp(request: NextRequest, path: string) {
  return NextResponse.redirect(
    new URL(path, getAppOrigin(request.nextUrl.origin)),
  );
}

function applyOAuthStateCookie(
  response: NextResponse,
  cookieValue?: string | null,
) {
  if (!cookieValue) {
    response.cookies.set({
      name: AUTH_OAUTH_STATE_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureAuthCookie(),
      path: "/",
      expires: new Date(0),
    });

    return response;
  }

  response.cookies.set({
    name: AUTH_OAUTH_STATE_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureAuthCookie(),
    path: "/",
    maxAge: AUTH_OAUTH_STATE_TTL_SECONDS,
  });

  return response;
}

function redirectToAuthError(
  request: NextRequest,
  options: {
    provider: SocialProvider;
    reason: AuthErrorCode;
    nextPath?: string | null;
    oauthStateCookieValue?: string | null;
  },
) {
  const response = redirectWithinApp(
    request,
    buildAuthErrorRedirectPath({
      provider: options.provider,
      reason: options.reason,
      nextPath: options.nextPath,
    }),
  );

  if (options.oauthStateCookieValue !== undefined) {
    applyOAuthStateCookie(response, options.oauthStateCookieValue);
  }

  return response;
}

export async function startSocialAuth(
  request: NextRequest,
  provider: SocialProvider,
) {
  const requestedNextPath = request.nextUrl.searchParams.get("next");

  try {
    const oauthState = createOAuthStateCookieValue({
      provider,
      nextPath: requestedNextPath,
      existingCookieValue: request.cookies.get(AUTH_OAUTH_STATE_COOKIE_NAME)
        ?.value,
    });
    const authorizationUrl = buildSocialAuthorizationUrl({
      provider,
      state: oauthState.state,
      codeChallenge: createPkceCodeChallenge(oauthState.codeVerifier),
      originFallback: request.nextUrl.origin,
    });
    const response = NextResponse.redirect(authorizationUrl);
    applyOAuthStateCookie(response, oauthState.cookieValue);

    return response;
  } catch (error) {
    console.error(error);

    if (error instanceof AuthFlowError) {
      return redirectToAuthError(request, {
        provider,
        reason: error.code,
        nextPath: requestedNextPath,
      });
    }

    return redirectToAuthError(request, {
      provider,
      reason: authErrorCodes.serverError,
      nextPath: requestedNextPath,
    });
  }
}

export async function completeSocialAuth(
  request: NextRequest,
  provider: SocialProvider,
) {
  const requestState = request.nextUrl.searchParams.get("state");
  const oauthState = consumeOAuthStateCookieValue({
    cookieValue: request.cookies.get(AUTH_OAUTH_STATE_COOKIE_NAME)?.value,
    provider,
    state: requestState,
  });
  const providerError = request.nextUrl.searchParams.get("error");
  const providerErrorDescription =
    request.nextUrl.searchParams.get("error_description");
  const code = request.nextUrl.searchParams.get("code");

  if (providerError) {
    console.error(`${provider} 로그인 공급자 오류`, {
      error: providerError,
      errorDescription: providerErrorDescription,
    });

    return redirectToAuthError(request, {
      provider,
      reason: authErrorCodes.providerDenied,
      nextPath: oauthState.matchedEntry?.nextPath,
      oauthStateCookieValue: oauthState.nextCookieValue,
    });
  }

  if (!oauthState.matchedEntry) {
    return redirectToAuthError(request, {
      provider,
      reason: authErrorCodes.invalidState,
      oauthStateCookieValue: oauthState.nextCookieValue,
    });
  }

  if (!requestState || requestState !== oauthState.matchedEntry.state) {
    return redirectToAuthError(request, {
      provider,
      reason: authErrorCodes.invalidState,
      nextPath: oauthState.matchedEntry.nextPath,
      oauthStateCookieValue: oauthState.nextCookieValue,
    });
  }

  if (!code) {
    return redirectToAuthError(request, {
      provider,
      reason: authErrorCodes.missingCode,
      nextPath: oauthState.matchedEntry.nextPath,
      oauthStateCookieValue: oauthState.nextCookieValue,
    });
  }

  try {
    const profile = await fetchSocialIdentityProfile({
      provider,
      code,
      codeVerifier: oauthState.matchedEntry.codeVerifier,
      originFallback: request.nextUrl.origin,
    });
    const authUser = await upsertSocialLogin(profile);
    const session = await createAuthSession(authUser.id);
    const response = redirectWithinApp(
      request,
      oauthState.matchedEntry.nextPath,
    );

    applyOAuthStateCookie(response, oauthState.nextCookieValue);
    applyAuthSessionCookie(response, session);

    return response;
  } catch (error) {
    console.error(error);

    if (error instanceof AuthFlowError) {
      return redirectToAuthError(request, {
        provider,
        reason: error.code,
        nextPath: oauthState.matchedEntry.nextPath,
        oauthStateCookieValue: oauthState.nextCookieValue,
      });
    }

    return redirectToAuthError(request, {
      provider,
      reason: authErrorCodes.serverError,
      nextPath: oauthState.matchedEntry.nextPath,
      oauthStateCookieValue: oauthState.nextCookieValue,
    });
  }
}
