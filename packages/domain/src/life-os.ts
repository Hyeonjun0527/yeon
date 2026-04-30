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

export const lifeOsBlockKeys = ["0-7", "8-15", "16-23"] as const;
export type LifeOsBlockKey = (typeof lifeOsBlockKeys)[number];

export const lifeOsReportPeriodTypes = ["daily", "weekly"] as const;
export type LifeOsReportPeriodType = (typeof lifeOsReportPeriodTypes)[number];

export const lifeOsPatternTypes = [
  "repeated_overplanned_block",
  "repeated_overplanned_category",
  "dense_planning_then_mismatch",
  "planned_capacity_exceeds_actual",
] as const;

export type LifeOsPatternType = (typeof lifeOsPatternTypes)[number];

export type LifeOsConfidence = "high" | "medium" | "low";

export type LifeOsHourEntry = {
  hour: number;
  goalText: string;
  actionText: string;
  goalCategory?: LifeOsCategory | null;
  actionCategory?: LifeOsCategory | null;
  note?: string | null;
};

export type LifeOsDayInput = {
  localDate: string;
  timezone?: string;
  mindset?: string;
  backlogText?: string;
  entries: LifeOsHourEntry[];
};

export type LifeOsDay = LifeOsDayInput & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LifeOsHourClassification = {
  hour: number;
  outcome: LifeOsOutcome;
  goalCategory: LifeOsCategory;
  actionCategory: LifeOsCategory;
  overplanned: boolean;
  confidence: LifeOsConfidence;
  reason: string;
};

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
  matchedHours: number;
  overplannedHours: number;
  overplanningScore: number;
  caveat?: string;
};

export type LifeOsPattern = {
  type: LifeOsPatternType;
  title: string;
  evidence: string;
  affectedHours: number[];
  affectedCategories: LifeOsCategory[];
  confidence: LifeOsConfidence;
};

export type LifeOsRecommendation = {
  title: string;
  evidence: string;
  suggestedAdjustment: string;
  confidence: LifeOsConfidence;
  affectedHours: number[];
  affectedCategories: LifeOsCategory[];
};

export type LifeOsReport = {
  periodType: LifeOsReportPeriodType;
  periodStart: string;
  periodEnd: string;
  metrics: LifeOsDailyMetrics | LifeOsWeeklyMetrics;
  patterns: LifeOsPattern[];
  recommendations: LifeOsRecommendation[];
  generatedAt: string;
  aiSummary?: string | null;
};

export const LIFE_OS_HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export const LIFE_OS_ROWS = ["MINDSET", "TIME", "GOAL", "ACTION"] as const;

export const LIFE_OS_HOUR_BLOCKS: Array<{
  key: LifeOsBlockKey;
  label: string;
  hours: number[];
}> = [
  { key: "0-7", label: "0–7", hours: LIFE_OS_HOURS.slice(0, 8) },
  { key: "8-15", label: "8–15", hours: LIFE_OS_HOURS.slice(8, 16) },
  { key: "16-23", label: "16–23", hours: LIFE_OS_HOURS.slice(16, 24) },
];

export const LIFE_OS_ACTIVE_CATEGORIES = new Set<LifeOsCategory>([
  "deep_work",
  "learning",
  "admin",
  "meeting",
  "exercise",
]);

export const LIFE_OS_CATEGORY_KEYWORDS: Record<LifeOsCategory, string[]> = {
  deep_work: [
    "코딩",
    "개발",
    "구현",
    "리팩토링",
    "설계",
    "pr",
    "버그",
    "디버깅",
  ],
  learning: ["공부", "학습", "강의", "시험", "문제", "sql", "코테", "독서"],
  admin: ["정리", "메일", "서류", "신청", "예약", "문서", "회의준비"],
  meeting: ["회의", "미팅", "통화", "상담", "인터뷰"],
  rest: ["휴식", "잠", "수면", "낮잠", "쉬기", "멍", "유튜브"],
  meal: ["밥", "식사", "점심", "저녁", "아침", "카페"],
  movement: ["이동", "지하철", "버스", "운전", "산책"],
  exercise: ["운동", "헬스", "러닝", "스트레칭"],
  social: ["친구", "가족", "약속", "커뮤니티"],
  other: [],
};

