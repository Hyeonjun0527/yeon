import { and, eq, gt, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { AuthFlowError, authErrorCodes } from "@/server/auth/auth-errors";
import { getAppOrigin } from "@/server/auth/constants";
import { sendTransactionalEmail } from "@/server/email/email-sender";
import { buildPasswordResetEmail } from "@/server/email/email-templates";
import { getDb } from "@/server/db";
import {
  authSessions,
  loginAttempts,
  passwordCredentials,
  passwordResetTokens,
  users,
} from "@/server/db/schema";

import { hashPassword } from "./password-hash";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const ENUMERATION_DEFENSE_DELAY_MS = 120;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function enumerationDefenseDelay() {
  await new Promise<void>((resolve) =>
    setTimeout(resolve, ENUMERATION_DEFENSE_DELAY_MS),
  );
}

export async function requestPasswordReset(params: {
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
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await db.transaction(async (tx) => {
    await tx
      .update(passwordResetTokens)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.consumedAt),
        ),
      );

    await tx.insert(passwordResetTokens).values({
      token,
      userId: user.id,
      expiresAt,
    });
  });

  const appOrigin = getAppOrigin(params.originFallback);
  const { subject, html } = buildPasswordResetEmail({ token, appOrigin });

  try {
    await sendTransactionalEmail({ to: email, subject, html });
  } catch (error) {
    console.error("비밀번호 재설정 메일 발송 실패", {
      email,
      error,
    });
  }
}

export async function confirmPasswordReset(params: {
  token: string;
  newPassword: string;
}) {
  const db = getDb();

  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, params.token),
        isNull(passwordResetTokens.consumedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    throw new AuthFlowError(
      authErrorCodes.invalidResetToken,
      "비밀번호 재설정 링크가 만료되었거나 사용할 수 없습니다. 재설정을 다시 요청해 주세요.",
    );
  }

  const passwordHash = await hashPassword(params.newPassword);
  const now = new Date();

  const [userRow] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);

  await db.transaction(async (tx) => {
    await tx
      .update(passwordResetTokens)
      .set({ consumedAt: now })
      .where(eq(passwordResetTokens.token, params.token));
    await tx
      .update(passwordCredentials)
      .set({ passwordHash, passwordUpdatedAt: now })
      .where(eq(passwordCredentials.userId, row.userId));
    await tx.delete(authSessions).where(eq(authSessions.userId, row.userId));
    if (userRow) {
      await tx
        .delete(loginAttempts)
        .where(
          and(
            eq(loginAttempts.email, userRow.email.toLowerCase()),
            eq(loginAttempts.success, false),
          ),
        );
    }
  });

  return { userId: row.userId };
}
