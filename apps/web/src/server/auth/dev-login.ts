import { authProviderSchema, type AuthProvider } from "@yeon/api-contract/auth";
import { desc, eq, inArray, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  DEV_LOGIN_DEFAULT_ACCOUNT_KEY,
  devLoginOptionSchema,
  type DevLoginOption,
} from "@/lib/auth/dev-login-options";
import { getDb } from "@/server/db";
import { userIdentities, users } from "@/server/db/schema";

const DEV_USER_EMAIL = "dev@yeon.local";
const DEV_USER_DISPLAY_NAME = "개발자 기본 계정";
const DEV_PROVIDER = "dev";
const DEV_PROVIDER_USER_ID = "dev-local-user";
const DEV_LOCAL_EMAIL_DOMAIN = "@yeon.local";
const DEV_LOCAL_EMAIL_PREFIX = "dev+local-";
const DEV_LOCAL_DISPLAY_NAME_PREFIX = "로컬 테스트 계정 ";

type UserRow = typeof users.$inferSelect;
type UserIdentityRow = typeof userIdentities.$inferSelect;

function normalizeDevProviders(identityRows: UserIdentityRow[]) {
  return Array.from(new Set(identityRows.map((identity) => identity.provider)))
    .filter(
      (provider): provider is AuthProvider =>
        authProviderSchema.safeParse(provider).success,
    )
    .sort();
}

function buildDevLoginOption(input: {
  accountKey: string;
  email: string;
  displayName: string | null;
  providers: AuthProvider[];
}) {
  return devLoginOptionSchema.parse(input);
}

function isDefaultDevAccount(user: UserRow, providers: AuthProvider[]) {
  return (
    user.email === DEV_USER_EMAIL &&
    providers.length === 1 &&
    providers[0] === DEV_PROVIDER
  );
}

function normalizeHostname(candidate: string | null | undefined) {
  if (!candidate) {
    return null;
  }

  const firstHost = candidate.split(",")[0]?.trim();

  if (!firstHost) {
    return null;
  }

  if (firstHost.startsWith("[")) {
    const closingIndex = firstHost.indexOf("]");

    if (closingIndex === -1) {
      return firstHost.toLowerCase();
    }

    return firstHost.slice(1, closingIndex).toLowerCase();
  }

  if (
    firstHost.includes(":") &&
    firstHost.indexOf(":") !== firstHost.lastIndexOf(":")
  ) {
    return firstHost.toLowerCase();
  }

  const colonIndex = firstHost.indexOf(":");

  if (colonIndex === -1) {
    return firstHost.toLowerCase();
  }

  return firstHost.slice(0, colonIndex).toLowerCase();
}

export function isLoopbackHostname(hostname: string | null | undefined) {
  const normalized = normalizeHostname(hostname);

  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized?.endsWith(".localhost") === true
  );
}

export function isDevLoginAllowed(hostname?: string | null) {
  return (
    process.env.ALLOW_DEV_LOGIN === "true" &&
    (process.env.NODE_ENV !== "production" || isLoopbackHostname(hostname))
  );
}

export function getRequestHostnameFromHostHeader(
  hostHeader: string | null | undefined,
) {
  return normalizeHostname(hostHeader);
}

export async function listDevLoginOptions(
  hostname?: string | null,
): Promise<DevLoginOption[]> {
  if (!isDevLoginAllowed(hostname)) {
    return [];
  }

  const db = getDb();
  const userRows = await db
    .select()
    .from(users)
    .orderBy(desc(users.lastLoginAt), desc(users.createdAt));

  const identityRows =
    userRows.length === 0
      ? []
      : await db
          .select()
          .from(userIdentities)
          .where(
            inArray(
              userIdentities.userId,
              userRows.map((user) => user.id),
            ),
          );

  const identitiesByUserId = new Map<string, UserIdentityRow[]>();

  identityRows.forEach((identity) => {
    const current = identitiesByUserId.get(identity.userId);

    if (current) {
      current.push(identity);
      return;
    }

    identitiesByUserId.set(identity.userId, [identity]);
  });

  const options = [
    buildDevLoginOption({
      accountKey: DEV_LOGIN_DEFAULT_ACCOUNT_KEY,
      email: DEV_USER_EMAIL,
      displayName: DEV_USER_DISPLAY_NAME,
      providers: [DEV_PROVIDER],
    }),
  ];

  userRows.forEach((user) => {
    const linkedIdentities = identitiesByUserId.get(user.id) ?? [];
    const providers = normalizeDevProviders(linkedIdentities);

    if (providers.length === 0 || isDefaultDevAccount(user, providers)) {
      return;
    }

    options.push(
      buildDevLoginOption({
        accountKey: user.id,
        email: user.email,
        displayName: user.displayName,
        providers,
      }),
    );
  });

  return options;
}

async function findOrCreateDefaultDevUser() {
  const db = getDb();
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

  return userRow!;
}

function createLocalDevAccountLabel() {
  return randomUUID().slice(0, 8);
}

export async function createDevLoginUser() {
  const label = createLocalDevAccountLabel();
  const email = `${DEV_LOCAL_EMAIL_PREFIX}${label}${DEV_LOCAL_EMAIL_DOMAIN}`;
  const displayName = `${DEV_LOCAL_DISPLAY_NAME_PREFIX}${label}`;
  const providerUserId = `dev-local-${label}-${randomUUID().slice(0, 8)}`;
  const db = getDb();
  const userId = randomUUID();

  await db.insert(users).values({
    id: userId,
    email,
    displayName,
  });

  await db.insert(userIdentities).values({
    id: randomUUID(),
    userId,
    provider: DEV_PROVIDER,
    providerUserId,
    email,
    displayName,
  });

  return userId;
}

export async function resolveDevLoginUserId(
  accountKey: string | null | undefined,
) {
  if (!accountKey || accountKey === DEV_LOGIN_DEFAULT_ACCOUNT_KEY) {
    return (await findOrCreateDefaultDevUser()).id;
  }

  const db = getDb();
  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, accountKey))
    .limit(1);

  if (!userRow) {
    return null;
  }

  const linkedIdentities = await db
    .select({ id: userIdentities.id })
    .from(userIdentities)
    .where(eq(userIdentities.userId, userRow.id))
    .limit(1);

  return linkedIdentities.length > 0 ? userRow.id : null;
}
