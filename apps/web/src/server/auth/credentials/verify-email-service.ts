import { and, eq, gt, isNull } from "drizzle-orm";

import { AuthFlowError, authErrorCodes } from "@/server/auth/auth-errors";
import { getDb } from "@/server/db";
import { emailVerificationTokens, users } from "@/server/db/schema";

export async function verifyEmailToken(token: string) {
  const db = getDb();

  const [row] = await db
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.token, token),
        isNull(emailVerificationTokens.consumedAt),
        gt(emailVerificationTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    throw new AuthFlowError(
      authErrorCodes.invalidVerificationToken,
      "인증 링크가 만료되었거나 사용할 수 없습니다. 새 인증 메일을 요청해 주세요.",
    );
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(emailVerificationTokens)
      .set({ consumedAt: now })
      .where(eq(emailVerificationTokens.token, token));
    await tx
      .update(users)
      .set({ emailVerifiedAt: now })
      .where(eq(users.id, row.userId));
  });

  return { userId: row.userId };
}
