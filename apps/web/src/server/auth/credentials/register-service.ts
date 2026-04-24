import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type {
  CredentialRegisterBody,
  CredentialRegisterResponse,
} from "@yeon/api-contract/credential";

import { AuthFlowError, authErrorCodes } from "@/server/auth/auth-errors";
import { getAppOrigin } from "@/server/auth/constants";
import { sendTransactionalEmail } from "@/server/email/email-sender";
import { buildEmailVerificationEmail } from "@/server/email/email-templates";
import { getDb } from "@/server/db";
import {
  emailVerificationTokens,
  passwordCredentials,
  users,
} from "@/server/db/schema";

import { hashPassword } from "./password-hash";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const PG_UNIQUE_VIOLATION = "23505";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === PG_UNIQUE_VIOLATION
  );
}

type ExistingUserLookupResult =
  | { kind: "new" }
  | { kind: "credential_exists" }
  | { kind: "social_only"; userId: string };

async function lookupExistingUserByEmail(
  email: string,
): Promise<ExistingUserLookupResult> {
  const db = getDb();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (!existing) {
    return { kind: "new" };
  }

  const [existingCredential] = await db
    .select({ userId: passwordCredentials.userId })
    .from(passwordCredentials)
    .where(eq(passwordCredentials.userId, existing.id))
    .limit(1);

  if (existingCredential) {
    return { kind: "credential_exists" };
  }

  return { kind: "social_only", userId: existing.id };
}

function handleExistingLookup(
  result: ExistingUserLookupResult,
): CredentialRegisterResponse | null {
  if (result.kind === "credential_exists") {
    throw new AuthFlowError(
      authErrorCodes.emailAlreadyRegistered,
      "이미 가입된 이메일입니다. 로그인 또는 비밀번호 재설정을 이용해 주세요.",
    );
  }

  if (result.kind === "social_only") {
    return {
      requiresLinkToExistingAccount: true,
      verificationEmailSent: false,
    };
  }

  return null;
}

export async function registerCredentialAccount(
  body: CredentialRegisterBody,
  context: { originFallback?: string },
): Promise<CredentialRegisterResponse> {
  const email = normalizeEmail(body.email);
  const db = getDb();

  const existingResponse = handleExistingLookup(
    await lookupExistingUserByEmail(email),
  );
  if (existingResponse) {
    return existingResponse;
  }

  const newUserId = randomUUID();
  const passwordHash = await hashPassword(body.password);
  const verificationToken = randomUUID();
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  try {
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: newUserId,
        email,
        displayName: body.displayName ?? null,
        avatarUrl: null,
      });
      await tx.insert(passwordCredentials).values({
        userId: newUserId,
        passwordHash,
      });
      await tx.insert(emailVerificationTokens).values({
        token: verificationToken,
        userId: newUserId,
        expiresAt,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const raceResult = await lookupExistingUserByEmail(email);
      const raceResponse = handleExistingLookup(raceResult);
      if (raceResponse) {
        return raceResponse;
      }
      throw new AuthFlowError(
        authErrorCodes.emailAlreadyRegistered,
        "이미 가입된 이메일입니다. 로그인 또는 비밀번호 재설정을 이용해 주세요.",
      );
    }
    throw error;
  }

  const appOrigin = getAppOrigin(context.originFallback);
  const { subject, html } = buildEmailVerificationEmail({
    token: verificationToken,
    appOrigin,
  });

  let verificationEmailSent = true;
  try {
    await sendTransactionalEmail({ to: email, subject, html });
  } catch (error) {
    console.error("가입 인증 메일 발송 실패", {
      email,
      error,
    });
    verificationEmailSent = false;
  }

  return {
    requiresLinkToExistingAccount: false,
    verificationEmailSent,
  };
}