const OVERPLANNED_OUTCOMES = new Set<LifeOsOutcome>([
  "planned_no_action",
  "rest_instead_of_plan",
  "logistics_displacement",
  "category_swap",
  "spillover_candidate",
  "unknown_mismatch",
]);

export function createEmptyLifeOsEntries(): LifeOsHourEntry[] {
  return LIFE_OS_HOURS.map((hour) => ({
    hour,
    goalText: "",
    actionText: "",
    goalCategory: null,
    actionCategory: null,
    note: "",
  }));
}

export function normalizeLifeOsText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function inferLifeOsCategory(
  text: string | null | undefined,
  explicitCategory?: LifeOsCategory | null,
): LifeOsCategory {
  if (explicitCategory && explicitCategory !== "other") return explicitCategory;

  const normalized = normalizeLifeOsText(text);
  if (!normalized) return "other";

  for (const [category, keywords] of Object.entries(
    LIFE_OS_CATEGORY_KEYWORDS,
  ) as Array<[LifeOsCategory, string[]]>) {
    if (category === "other") continue;
    if (
      keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
    ) {
      return category;
    }
  }

  return "other";
}

export function getLifeOsBlockKeyForHour(hour: number): LifeOsBlockKey {
  if (hour >= 16) return "16-23";
  if (hour >= 8) return "8-15";
  return "0-7";
}

export function isLifeOsOverplannedOutcome(
  outcome: LifeOsOutcome,
  hasGoal = true,
) {
  if (outcome === "unknown_mismatch") return hasGoal;
  return OVERPLANNED_OUTCOMES.has(outcome);
}

export function classifyLifeOsHourOutcome(
  entry: LifeOsHourEntry,
  previousEntry?: LifeOsHourEntry | null,
): LifeOsHourClassification {
  const goalText = normalizeLifeOsText(entry.goalText);
  const actionText = normalizeLifeOsText(entry.actionText);
  const hasGoal = goalText.length > 0;
  const hasAction = actionText.length > 0;

  if (!hasGoal && !hasAction) {
    return buildLifeOsClassification(
      entry.hour,
      "empty",
      "other",
      "other",
      false,
      "high",
      "목표와 실행이 모두 비어 있습니다.",
    );
  }

  const goalCategory = inferLifeOsCategory(entry.goalText, entry.goalCategory);
  const actionCategory = inferLifeOsCategory(
    entry.actionText,
    entry.actionCategory,
  );

  if (!hasGoal && hasAction) {
    const outcome: LifeOsOutcome =
      actionCategory === "rest" || actionCategory === "meal"
        ? "unplanned_rest"
        : "unplanned_productive";
    return buildLifeOsClassification(
      entry.hour,
      outcome,
      goalCategory,
      actionCategory,
      false,
      actionCategory === "other" ? "low" : "medium",
      outcome === "unplanned_rest"
        ? "계획 없이 휴식/식사가 기록됐습니다."
        : "계획 없이 생산 활동이 기록됐습니다.",
    );
  }

  if (hasGoal && !hasAction) {
    return buildLifeOsClassification(
      entry.hour,
      "planned_no_action",
      goalCategory,
      actionCategory,
      true,
      "high",
      "계획은 있지만 실행 기록이 없습니다.",
    );
  }

  const previousActionCategory = previousEntry
    ? inferLifeOsCategory(
        previousEntry.actionText,
        previousEntry.actionCategory,
      )
    : "other";

  if (
    previousActionCategory !== "other" &&
    actionCategory !== "other" &&
    actionCategory === previousActionCategory &&
    goalCategory !== "other" &&
    goalCategory !== actionCategory &&
    hasGoal
  ) {
    return buildLifeOsClassification(
      entry.hour,
      "spillover_candidate",
      goalCategory,
      actionCategory,
      true,
      "medium",
      "이전 시간의 실행 분류가 다른 목표 시간으로 이어졌습니다.",
    );
  }

  const classified = classifyKnownGoalAndAction({
    goalText,
    actionText,
    goalCategory,
    actionCategory,
  });

  return buildLifeOsClassification(
    entry.hour,
    classified.outcome,
    goalCategory,
    actionCategory,
    isLifeOsOverplannedOutcome(classified.outcome, hasGoal),
    classified.confidence,
    classified.reason,
  );
}

