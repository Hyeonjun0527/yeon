import { z } from "zod";

export const authProviderSchema = z.enum(["google", "kakao"]);

export const authUserDtoSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1).max(80).nullable(),
  avatarUrl: z.string().url().max(2048).nullable(),
  lastLoginAt: z.string().datetime(),
  providers: z.array(authProviderSchema).min(1),
});

export const authSessionResponseSchema = z.object({
  authenticated: z.boolean(),
  user: authUserDtoSchema.nullable(),
});

export type AuthProvider = z.infer<typeof authProviderSchema>;
export type AuthUserDto = z.infer<typeof authUserDtoSchema>;
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;
