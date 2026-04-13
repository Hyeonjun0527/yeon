import type { NextRequest, NextResponse } from "next/server";

import { isSecureAuthCookie } from "@/server/auth/constants";
import {
  signAuthValue,
  verifySignedAuthValue,
} from "@/server/auth/crypto";

const PUBLIC_CHECK_DEVICE_COOKIE_NAME = "yeon.public-check.identities";
const PUBLIC_CHECK_DEVICE_COOKIE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PUBLIC_CHECK_DEVICE_COOKIE_VERSION = 1;
const MAX_PUBLIC_CHECK_IDENTITIES = 12;

type StoredPublicCheckIdentity = {
  spaceId: string;
  memberId: string;
  verifiedAt: string;
};

type PublicCheckDeviceCookiePayload = {
  version: number;
  identities: StoredPublicCheckIdentity[];
};

export type RememberedPublicCheckIdentity = {
  spaceId: string;
  memberId: string;
};

function encodePayload(payload: PublicCheckDeviceCookiePayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string) {
  try {
    return JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as PublicCheckDeviceCookiePayload;
  } catch {
    return null;
  }
}

function parseCookieValue(cookieValue: string | undefined) {
  if (!cookieValue) {
    return null;
  }

  const [encodedPayload, signature] = cookieValue.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  if (!verifySignedAuthValue(encodedPayload, signature)) {
    return null;
  }

  const payload = decodePayload(encodedPayload);
  if (
    !payload ||
    payload.version !== PUBLIC_CHECK_DEVICE_COOKIE_VERSION ||
    !Array.isArray(payload.identities)
  ) {
    return null;
  }

  return payload;
}

function serializeCookieValue(payload: PublicCheckDeviceCookiePayload) {
  const encodedPayload = encodePayload(payload);
  const signature = signAuthValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function buildNextPayload(
  existingPayload: PublicCheckDeviceCookiePayload | null,
  identity: StoredPublicCheckIdentity,
): PublicCheckDeviceCookiePayload {
  const existingIdentities = existingPayload?.identities ?? [];
  const nextIdentities = [
    identity,
    ...existingIdentities.filter(
      (item) => item.spaceId !== identity.spaceId,
    ),
  ].slice(0, MAX_PUBLIC_CHECK_IDENTITIES);

  return {
    version: PUBLIC_CHECK_DEVICE_COOKIE_VERSION,
    identities: nextIdentities,
  };
}

function buildCookieOptions(expires: Date) {
  return {
    name: PUBLIC_CHECK_DEVICE_COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureAuthCookie(),
    path: "/",
    expires,
  };
}

export function getRememberedPublicCheckMemberId(
  request: NextRequest,
  spaceId: string,
) {
  const payload = parseCookieValue(
    request.cookies.get(PUBLIC_CHECK_DEVICE_COOKIE_NAME)?.value,
  );

  return payload?.identities.find((identity) => identity.spaceId === spaceId)
    ?.memberId ?? null;
}

export function getRememberedPublicCheckIdentities(
  request: NextRequest,
): RememberedPublicCheckIdentity[] {
  const payload = parseCookieValue(
    request.cookies.get(PUBLIC_CHECK_DEVICE_COOKIE_NAME)?.value,
  );

  return (payload?.identities ?? []).map((identity) => ({
    spaceId: identity.spaceId,
    memberId: identity.memberId,
  }));
}

export function applyRememberedPublicCheckIdentityCookie(
  response: NextResponse,
  params: {
    request: NextRequest;
    spaceId: string;
    memberId: string;
  },
) {
  const existingPayload = parseCookieValue(
    params.request.cookies.get(PUBLIC_CHECK_DEVICE_COOKIE_NAME)?.value,
  );
  const nextPayload = buildNextPayload(existingPayload, {
    spaceId: params.spaceId,
    memberId: params.memberId,
    verifiedAt: new Date().toISOString(),
  });

  response.cookies.set({
    ...buildCookieOptions(new Date(Date.now() + PUBLIC_CHECK_DEVICE_COOKIE_TTL_MS)),
    value: serializeCookieValue(nextPayload),
  });

  return response;
}

export function clearRememberedPublicCheckIdentityCookie(
  response: NextResponse,
  request: NextRequest,
  spaceId: string,
) {
  const existingPayload = parseCookieValue(
    request.cookies.get(PUBLIC_CHECK_DEVICE_COOKIE_NAME)?.value,
  );

  if (!existingPayload) {
    response.cookies.set({
      ...buildCookieOptions(new Date(0)),
      value: "",
    });
    return response;
  }

  const nextIdentities = existingPayload.identities.filter(
    (identity) => identity.spaceId !== spaceId,
  );

  if (nextIdentities.length === 0) {
    response.cookies.set({
      ...buildCookieOptions(new Date(0)),
      value: "",
    });
    return response;
  }

  response.cookies.set({
    ...buildCookieOptions(new Date(Date.now() + PUBLIC_CHECK_DEVICE_COOKIE_TTL_MS)),
    value: serializeCookieValue({
      version: PUBLIC_CHECK_DEVICE_COOKIE_VERSION,
      identities: nextIdentities,
    }),
  });

  return response;
}
