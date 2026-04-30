export const lifeOsCategories = [
  "deep_work",
  "learning",
  "admin",
  "meeting",
  "rest",
  "meal",
  "movement",
  "exercise",
  "social",
  "other",
] as const;

export type LifeOsCategory = (typeof lifeOsCategories)[number];

export const lifeOsOutcomes = [
  "empty",
  "unplanned_productive",
  "unplanned_rest",
  "planned_no_action",
  "matched",
  "rest_instead_of_plan",
  "logistics_displacement",
  "category_swap",
  "spillover_candidate",
  "unknown_mismatch",
] as const;

export type LifeOsOutcome = (typeof lifeOsOutcomes)[number];

export type LifeOsHourEntry = {
  hour: number;
  goalText: string;
  actionText: string;
  goalCategory?: LifeOsCategory | null;
  actionCategory?: LifeOsCategory | null;
  note?: string | null;
};

export type LifeOsDay = {
  id?: string;
  localDate: string;
  timezone: string;
  mindset: string;
  backlogText: string;
  entries: LifeOsHourEntry[];
  updatedAt?: string;
};

export type LifeOsHourClassification = {
  hour: number;
  outcome: LifeOsOutcome;
  goalCategory: LifeOsCategory;
  actionCategory: LifeOsCategory;
  overplanned: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
};

export type LifeOsBlockKey = "0-7" | "8-15" | "16-23";

export type LifeOsDailyMetrics = {
  localDate: string;
  plannedHours: number;
  actionHours: number;
  matchedHours: number;
  overplannedHours: number;
  restInsteadOfPlanHours: number;
  unrelatedActionHours: number;
  spilloverHours: number;
  overplanningScore: number;
  mismatchByBlock: Record<LifeOsBlockKey, number>;
  classifications: LifeOsHourClassification[];
  caveat?: string;
};

export type LifeOsWeeklyMetrics = {
  periodStart: string;
  periodEnd: string;
  days: LifeOsDailyMetrics[];
  plannedHours: number;
  actionHours: number;
  overplannedHours: number;
  overplanningScore: number;
  caveat?: string;
};

export type LifeOsPattern = {
  type:
    | "repeated_overplanned_block"
    | "repeated_overplanned_category"
    | "dense_planning_then_mismatch"
    | "planned_capacity_exceeds_actual";
  title: string;
  evidence: string;
  affectedHours: number[];
  affectedCategories: LifeOsCategory[];
  confidence: "high" | "medium" | "low";
};

export type LifeOsRecommendation = {
  title: string;
  evidence: string;
  suggestedAdjustment: string;
  confidence: "high" | "medium" | "low";
  affectedHours: number[];
  affectedCategories: LifeOsCategory[];
};

export type LifeOsReport = {
  periodType: "daily" | "weekly";
  periodStart: string;
  periodEnd: string;
  metrics: LifeOsDailyMetrics | LifeOsWeeklyMetrics;
  patterns: LifeOsPattern[];
  recommendations: LifeOsRecommendation[];
  generatedAt: string;
  aiSummary?: string | null;
};