function classifyKnownGoalAndAction(params: {
  goalText: string;
  actionText: string;
  goalCategory: LifeOsCategory;
  actionCategory: LifeOsCategory;
}): Pick<LifeOsHourClassification, "outcome" | "confidence" | "reason"> {
  if (
    params.goalCategory !== "other" &&
    params.goalCategory === params.actionCategory
  ) {
    return {
      outcome: "matched",
      confidence: "high",
      reason: "목표와 실행 분류가 일치합니다.",
    };
  }

  if (params.goalCategory === "other" && params.actionCategory === "other") {
    if (params.goalText === params.actionText) {
      return {
        outcome: "matched",
        confidence: "medium",
        reason: "분류는 불명확하지만 텍스트가 같습니다.",
      };
    }

    return {
      outcome: "unknown_mismatch",
      confidence: "low",
      reason: "목표와 실행 모두 분류가 불명확하고 텍스트가 다릅니다.",
    };
  }

  if (
    LIFE_OS_ACTIVE_CATEGORIES.has(params.goalCategory) &&
    (params.actionCategory === "rest" || params.actionCategory === "meal")
  ) {
    return {
      outcome: "rest_instead_of_plan",
      confidence: "high",
      reason: "활동 계획이 휴식/식사로 대체됐습니다.",
    };
  }

  if (
    LIFE_OS_ACTIVE_CATEGORIES.has(params.goalCategory) &&
    params.actionCategory === "movement"
  ) {
    return {
      outcome: "logistics_displacement",
      confidence: "high",
      reason: "활동 계획이 이동/물류 시간으로 밀렸습니다.",
    };
  }

  if (params.goalCategory !== "other" && params.actionCategory !== "other") {
    return {
      outcome: "category_swap",
      confidence: "high",
      reason: "목표와 실행의 분류가 다릅니다.",
    };
  }

  return {
    outcome: "unknown_mismatch",
    confidence: "low",
    reason: "일부 분류가 불명확하지만 목표와 실행이 다릅니다.",
  };
}

function buildLifeOsClassification(
  hour: number,
  outcome: LifeOsOutcome,
  goalCategory: LifeOsCategory,
  actionCategory: LifeOsCategory,
  overplanned: boolean,
  confidence: LifeOsConfidence,
  reason: string,
): LifeOsHourClassification {
  return {
    hour,
    outcome,
    goalCategory,
    actionCategory,
    overplanned,
    confidence,
    reason,
  };
}

export function computeLifeOsDailyMetrics(params: {
  localDate: string;
  entries: LifeOsHourEntry[];
}): LifeOsDailyMetrics {
  const entries = [...params.entries].sort((a, b) => a.hour - b.hour);
  const classifications = entries.map((entry, index) =>
    classifyLifeOsHourOutcome(entry, entries[index - 1]),
  );
  const mismatchByBlock = createEmptyMismatchByBlock();

  for (const item of classifications) {
    if (item.overplanned) {
      mismatchByBlock[getLifeOsBlockKeyForHour(item.hour)] += 1;
    }
  }

  const plannedHours = entries.filter((entry) =>
    normalizeLifeOsText(entry.goalText),
  ).length;
  const actionHours = entries.filter((entry) =>
    normalizeLifeOsText(entry.actionText),
  ).length;
  const matchedHours = classifications.filter(
    (item) => item.outcome === "matched",
  ).length;
  const overplannedHours = classifications.filter(
    (item) => item.overplanned,
  ).length;
  const restInsteadOfPlanHours = classifications.filter(
    (item) => item.outcome === "rest_instead_of_plan",
  ).length;
  const unrelatedActionHours = classifications.filter(
    (item) =>
      item.outcome === "category_swap" ||
      item.outcome === "unknown_mismatch" ||
      item.outcome === "logistics_displacement",
  ).length;
  const spilloverHours = classifications.filter(
    (item) => item.outcome === "spillover_candidate",
  ).length;

  return {
    localDate: params.localDate,
    plannedHours,
    actionHours,
    matchedHours,
    overplannedHours,
    restInsteadOfPlanHours,
    unrelatedActionHours,
    spilloverHours,
    overplanningScore: Math.round(
      (overplannedHours / Math.max(plannedHours, 1)) * 100,
    ),
    mismatchByBlock,
    classifications,
    caveat:
      plannedHours + actionHours < 4
        ? "기록이 적어 확신도 낮음: 하루 4칸 미만 기록입니다."
        : undefined,
  };
}

