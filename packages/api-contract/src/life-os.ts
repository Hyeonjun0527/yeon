import { z } from "zod";
import {
  lifeOsBlockKeys,
  lifeOsCategories,
  lifeOsOutcomes,
  lifeOsPatternTypes,
  lifeOsReportPeriodTypes,
} from "@yeon/domain/life-os";

export const LIFE_OS_API_PATHS = {
  days: "/api/v1/life-os/days",
  dayByDate(localDate: string) {
    return `/api/v1/life-os/days/${encodeURIComponent(localDate)}`;
  },
  dailyReport(localDate: string) {
    return `/api/v1/life-os/reports/daily?localDate=${encodeURIComponent(localDate)}`;
  },
  weeklyReport(periodStart: string, periodEnd: string) {
    const search = new URLSearchParams({ periodStart, periodEnd });
    return `/api/v1/life-os/reports/weekly?${search.toString()}`;
  },
} as const;

export const lifeOsLocalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다.");
export const lifeOsCategorySchema = z.enum(lifeOsCategories);
export const lifeOsOutcomeSchema = z.enum(lifeOsOutcomes);
export const lifeOsBlockKeySchema = z.enum(lifeOsBlockKeys);
export const lifeOsReportPeriodTypeSchema = z.enum(lifeOsReportPeriodTypes);
export const lifeOsPatternTypeSchema = z.enum(lifeOsPatternTypes);
export const lifeOsConfidenceSchema = z.enum(["high", "medium", "low"]);

export const lifeOsHourEntrySchema = z.object({
  hour: z.number().int().min(0).max(23),
  goalText: z.string().max(500).default(""),
  actionText: z.string().max(500).default(""),
  goalCategory: lifeOsCategorySchema.nullable().optional(),
  actionCategory: lifeOsCategorySchema.nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});

export const upsertLifeOsDayBodySchema = z.object({
  localDate: lifeOsLocalDateSchema,
  timezone: z.string().min(1).max(80).default("Asia/Seoul"),
  mindset: z.string().max(4000).default(""),
  backlogText: z.string().max(10000).default(""),
  entries: z.array(lifeOsHourEntrySchema).max(24).default([]),
});

export const lifeOsDayDtoSchema = upsertLifeOsDayBodySchema.extend({
  id: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const lifeOsDayResponseSchema = z.object({
  day: lifeOsDayDtoSchema,
});

export const lifeOsDaysResponseSchema = z.object({
  days: z.array(lifeOsDayDtoSchema),
});

export const lifeOsHourClassificationSchema = z.object({
  hour: z.number().int().min(0).max(23),
  outcome: lifeOsOutcomeSchema,
  goalCategory: lifeOsCategorySchema,
  actionCategory: lifeOsCategorySchema,
  overplanned: z.boolean(),
  confidence: lifeOsConfidenceSchema,
  reason: z.string(),
});

export const lifeOsDailyMetricsSchema = z.object({
  localDate: lifeOsLocalDateSchema,
  plannedHours: z.number().int().nonnegative(),
  actionHours: z.number().int().nonnegative(),
  matchedHours: z.number().int().nonnegative(),
  overplannedHours: z.number().int().nonnegative(),
  restInsteadOfPlanHours: z.number().int().nonnegative(),
  unrelatedActionHours: z.number().int().nonnegative(),
  spilloverHours: z.number().int().nonnegative(),
  overplanningScore: z.number().int().nonnegative(),
  mismatchByBlock: z.object({
    "0-7": z.number().int().nonnegative(),
    "8-15": z.number().int().nonnegative(),
    "16-23": z.number().int().nonnegative(),
  }),
  classifications: z.array(lifeOsHourClassificationSchema),
  caveat: z.string().optional(),
});

export const lifeOsWeeklyMetricsSchema = z.object({
  periodStart: lifeOsLocalDateSchema,
  periodEnd: lifeOsLocalDateSchema,
  days: z.array(lifeOsDailyMetricsSchema),
  plannedHours: z.number().int().nonnegative(),
  actionHours: z.number().int().nonnegative(),
  matchedHours: z.number().int().nonnegative(),
  overplannedHours: z.number().int().nonnegative(),
  overplanningScore: z.number().int().nonnegative(),
  caveat: z.string().optional(),
});

export const lifeOsPatternSchema = z.object({
  type: lifeOsPatternTypeSchema,
  title: z.string(),
  evidence: z.string(),
  affectedHours: z.array(z.number().int().min(0).max(23)),
  affectedCategories: z.array(lifeOsCategorySchema),
  confidence: lifeOsConfidenceSchema,
});

export const lifeOsRecommendationSchema = z.object({
  title: z.string(),
  evidence: z.string(),
  suggestedAdjustment: z.string(),
  confidence: lifeOsConfidenceSchema,
  affectedHours: z.array(z.number().int().min(0).max(23)),
  affectedCategories: z.array(lifeOsCategorySchema),
});

export const lifeOsReportSchema = z.object({
  periodType: lifeOsReportPeriodTypeSchema,
  periodStart: lifeOsLocalDateSchema,
  periodEnd: lifeOsLocalDateSchema,
  metrics: z.union([lifeOsDailyMetricsSchema, lifeOsWeeklyMetricsSchema]),
  patterns: z.array(lifeOsPatternSchema),
  recommendations: z.array(lifeOsRecommendationSchema),
  generatedAt: z.string().datetime(),
  aiSummary: z.string().nullable().optional(),
});

export const lifeOsReportResponseSchema = z.object({
  report: lifeOsReportSchema,
});

export const lifeOsDailyReportQuerySchema = z.object({
  localDate: lifeOsLocalDateSchema,
});

export const lifeOsWeeklyReportQuerySchema = z.object({
  periodStart: lifeOsLocalDateSchema,
  periodEnd: lifeOsLocalDateSchema,
});

export type LifeOsHourEntryDto = z.infer<typeof lifeOsHourEntrySchema>;
export type UpsertLifeOsDayBody = z.infer<typeof upsertLifeOsDayBodySchema>;
export type LifeOsDayDto = z.infer<typeof lifeOsDayDtoSchema>;
export type LifeOsDayResponse = z.infer<typeof lifeOsDayResponseSchema>;
export type LifeOsDaysResponse = z.infer<typeof lifeOsDaysResponseSchema>;
export type LifeOsReportResponse = z.infer<typeof lifeOsReportResponseSchema>;
export type LifeOsDailyReportQuery = z.infer<
  typeof lifeOsDailyReportQuerySchema
>;
export type LifeOsWeeklyReportQuery = z.infer<
  typeof lifeOsWeeklyReportQuerySchema
>;
