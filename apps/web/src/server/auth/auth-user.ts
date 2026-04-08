import {
  authUserDtoSchema,
  type AuthProvider,
  type AuthUserDto,
} from "@yeon/api-contract/auth";

import { userIdentities, users } from "@/server/db/schema";

type UserRow = typeof users.$inferSelect;
type UserIdentityRow = typeof userIdentities.$inferSelect;

export function toAuthUserDto(
  user: UserRow,
  identities: UserIdentityRow[],
): AuthUserDto {
  const providers = Array.from(
    new Set(identities.map((identity) => identity.provider as AuthProvider)),
  ).sort();

  return authUserDtoSchema.parse({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    lastLoginAt: user.lastLoginAt.toISOString(),
    providers,
  });
}
