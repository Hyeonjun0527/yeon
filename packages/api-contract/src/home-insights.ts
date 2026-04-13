import { z } from "zod";

export const homeInsightBannerKeyValues = [
  "counseling_none",
  "counseling_warning",
] as const;

export const homeInsightBannerKeySchema = z.enum(homeInsightBannerKeyValues);

export const homeInsightBannerDismissalSchema = z.object({
  bannerKey: homeInsightBannerKeySchema,
  hiddenUntil: z.string().datetime().nullable(),
});

export const homeInsightBannerStateResponseSchema = z.object({
  dismissals: z.array(homeInsightBannerDismissalSchema),
});

export const dismissHomeInsightBannerBodySchema = z.object({
  bannerKey: homeInsightBannerKeySchema,
});

export const dismissHomeInsightBannerResponseSchema = z.object({
  dismissal: homeInsightBannerDismissalSchema,
});

export type HomeInsightBannerKey = z.infer<typeof homeInsightBannerKeySchema>;
export type HomeInsightBannerDismissal = z.infer<
  typeof homeInsightBannerDismissalSchema
>;
export type HomeInsightBannerStateResponse = z.infer<
  typeof homeInsightBannerStateResponseSchema
>;
export type DismissHomeInsightBannerBody = z.infer<
  typeof dismissHomeInsightBannerBodySchema
>;
export type DismissHomeInsightBannerResponse = z.infer<
  typeof dismissHomeInsightBannerResponseSchema
>;
