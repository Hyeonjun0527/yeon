import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";

import { getDb } from "@/server/db";
import { users, userIdentities } from "@/server/db/schema";
import {
  createAuthSession,
  applyAuthSessionCookie,
} from "@/server/auth/session";

export const runtime = "nodejs";

const DEV_USER_EMAIL = "dev@yeon.local";
const DEV_USER_DISPLAY_NAME = "개발자 계정";
const DEV_PROVIDER = "dev";
const DEV_PROVIDER_USER_ID = "dev-local-user";

function isDevLoginAllowed() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEV_LOGIN === "true"
  );
}

export async function GET() {
  if (!isDevLoginAllowed()) {
    return new NextResponse(null, { status: 404 });
  }

  const db = getDb();

  // 테스트 유저 find-or-create
  let [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEV_USER_EMAIL))
    .limit(1);

  if (!userRow) {
    const newId = randomUUID();
    await db.insert(users).values({
      id: newId,
      email: DEV_USER_EMAIL,
      displayName: DEV_USER_DISPLAY_NAME,
    });
    [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.email, DEV_USER_EMAIL))
      .limit(1);
  }

  // userIdentity find-or-create (session lookup에 필수)
  const [existingIdentity] = await db
    .select()
    .from(userIdentities)
    .where(
      and(
        eq(userIdentities.provider, DEV_PROVIDER),
        eq(userIdentities.providerUserId, DEV_PROVIDER_USER_ID),
      ),
    )
    .limit(1);

  if (!existingIdentity) {
    await db.insert(userIdentities).values({
      id: randomUUID(),
      userId: userRow!.id,
      provider: DEV_PROVIDER,
      providerUserId: DEV_PROVIDER_USER_ID,
      email: DEV_USER_EMAIL,
      displayName: DEV_USER_DISPLAY_NAME,
    });
  }

  const session = await createAuthSession(userRow!.id);

  const response = NextResponse.redirect(
    new URL(
      "/home",
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    ),
  );

  applyAuthSessionCookie(response, session);

  return response;
}
