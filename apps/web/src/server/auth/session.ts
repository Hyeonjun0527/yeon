import type { AuthUserDto } from "@yeon/api-contract/auth";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";

import { toAuthUserDto } from "@/server/auth/auth-user";
import {
  AUTH_SESSION_COOKIE_NAME,
  AUTH_SESSION_TTL_SECONDS,
  isSecureAuthCookie,
} from "@/server/auth/constants";
import { createAuthRandomToken, hashAuthToken } from "@/server/auth/crypto";
import { getDb } from "@/server/db";
import { authSessions, userIdentities, users } from "@/server/db/schema";

export async function createAuthSession(userId: string) {
  const sessionToken = createAuthRandomToken();
  const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_SECONDS * 1000);

  await getDb()
    .insert(authSessions)
    .values({
      id: randomUUID(),
      userId,
      sessionTokenHash: hashAuthToken(sessionToken),
      expiresAt,
    });

  return {
    sessionToken,
    expiresAt,
  };
}

export function applyAuthSessionCookie(
  response: NextResponse,
  session: {
    sessionToken: string;
    expiresAt: Date;
  },
) {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE_NAME,
    value: session.sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureAuthCookie(),
    path: "/",
    expires: session.expiresAt,
  });

  return response;
}

export function clearAuthSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureAuthCookie(),
    path: "/",
    expires: new Date(0),
  });

  return response;
}

async function findAuthUserBySessionToken(
  sessionToken: string,
): Promise<AuthUserDto | null> {
  const db = getDb();
  const [sessionRow] = await db
    .select()
    .from(authSessions)
    .where(eq(authSessions.sessionTokenHash, hashAuthToken(sessionToken)))
    .limit(1);

  if (!sessionRow) {
    return null;
  }

  if (sessionRow.expiresAt.getTime() <= Date.now()) {
    await db.delete(authSessions).where(eq(authSessions.id, sessionRow.id));
    return null;
  }

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, sessionRow.userId))
    .limit(1);

  if (!userRow) {
    await db.delete(authSessions).where(eq(authSessions.id, sessionRow.id));
    return null;
  }

  const identityRows = await db
    .select()
    .from(userIdentities)
    .where(eq(userIdentities.userId, userRow.id));

  if (identityRows.length === 0) {
    await db.delete(authSessions).where(eq(authSessions.id, sessionRow.id));
    return null;
  }

  await db
    .update(authSessions)
    .set({
      lastAccessedAt: new Date(),
    })
    .where(eq(authSessions.id, sessionRow.id));

  return toAuthUserDto(userRow, identityRows);
}

async function getCurrentSessionToken() {
  const cookieStore = await cookies();

  return cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getCurrentAuthUser() {
  const sessionToken = await getCurrentSessionToken();

  if (!sessionToken) {
    return null;
  }

  return findAuthUserBySessionToken(sessionToken);
}

export async function getAuthUserBySessionToken(sessionToken: string) {
  return findAuthUserBySessionToken(sessionToken);
}

export async function deleteAuthSessionByToken(sessionToken: string) {
  await getDb()
    .delete(authSessions)
    .where(eq(authSessions.sessionTokenHash, hashAuthToken(sessionToken)));
}

export async function deleteCurrentAuthSession() {
  const sessionToken = await getCurrentSessionToken();

  if (!sessionToken) {
    return;
  }

  await deleteAuthSessionByToken(sessionToken);
}
