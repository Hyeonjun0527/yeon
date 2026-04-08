import { z } from "zod";

import {
  careHistoryEntrySchema,
  instructorRiskLevelSchema,
  instructorWeeklyReportSchema,
  learningSignalEventSchema,
  studentCareSegmentSchema,
} from "./instructor-dashboard";

export type {
  CareHistoryEntry,
  InstructorRiskLevel,
  InstructorWeeklyReport,
  LearningSignalEvent,
  LearningSignalEventType,
  StudentCareSegment,
} from "./instructor-dashboard";

export const instructorWorkspaceSummarySchema = z.object({
  coachName: z.string(),
  organizationName: z.string(),
  focusWindowLabel: z.string(),
  coverageLabel: z.string(),
});

export const cohortWorkspaceSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  stageLabel: z.string(),
  studentCount: z.number().int().nonnegative(),
  needsCareCount: z.number().int().nonnegative(),
  followUpCount: z.number().int().nonnegative(),
  agenda: z.string(),
});

export const workspaceStudentSchema = z.object({
  id: z.string(),
  name: z.string(),
  cohortName: z.string(),
  stageLabel: z.string(),
  ownerLabel: z.string(),
  priorityOrder: z.number().int().positive(),
  riskLevel: instructorRiskLevelSchema,
  careSegment: studentCareSegmentSchema,
  currentStatus: z.string(),
  latestSignal: z.string(),
  recentChange: z.string(),
  nextCheckLabel: z.string(),
  tags: z.array(z.string()).min(1),
});

export const studentCareNoteSchema = z.object({
  id: z.string(),
  label: z.string(),
  body: z.string(),
  recordedAtLabel: z.string(),
  authorLabel: z.string(),
});

export const workspaceStudentDetailSchema = z.object({
  studentId: z.string(),
  statusHeadline: z.string(),
  aiInterpretation: z.string(),
  coachFocus: z.string(),
  recommendedMessageDraft: z.string(),
  blockers: z.array(z.string()).min(1),
  nextBestActions: z.array(z.string()).min(1),
  timeline: z.array(learningSignalEventSchema).min(1),
  careNotes: z.array(studentCareNoteSchema).min(1),
});

export const instructorActionStatusSchema = z.enum([
  "pending",
  "in-progress",
  "done",
]);

export const instructorActionBoardItemSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  title: z.string(),
  summary: z.string(),
  dueLabel: z.string(),
  channelLabel: z.string(),
  ownerLabel: z.string(),
  status: instructorActionStatusSchema,
});

export const instructorWorkspaceResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  generatedLabel: z.string(),
  headline: z.string(),
  summary: z.string(),
  workspace: instructorWorkspaceSummarySchema,
  cohorts: z.array(cohortWorkspaceSnapshotSchema).min(1),
  students: z.array(workspaceStudentSchema).min(1),
  initialStudentId: z.string(),
  studentDetails: z.array(workspaceStudentDetailSchema).min(1),
  todayActionBoard: z.array(instructorActionBoardItemSchema).min(1),
  careHistory: z.array(careHistoryEntrySchema).min(1),
  weeklyReport: instructorWeeklyReportSchema,
});

export type InstructorWorkspaceSummary = z.infer<
  typeof instructorWorkspaceSummarySchema
>;
export type CohortWorkspaceSnapshot = z.infer<
  typeof cohortWorkspaceSnapshotSchema
>;
export type WorkspaceStudent = z.infer<typeof workspaceStudentSchema>;
export type StudentCareNote = z.infer<typeof studentCareNoteSchema>;
export type WorkspaceStudentDetail = z.infer<
  typeof workspaceStudentDetailSchema
>;
export type InstructorActionStatus = z.infer<
  typeof instructorActionStatusSchema
>;
export type InstructorActionBoardItem = z.infer<
  typeof instructorActionBoardItemSchema
>;
export type InstructorWorkspaceResponse = z.infer<
  typeof instructorWorkspaceResponseSchema
>;
