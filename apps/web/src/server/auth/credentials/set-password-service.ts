import { eq } from "drizzle-orm";

import { AuthFlowError, authErrorCodes } from "@/server/auth/auth-errors";
import { getDb } from "@/server/db";
import { passwordCredentials } from "@/server/db/schema";

import { hashPassword } from "./password-hash";

const PG_UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === PG_UNIQUE_VIOLATION
  );
}

export async function setCredentialPasswordForUser(params: {
  userId: string;
  newPassword: string;
}) {
  const db = getDb();

  const [existing] = await db
    .select({ userId: passwordCredentials.userId })
    .from(passwordCredentials)
    .where(eq(passwordCredentials.userId, params.userId))
    .limit(1);

  if (existing) {
    throw new AuthFlowError(
      authErrorCodes.emailAlreadyRegistered,
      "이미 비밀번호가 등록된 계정입니다. 비밀번호 재설정을 이용해 주세요.",
    );
  }

  const passwordHash = await hashPassword(params.newPassword);

  try {
    await db.insert(passwordCredentials).values({
      userId: params.userId,
      passwordHash,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AuthFlowError(
        authErrorCodes.emailAlreadyRegistered,
        "이미 비밀번호가 등록된 계정입니다. 비밀번호 재설정을 이용해 주세요.",
      );
    }
    throw error;
  }
}