export function computeLifeOsWeeklyMetrics(params: {
  periodStart: string;
  periodEnd: string;
  days: LifeOsDayInput[];
}): LifeOsWeeklyMetrics {
  const days = params.days.map((day) =>
    computeLifeOsDailyMetrics({
      localDate: day.localDate,
      entries: day.entries,
    }),
  );
  const plannedHours = days.reduce((sum, day) => sum + day.plannedHours, 0);
  const actionHours = days.reduce((sum, day) => sum + day.actionHours, 0);
  const matchedHours = days.reduce((sum, day) => sum + day.matchedHours, 0);
  const overplannedHours = days.reduce(
    (sum, day) => sum + day.overplannedHours,
    0,
  );

  return {
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    days,
    plannedHours,
    actionHours,
    matchedHours,
    overplannedHours,
    overplanningScore: Math.round(
      (overplannedHours / Math.max(plannedHours, 1)) * 100,
    ),
    caveat:
      plannedHours + actionHours < 12
        ? "주간 기록이 적어 반복 패턴은 참고용입니다."
        : undefined,
  };
}

export function detectLifeOsOverplanningPatterns(
  metrics: LifeOsDailyMetrics | LifeOsWeeklyMetrics,
): LifeOsPattern[] {
  const days = "days" in metrics ? metrics.days : [metrics];
  const patterns: LifeOsPattern[] = [];
  const blockDayCounts = new Map<LifeOsBlockKey, number>();
  const categoryCounts = new Map<
    LifeOsCategory,
    { planned: number; mismatch: number; hours: Set<number> }
  >();

  for (const day of days) {
    for (const block of lifeOsBlockKeys) {
      if (day.mismatchByBlock[block] > 0) {
        blockDayCounts.set(block, (blockDayCounts.get(block) ?? 0) + 1);
      }
    }

    for (const item of day.classifications) {
      if (item.goalCategory === "other") continue;
      const current = categoryCounts.get(item.goalCategory) ?? {
        planned: 0,
        mismatch: 0,
        hours: new Set<number>(),
      };
      current.planned += 1;
      if (item.overplanned) {
        current.mismatch += 1;
        current.hours.add(item.hour);
      }
      categoryCounts.set(item.goalCategory, current);
    }

    const denseMismatchHours = findDenseMismatchHours(day.classifications);
    if (denseMismatchHours.length >= 2) {
      patterns.push({
        type: "dense_planning_then_mismatch",
        title: "연속 계획 뒤 mismatch가 이어졌습니다.",
        evidence: `${day.localDate}에 ${denseMismatchHours.join(", ")}시에 과계획 신호가 이어졌습니다.`,
        affectedHours: denseMismatchHours,
        affectedCategories: uniqueCategories(
          day.classifications
            .filter((item) => denseMismatchHours.includes(item.hour))
            .map((item) => item.goalCategory),
        ),
        confidence: "medium",
      });
    }
  }

  for (const [block, count] of blockDayCounts) {
    if (count >= 2) {
      patterns.push({
        type: "repeated_overplanned_block",
        title: `${block} 블록에서 반복 과계획이 보입니다.`,
        evidence: `${count}일 이상 같은 시간대에 계획 대비 실행 mismatch가 있었습니다.`,
        affectedHours: hoursForBlock(block),
        affectedCategories: [],
        confidence: count >= 3 ? "high" : "medium",
      });
    }
  }

  for (const [category, count] of categoryCounts) {
    const mismatchRate = count.mismatch / Math.max(count.planned, 1);
    if (count.planned >= 3 && mismatchRate >= 0.5) {
      patterns.push({
        type: "repeated_overplanned_category",
        title: `${category} 계획의 실행 전환율이 낮습니다.`,
        evidence: `${category} 계획 ${count.planned}칸 중 ${count.mismatch}칸이 과계획으로 분류됐습니다.`,
        affectedHours: [...count.hours].sort((a, b) => a - b),
        affectedCategories: [category],
        confidence: mismatchRate >= 0.75 ? "high" : "medium",
      });
    }
  }

  const totalPlanned = days.reduce((sum, day) => sum + day.plannedHours, 0);
  const totalAction = days.reduce((sum, day) => sum + day.actionHours, 0);
  if (totalPlanned >= 4 && totalPlanned > totalAction) {
    patterns.push({
      type: "planned_capacity_exceeds_actual",
      title: "계획 시간이 실제 실행 시간보다 큽니다.",
      evidence: `계획 ${totalPlanned}시간, 실행 ${totalAction}시간으로 ${totalPlanned - totalAction}시간 차이가 있습니다.`,
      affectedHours: [],
      affectedCategories: [],
      confidence: totalPlanned - totalAction >= 4 ? "high" : "medium",
    });
  }

  return patterns;
}

