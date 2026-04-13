import { authProviderSchema } from "@yeon/api-contract/auth";
import { z } from "zod";

export const DEV_LOGIN_DEFAULT_ACCOUNT_KEY = "default";

export const devLoginOptionSchema = z.object({
  accountKey: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1).max(80).nullable(),
  providers: z.array(authProviderSchema).min(1),
});

export type DevLoginOption = z.infer<typeof devLoginOptionSchema>;
