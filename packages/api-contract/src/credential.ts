import { z } from "zod";

const EMAIL_MAX_LENGTH = 320;
const DISPLAY_NAME_MAX_LENGTH = 80;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;

const emailSchema = z.string().email().max(EMAIL_MAX_LENGTH);

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, "비밀번호는 최소 8자 이상이어야 합니다.")
  .max(PASSWORD_MAX_LENGTH, "비밀번호는 최대 72자까지 입력할 수 있습니다.")
  .refine(
    (value) => !/\s/.test(value),
    "비밀번호에 공백을 포함할 수 없습니다.",
  );

const displayNameSchema = z
  .string()
  .min(1)
  .max(DISPLAY_NAME_MAX_LENGTH)
  .nullish();

export const credentialRegisterBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});
export type CredentialRegisterBody = z.infer<
  typeof credentialRegisterBodySchema
>;

export const credentialRegisterResponseSchema = z.object({
  requiresLinkToExistingAccount: z.boolean(),
  verificationEmailSent: z.boolean(),
});
export type CredentialRegisterResponse = z.infer<
  typeof credentialRegisterResponseSchema
>;

export const credentialLoginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
export type CredentialLoginBody = z.infer<typeof credentialLoginBodySchema>;

export const credentialLoginResponseSchema = z.object({
  userId: z.string().uuid(),
  expiresAt: z.string().datetime(),
});
export type CredentialLoginResponse = z.infer<
  typeof credentialLoginResponseSchema
>;

export const mobileCredentialLoginResponseSchema =
  credentialLoginResponseSchema.extend({
    sessionToken: z.string().min(1),
  });
export type MobileCredentialLoginResponse = z.infer<
  typeof mobileCredentialLoginResponseSchema
>;

export const credentialVerifyQuerySchema = z.object({
  token: z.string().uuid(),
});
export type CredentialVerifyQuery = z.infer<typeof credentialVerifyQuerySchema>;

export const credentialResetRequestBodySchema = z.object({
  email: emailSchema,
});
export type CredentialResetRequestBody = z.infer<
  typeof credentialResetRequestBodySchema
>;

export const credentialResetConfirmBodySchema = z.object({
  token: z.string().uuid(),
  newPassword: passwordSchema,
});
export type CredentialResetConfirmBody = z.infer<
  typeof credentialResetConfirmBodySchema
>;

export const credentialSetPasswordBodySchema = z.object({
  password: passwordSchema,
});
export type CredentialSetPasswordBody = z.infer<
  typeof credentialSetPasswordBodySchema
>;

export const credentialResendVerificationBodySchema = z.object({
  email: emailSchema,
});
export type CredentialResendVerificationBody = z.infer<
  typeof credentialResendVerificationBodySchema
>;

export const credentialPasswordPolicy = {
  minLength: PASSWORD_MIN_LENGTH,
  maxLength: PASSWORD_MAX_LENGTH,
} as const;
