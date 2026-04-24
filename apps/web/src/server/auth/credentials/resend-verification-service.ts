import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getAppOrigin } from "@/server/auth/constants";
import { sendTransactionalEmail } from "@/server/email/email-sender";
import { buildEmailVerificationEmail } from "@/server/email/email-templates";
import { getDb } from "@/server/db";
import {
  emailVerificationTokens,
  passwordCredentials,
  users,
} from "@/server/db/schema";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const ENUMERATION_DEFENSE_DELAY_MS = 100;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function enumerationDefenseDelay() {
  await new Promise<void>((resolve) =>
    setTimeout(resolve, ENUMERATION_DEFENSE_DELAY_MS),
  );
}

export async function resendVerificationEmail(params: {
  email: string;
  originFallback?: string;
}) {
  const email = normalizeEmail(params.email);
  const db = getDb();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    await enumerationDefenseDelay();
    return;
  }

  if (user.emailVerifiedAt) {
    await enumerationDefenseDelay();
    return;
  }

  const [credential] = await db
    .select({ userId: passwordCredentials.userId })
    .from(passwordCredentials)
    .where(eq(passwordCredentials.userId, user.id))
    .limit(1);

  if (!credential) {
    await enumerationDefenseDelay();
    return;
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await db.transaction(async (tx) => {
    await tx
      .update(emailVerificationTokens)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(emailVerificationTokens.userId, user.id),
          isNull(emailVerificationTokens.consumedAt),
        ),
      );

    await tx.insert(emailVerificationTokens).values({
      token,
      userId: user.id,
      expiresAt,
    });
  });

  const appOrigin = getAppOrigin(params.originFallback);
  const { subject, html } = buildEmailVerificationEmail({ token, appOrigin });

  try {
    await sendTransactionalEmail({ to: email, subject, html });
  } catch (error) {
    console.error("인증 메일 재발송 실패", { email, error });
  }
}
