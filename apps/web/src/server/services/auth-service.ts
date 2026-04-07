import type { AuthUserDto } from "@yeon/api-contract";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { DatabaseError } from "pg";

import { toAuthUserDto } from "@/server/auth/auth-user";
import { AuthFlowError, authErrorCodes } from "@/server/auth/auth-errors";
import type { SocialIdentityProfile } from "@/server/auth/social-providers";
import { getDb } from "@/server/db";
import { userIdentities, users } from "@/server/db/schema";

function normalizeEmail(value: string | null) {
  return value?.trim().toLowerCase() ?? null;
}

function normalizeDisplayName(value: string | null) {
  const trimmed = value?.trim();

  return trimmed ? trimmed.slice(0, 80) : null;
}

function normalizeAvatarUrl(value: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).toString().slice(0, 2048);
  } catch {
    return null;
  }
}

async function performSocialLoginUpsert(
  profile: SocialIdentityProfile,
  attempt: number,
): Promise<AuthUserDto> {
  const db = getDb();
  const normalizedEmail = normalizeEmail(profile.email);
  const normalizedVerifiedEmail = profile.emailVerified
    ? normalizedEmail
    : null;
  const normalizedDisplayName = normalizeDisplayName(profile.displayName);
  const normalizedAvatarUrl = normalizeAvatarUrl(profile.avatarUrl);
  const now = new Date();

  try {
    return await db.transaction(async (tx) => {
      const [existingIdentity] = await tx
        .select()
        .from(userIdentities)
        .where(
          and(
            eq(userIdentities.provider, profile.provider),
            eq(userIdentities.providerUserId, profile.providerUserId),
          ),
        )
        .limit(1);

      if (existingIdentity) {
        const [existingUser] = await tx
          .select()
          .from(users)
          .where(eq(users.id, existingIdentity.userId))
          .limit(1);

        if (!existingUser) {
          throw new AuthFlowError(
            authErrorCodes.serverError,
            "연결된 사용자를 찾지 못했습니다.",
          );
        }

        let nextEmail = existingUser.email;

        if (
          normalizedVerifiedEmail &&
          normalizedVerifiedEmail !== existingUser.email
        ) {
          const [emailOwner] = await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, normalizedVerifiedEmail))
            .limit(1);

          if (!emailOwner || emailOwner.id === existingUser.id) {
            nextEmail = normalizedVerifiedEmail;
          }
        }

        const [updatedUser] = await tx
          .update(users)
          .set({
            email: nextEmail,
            displayName: normalizedDisplayName ?? existingUser.displayName,
            avatarUrl: normalizedAvatarUrl ?? existingUser.avatarUrl,
            lastLoginAt: now,
            updatedAt: now,
          })
          .where(eq(users.id, existingUser.id))
          .returning();

        await tx
          .update(userIdentities)
          .set({
            email: normalizedVerifiedEmail ?? existingIdentity.email,
            displayName: normalizedDisplayName ?? existingIdentity.displayName,
            avatarUrl: normalizedAvatarUrl ?? existingIdentity.avatarUrl,
            lastLoginAt: now,
          })
          .where(eq(userIdentities.id, existingIdentity.id));

        const linkedIdentities = await tx
          .select()
          .from(userIdentities)
          .where(eq(userIdentities.userId, updatedUser.id));

        return toAuthUserDto(updatedUser, linkedIdentities);
      }

      if (!normalizedVerifiedEmail) {
        if (!normalizedEmail) {
          throw new AuthFlowError(
            authErrorCodes.emailRequired,
            "이메일 제공 동의가 필요합니다.",
          );
        }

        throw new AuthFlowError(
          authErrorCodes.emailNotVerified,
          "검증된 이메일 계정만 로그인할 수 있습니다.",
        );
      }

      const [existingUserByEmail] = await tx
        .select()
        .from(users)
        .where(eq(users.email, normalizedVerifiedEmail))
        .limit(1);

      const targetUser = existingUserByEmail
        ? (
            await tx
              .update(users)
              .set({
                displayName:
                  normalizedDisplayName ?? existingUserByEmail.displayName,
                avatarUrl: normalizedAvatarUrl ?? existingUserByEmail.avatarUrl,
                lastLoginAt: now,
                updatedAt: now,
              })
              .where(eq(users.id, existingUserByEmail.id))
              .returning()
          )[0]
        : (
            await tx
              .insert(users)
              .values({
                id: randomUUID(),
                email: normalizedVerifiedEmail,
                displayName: normalizedDisplayName,
                avatarUrl: normalizedAvatarUrl,
                lastLoginAt: now,
              })
              .returning()
          )[0];

      const [sameProviderIdentity] = await tx
        .select()
        .from(userIdentities)
        .where(
          and(
            eq(userIdentities.userId, targetUser.id),
            eq(userIdentities.provider, profile.provider),
          ),
        )
        .limit(1);

      if (
        sameProviderIdentity &&
        sameProviderIdentity.providerUserId !== profile.providerUserId
      ) {
        throw new AuthFlowError(
          authErrorCodes.providerConflict,
          "동일 공급자에 다른 계정이 이미 연결되어 있습니다.",
        );
      }

      if (!sameProviderIdentity) {
        await tx.insert(userIdentities).values({
          id: randomUUID(),
          userId: targetUser.id,
          provider: profile.provider,
          providerUserId: profile.providerUserId,
          email: normalizedVerifiedEmail,
          displayName: normalizedDisplayName,
          avatarUrl: normalizedAvatarUrl,
          lastLoginAt: now,
        });
      }

      const linkedIdentities = await tx
        .select()
        .from(userIdentities)
        .where(eq(userIdentities.userId, targetUser.id));

      return toAuthUserDto(targetUser, linkedIdentities);
    });
  } catch (error) {
    if (
      error instanceof DatabaseError &&
      error.code === "23505" &&
      attempt < 1
    ) {
      return performSocialLoginUpsert(profile, attempt + 1);
    }

    throw error;
  }
}

export async function upsertSocialLogin(
  profile: SocialIdentityProfile,
): Promise<AuthUserDto> {
  return performSocialLoginUpsert(profile, 0);
}