export function generateLifeOsRecommendations(
  patterns: LifeOsPattern[],
): LifeOsRecommendation[] {
  return patterns.map((pattern) => ({
    title: recommendationTitleForPattern(pattern),
    evidence: pattern.evidence,
    suggestedAdjustment: adjustmentForPattern(pattern),
    confidence: pattern.confidence,
    affectedHours: pattern.affectedHours,
    affectedCategories: pattern.affectedCategories,
  }));
}

export function buildLifeOsReport(params: {
  periodType: LifeOsReportPeriodType;
  periodStart: string;
  periodEnd: string;
  metrics: LifeOsDailyMetrics | LifeOsWeeklyMetrics;
  generatedAt?: string;
  aiSummary?: string | null;
}): LifeOsReport {
  const patterns = detectLifeOsOverplanningPatterns(params.metrics);

  return {
    periodType: params.periodType,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    metrics: params.metrics,
    patterns,
    recommendations: generateLifeOsRecommendations(patterns),
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    aiSummary: params.aiSummary ?? null,
  };
}

function createEmptyMismatchByBlock(): Record<LifeOsBlockKey, number> {
  return { "0-7": 0, "8-15": 0, "16-23": 0 };
}

function hoursForBlock(block: LifeOsBlockKey) {
  return LIFE_OS_HOUR_BLOCKS.find((item) => item.key === block)?.hours ?? [];
}

function findDenseMismatchHours(classifications: LifeOsHourClassification[]) {
  const result: number[] = [];
  for (let index = 0; index < classifications.length - 2; index += 1) {
    const window = classifications.slice(index, index + 3);
    const plannedCount = window.filter(
      (item) => item.goalCategory !== "other",
    ).length;
    const mismatchHours = window
      .filter((item) => item.overplanned)
      .map((item) => item.hour);
    if (plannedCount === 3 && mismatchHours.length >= 2) {
      result.push(...mismatchHours);
    }
  }

  return [...new Set(result)].sort((a, b) => a - b);
}

function uniqueCategories(categories: LifeOsCategory[]) {
  return [...new Set(categories.filter((category) => category !== "other"))];
}

function recommendationTitleForPattern(pattern: LifeOsPattern) {
  switch (pattern.type) {
    case "repeated_overplanned_block":
      return "반복 mismatch 시간대의 계획량을 줄이세요.";
    case "repeated_overplanned_category":
      return "반복 mismatch 카테고리를 더 작은 단위로 계획하세요.";
    case "dense_planning_then_mismatch":
      return "연속 계획 사이에 완충 시간을 넣으세요.";
    case "planned_capacity_exceeds_actual":
      return "다음 계획의 총량을 실제 실행량에 맞추세요.";
  }
}

function adjustmentForPattern(pattern: LifeOsPattern) {
  switch (pattern.type) {
    case "repeated_overplanned_block":
      return "해당 블록에는 핵심 목표 1개만 두고 나머지는 backlog/memo로 내려놓습니다.";
    case "repeated_overplanned_category":
      return "같은 카테고리 계획을 30~60분 단위로 쪼개고, 시작 조건을 한 줄로 적습니다.";
    case "dense_planning_then_mismatch":
      return "3시간 이상 연속 계획을 피하고 중간에 회복/정리 블록을 예약합니다.";
    case "planned_capacity_exceeds_actual":
      return "최근 실제 실행 시간의 80%만 다음 계획에 배치하고 남은 시간은 비워둡니다.";
  }
}
