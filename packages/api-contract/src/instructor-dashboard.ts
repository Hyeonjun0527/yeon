import { z } from "zod";

export const instructorRiskLevelSchema = z.enum(["high", "medium", "low"]);

export const studentCareSegmentSchema = z.enum([
  "needs-care",
  "follow-up",
  "watch",
  "stable",
]);

export const instructorDashboardMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  description: z.string(),
});

export const studentCareSegmentSummarySchema = z.object({
  key: studentCareSegmentSchema,
  label: z.string(),
  count: z.number().int().nonnegative(),
  description: z.string(),
});

export const priorityStudentCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  cohortName: z.string(),
  riskLevel: instructorRiskLevelSchema,
  careSegment: studentCareSegmentSchema,
  riskSummary: z.string(),
  recentChange: z.string(),
  recommendedAction: z.string(),
  nextCheckLabel: z.string(),
  tags: z.array(z.string()).min(1),
});

export const careHistoryEntrySchema = z.object({
  studentName: z.string(),
  actionLabel: z.string(),
  outcome: z.string(),
  recordedAtLabel: z.string(),
  nextCheckLabel: z.string().nullable(),
});

export const weeklyConceptFocusSchema = z.object({
  concept: z.string(),
  affectedStudentCount: z.number().int().nonnegative(),
  reason: z.string(),
});

export const instructorWeeklyReportSchema = z.object({
  summary: z.string(),
  coachMemo: z.string(),
  todayFocus: z.array(z.string()).min(1),
  conceptFocuses: z.array(weeklyConceptFocusSchema).min(1),
});

export const instructorDashboardResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  headline: z.string(),
  summary: z.string(),
  metrics: z.array(instructorDashboardMetricSchema).min(1),
  segments: z.array(studentCareSegmentSummarySchema).min(1),
  priorityStudents: z.array(priorityStudentCardSchema).min(1),
  careHistory: z.array(careHistoryEntrySchema).min(1),
  weeklyReport: instructorWeeklyReportSchema,
});

export type InstructorRiskLevel = z.infer<typeof instructorRiskLevelSchema>;
export type StudentCareSegment = z.infer<typeof studentCareSegmentSchema>;
export type InstructorDashboardMetric = z.infer<
  typeof instructorDashboardMetricSchema
>;
export type StudentCareSegmentSummary = z.infer<
  typeof studentCareSegmentSummarySchema
>;
export type PriorityStudentCard = z.infer<typeof priorityStudentCardSchema>;
export type CareHistoryEntry = z.infer<typeof careHistoryEntrySchema>;
export type WeeklyConceptFocus = z.infer<typeof weeklyConceptFocusSchema>;
export type InstructorWeeklyReport = z.infer<
  typeof instructorWeeklyReportSchema
>;
export type InstructorDashboardResponse = z.infer<
  typeof instructorDashboardResponseSchema
>;
