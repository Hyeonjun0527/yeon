import { and, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import { loginAttempts } from "@/server/db/schema";

const ACCOUNT_LOCK_WINDOW_MS = 10 * 60 * 1000;
const ACCOUNT_LOCK_FAIL_THRESHOLD = 5;

const IP_LOGIN_WINDOW_MS = 60 * 1000;
const IP_LOGIN_LIMIT_PER_MINUTE = 30;

const EMAIL_SEND_WINDOW_MS = 60 * 1000;
const EMAIL_SEND_LIMIT_PER_MINUTE = 5;

export async function recordLoginAttempt(params: {
  email: string;
  ipAddress: string;
  success: boolean;
}) {
  await getDb().insert(loginAttempts).values({
    email: params.email,
    ipAddress: params.ipAddress,
    success: params.success,
  });
}

export async function isAccountLocked(email: string): Promise<boolean> {
  const since = new Date(Date.now() - ACCOUNT_LOCK_WINDOW_MS);
  const rows = await getDb()
    .select({ id: loginAttempts.id })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email),
        eq(loginAttempts.success, false),
        gte(loginAttempts.attemptedAt, since),
      ),
    )
    .limit(ACCOUNT_LOCK_FAIL_THRESHOLD);

  return rows.length >= ACCOUNT_LOCK_FAIL_THRESHOLD;
}

export async function isIpLoginRateLimited(
  ipAddress: string,
): Promise<boolean> {
  const since = new Date(Date.now() - IP_LOGIN_WINDOW_MS);
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ipAddress, ipAddress),
        gte(loginAttempts.attemptedAt, since),
      ),
    );

  const count = row?.count ?? 0;

  return count >= IP_LOGIN_LIMIT_PER_MINUTE;
}

const emailSendBuckets = new Map<string, number[]>();

export function isEmailSendRateLimited(ipAddress: string): boolean {
  const now = Date.now();
  const since = now - EMAIL_SEND_WINDOW_MS;
  const recent = (emailSendBuckets.get(ipAddress) ?? []).filter(
    (timestamp) => timestamp > since,
  );

  if (recent.length >= EMAIL_SEND_LIMIT_PER_MINUTE) {
    emailSendBuckets.set(ipAddress, recent);
    return true;
  }

  recent.push(now);
  emailSendBuckets.set(ipAddress, recent);

  return false;
}

export const credentialRateLimitPolicy = {
  accountLock: {
    windowMs: ACCOUNT_LOCK_WINDOW_MS,
    failThreshold: ACCOUNT_LOCK_FAIL_THRESHOLD,
  },
  ipLogin: {
    windowMs: IP_LOGIN_WINDOW_MS,
    limitPerMinute: IP_LOGIN_LIMIT_PER_MINUTE,
  },
  emailSend: {
    windowMs: EMAIL_SEND_WINDOW_MS,
    limitPerMinute: EMAIL_SEND_LIMIT_PER_MINUTE,
  },
} as const;
