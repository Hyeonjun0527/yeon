import { z } from "zod";

export const contestRoleSchema = z.enum(["learner", "instructor", "operator"]);

export const contestPainPointSchema = z.object({
  role: contestRoleSchema,
  roleLabel: z.string(),
  title: z.string(),
  description: z.string(),
  currentState: z.string(),
});

export const contestFeatureSchema = z.object({
  name: z.string(),
  summary: z.string(),
  deliverable: z.string(),
});

export const contestWorkflowStepSchema = z.object({
  step: z.string(),
  title: z.string(),
  summary: z.string(),
});

export const contestDailyWorkflowStageSchema = z.object({
  stage: z.string(),
  title: z.string(),
  summary: z.string(),
  keyQuestion: z.string(),
  isMvpFocus: z.boolean(),
});

export const contestPersonaSchema = z.object({
  name: z.string(),
  roleTitle: z.string(),
  summary: z.string(),
  cohortScope: z.string(),
  workingWindow: z.string(),
  responsibilities: z.array(z.string()),
  currentTools: z.array(z.string()),
  painPoints: z.array(z.string()),
  successCriteria: z.array(z.string()),
});

export const contestRiskSignalSchema = z.object({
  priority: z.string(),
  title: z.string(),
  indicator: z.string(),
  reason: z.string(),
  recommendedAction: z.string(),
});

export const contestSubmissionCopySchema = z.object({
  oneLiner: z.string(),
  problemDefinition: z.string(),
  positioning: z.string(),
});

export const contestRoleSnapshotSchema = z.object({
  role: contestRoleSchema,
  roleLabel: z.string(),
  heading: z.string(),
  summary: z.string(),
  actions: z.array(z.string()),
});

export const contestImpactSchema = z.object({
  metric: z.string(),
  currentState: z.string(),
  targetState: z.string(),
  measurement: z.string(),
});

export const contestAiToolSchema = z.object({
  tool: z.string(),
  model: z.string(),
  purpose: z.string(),
  reason: z.string(),
});

export const contestUxPrincipleSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const contestOverviewResponseSchema = z.object({
  solutionName: z.string(),
  category: z.string(),
  headline: z.string(),
  summary: z.string(),
  problemStatement: z.string(),
  targetUsers: z.array(z.string()),
  learningSignals: z.array(z.string()),
  submissionCopy: contestSubmissionCopySchema,
  dailyWorkflow: z.array(contestDailyWorkflowStageSchema),
  primaryPersona: contestPersonaSchema,
  riskSignals: z.array(contestRiskSignalSchema),
  painPoints: z.array(contestPainPointSchema),
  coreFeatures: z.array(contestFeatureSchema),
  workflow: z.array(contestWorkflowStepSchema),
  uxPrinciples: z.array(contestUxPrincipleSchema),
  roleSnapshots: z.array(contestRoleSnapshotSchema),
  expectedImpacts: z.array(contestImpactSchema),
  aiStack: z.array(contestAiToolSchema),
});

export type ContestRole = z.infer<typeof contestRoleSchema>;
export type ContestPainPoint = z.infer<typeof contestPainPointSchema>;
export type ContestFeature = z.infer<typeof contestFeatureSchema>;
export type ContestWorkflowStep = z.infer<typeof contestWorkflowStepSchema>;
export type ContestDailyWorkflowStage = z.infer<
  typeof contestDailyWorkflowStageSchema
>;
export type ContestPersona = z.infer<typeof contestPersonaSchema>;
export type ContestRiskSignal = z.infer<typeof contestRiskSignalSchema>;
export type ContestSubmissionCopy = z.infer<typeof contestSubmissionCopySchema>;
export type ContestRoleSnapshot = z.infer<typeof contestRoleSnapshotSchema>;
export type ContestImpact = z.infer<typeof contestImpactSchema>;
export type ContestAiTool = z.infer<typeof contestAiToolSchema>;
export type ContestUxPrinciple = z.infer<typeof contestUxPrincipleSchema>;
export type ContestOverviewResponse = z.infer<
  typeof contestOverviewResponseSchema
>;
