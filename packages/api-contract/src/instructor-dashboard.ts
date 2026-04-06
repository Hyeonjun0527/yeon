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

export const instructorDashboardBriefingSchema = z.object({
  label: z.string(),
  headline: z.string(),
  summary: z.string(),
  actionItems: z.array(z.string()).min(1),
  supportNote: z.string(),
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

export const learningSignalEventTypeSchema = z.enum([
  "attendance",
  "assignment",
  "question",
  "coaching-note",
]);

export const learningSignalEventSchema = z.object({
  id: z.string(),
  type: learningSignalEventTypeSchema,
  typeLabel: z.string(),
  title: z.string(),
  summary: z.string(),
  occurredAtLabel: z.string(),
});

export const highlightedStudentDetailSchema = z.object({
  studentId: z.string(),
  statusHeadline: z.string(),
  aiInterpretation: z.string(),
  coachFocus: z.string(),
  timeline: z.array(learningSignalEventSchema).min(1),
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
  generatedLabel: z.string(),
  headline: z.string(),
  summary: z.string(),
  briefing: instructorDashboardBriefingSchema,
  metrics: z.array(instructorDashboardMetricSchema).min(1),
  segments: z.array(studentCareSegmentSummarySchema).min(1),
  priorityStudents: z.array(priorityStudentCardSchema).min(1),
  highlightedStudentDetail: highlightedStudentDetailSchema,
  careHistory: z.array(careHistoryEntrySchema).min(1),
  weeklyReport: instructorWeeklyReportSchema,
});

export type InstructorRiskLevel = z.infer<typeof instructorRiskLevelSchema>;
export type StudentCareSegment = z.infer<typeof studentCareSegmentSchema>;
export type InstructorDashboardMetric = z.infer<
  typeof instructorDashboardMetricSchema
>;
export type InstructorDashboardBriefing = z.infer<
  typeof instructorDashboardBriefingSchema
>;
export type StudentCareSegmentSummary = z.infer<
  typeof studentCareSegmentSummarySchema
>;
export type PriorityStudentCard = z.infer<typeof priorityStudentCardSchema>;
export type LearningSignalEventType = z.infer<
  typeof learningSignalEventTypeSchema
>;
export type LearningSignalEvent = z.infer<typeof learningSignalEventSchema>;
export type HighlightedStudentDetail = z.infer<
  typeof highlightedStudentDetailSchema
>;
export type CareHistoryEntry = z.infer<typeof careHistoryEntrySchema>;
export type WeeklyConceptFocus = z.infer<typeof weeklyConceptFocusSchema>;
export type InstructorWeeklyReport = z.infer<
  typeof instructorWeeklyReportSchema
>;
export type InstructorDashboardResponse = z.infer<
  typeof instructorDashboardResponseSchema
>;
