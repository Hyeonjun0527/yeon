import { eq } from "drizzle-orm";

import { AuthFlowError, authErrorCodes } from "@/server/auth/auth-errors";
import {
  isAccountLocked,
  isIpLoginRateLimited,
  recordLoginAttempt,
} from "@/server/auth/rate-limit";
import { createAuthSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { passwordCredentials, users } from "@/server/db/schema";

import { hashPassword, verifyPassword } from "./password-hash";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

let cachedDummyHash: string | null = null;

async function getDummyHash(): Promise<string> {
  if (!cachedDummyHash) {
    cachedDummyHash = await hashPassword(
      "yeon-dummy-password-for-timing-defense-only",
    );
  }
  return cachedDummyHash;
}

async function runTimingSafeDummyVerify(rawPassword: string): Promise<void> {
  const dummyHash = await getDummyHash();
  await verifyPassword(rawPassword, dummyHash);
}

export async function loginWithCredential(params: {
  email: string;
  password: string;
  ipAddress: string;
}) {
  const email = normalizeEmail(params.email);

  if (await isIpLoginRateLimited(params.ipAddress)) {
    throw new AuthFlowError(
      authErrorCodes.rateLimitExceeded,
      "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  if (await isAccountLocked(email)) {
    throw new AuthFlowError(
      authErrorCodes.accountLocked,
      "로그인 시도가 너무 많아 계정이 잠시 잠겼습니다. 10분 후 다시 시도해 주세요.",
    );
  }

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    await runTimingSafeDummyVerify(params.password);
    await recordLoginAttempt({ email, ipAddress: params.ipAddress, success: false });
    throw new AuthFlowError(
      authErrorCodes.invalidCredentials,
      "이메일 또는 비밀번호가 올바르지 않습니다.",
    );
  }

  const [credential] = await db
    .select()
    .from(passwordCredentials)
    .where(eq(passwordCredentials.userId, user.id))
    .limit(1);

  if (!credential) {
    await runTimingSafeDummyVerify(params.password);
    await recordLoginAttempt({ email, ipAddress: params.ipAddress, success: false });
    throw new AuthFlowError(
      authErrorCodes.invalidCredentials,
      "이메일 또는 비밀번호가 올바르지 않습니다.",
    );
  }

  const passwordMatches = await verifyPassword(
    params.password,
    credential.passwordHash,
  );

  if (!passwordMatches) {
    await recordLoginAttempt({ email, ipAddress: params.ipAddress, success: false });
    throw new AuthFlowError(
      authErrorCodes.invalidCredentials,
      "이메일 또는 비밀번호가 올바르지 않습니다.",
    );
  }

  if (!user.emailVerifiedAt) {
    await recordLoginAttempt({ email, ipAddress: params.ipAddress, success: false });
    throw new AuthFlowError(
      authErrorCodes.emailNotVerified,
      "이메일 인증이 완료되지 않았습니다. 받은 인증 메일의 링크를 눌러 인증을 완료해 주세요.",
    );
  }

  await recordLoginAttempt({ email, ipAddress: params.ipAddress, success: true });
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  const session = await createAuthSession(user.id);

  return {
    userId: user.id,
    session,
  };
}
