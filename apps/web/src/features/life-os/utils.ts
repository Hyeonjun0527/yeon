import {
  LIFE_OS_ACTIVE_CATEGORIES,
  LIFE_OS_CATEGORY_KEYWORDS,
  LIFE_OS_HOUR_BLOCKS,
} from "./constants";
import type {
  LifeOsBlockKey,
  LifeOsCategory,
  LifeOsDailyMetrics,
  LifeOsHourClassification,
  LifeOsHourEntry,
  LifeOsOutcome,
  LifeOsPattern,
  LifeOsRecommendation,
  LifeOsReport,
  LifeOsWeeklyMetrics,
} from "./types";

const OVERPLANNED_OUTCOMES = new Set<LifeOsOutcome>([
  "planned_no_action",
  "spillover_candidate",
  "rest_instead_of_plan",
  "logistics_displacement",
  "category_swap",
  "unknown_mismatch",
]);

export function normalizeLifeOsText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function inferLifeOsCategory(
  text: string | null | undefined,
  explicitCategory?: LifeOsCategory | null,
): LifeOsCategory {
  if (explicitCategory && explicitCategory !== "other") {
    return explicitCategory;
  }

  const normalized = normalizeLifeOsText(text);
  if (!normalized) {
    return "other";
  }

  for (const [category, keywords] of Object.entries(
    LIFE_OS_CATEGORY_KEYWORDS,
  ) as Array<[LifeOsCategory, string[]]>) {
    if (category === "other") continue;
    if (keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
      return category;
    }
  }

  return "other";
}

function blockKeyForHour(hour: number): LifeOsBlockKey {
  return LIFE_OS_HOUR_BLOCKS.find((block) => block.hours.includes(hour))?.key ?? "0-7";
}

function isOverplannedOutcome(outcome: LifeOsOutcome, hasGoal: boolean) {
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

  let outcome: LifeOsOutcome;
  let reason: string;
  let confidence: LifeOsHourClassification["confidence"] = "medium";

  if (!hasGoal && !hasAction) {
    outcome = "empty";
    reason = "목표와 실행이 모두 비어 있습니다.";
    confidence = "high";
    return buildClassification(entry, outcome, "other", "other", false, confidence, reason);
  }

  const goalCategory = inferLifeOsCategory(entry.goalText, entry.goalCategory);
  const actionCategory = inferLifeOsCategory(entry.actionText, entry.actionCategory);

  if (!hasGoal && hasAction) {
    outcome = actionCategory === "rest" || actionCategory === "meal" ? "unplanned_rest" : "unplanned_productive";
    reason = outcome === "unplanned_rest" ? "계획 없이 휴식/식사가 기록됐습니다." : "계획 없이 생산 활동이 기록됐습니다.";
    confidence = actionCategory === "other" ? "low" : "medium";
    return buildClassification(entry, outcome, goalCategory, actionCategory, false, confidence, reason);
  }

  if (hasGoal && !hasAction) {
    outcome = "planned_no_action";
    reason = "계획은 있지만 실행 기록이 없습니다.";
    confidence = "high";
    return buildClassification(entry, outcome, goalCategory, actionCategory, true, confidence, reason);
  }

  const previousActionCategory = previousEntry
    ? inferLifeOsCategory(previousEntry.actionText, previousEntry.actionCategory)
    : "other";
  if (
    previousActionCategory !== "other" &&
    actionCategory !== "other" &&
    actionCategory === previousActionCategory &&
    goalCategory !== "other" &&
    goalCategory !== actionCategory &&
    hasGoal &&
    hasAction
  ) {
    outcome = "spillover_candidate";
    reason = "이전 시간의 실행 분류가 다른 목표 시간으로 이어졌습니다.";
    confidence = "medium";
    return buildClassification(entry, outcome, goalCategory, actionCategory, true, confidence, reason);
  }

  if (goalCategory !== "other" && goalCategory === actionCategory) {
    outcome = "matched";
    reason = "목표와 실행 분류가 일치합니다.";
    confidence = "high";
  } else if (goalCategory === "other" && actionCategory === "other") {
    outcome = goalText === actionText ? "matched" : "unknown_mismatch";
    reason = goalText === actionText ? "분류는 불명확하지만 텍스트가 같습니다." : "목표와 실행 모두 분류가 불명확하고 텍스트가 다릅니다.";
    confidence = goalText === actionText ? "medium" : "low";
  } else if (LIFE_OS_ACTIVE_CATEGORIES.has(goalCategory) && (actionCategory === "rest" || actionCategory === "meal")) {
    outcome = "rest_instead_of_plan";
    reason = "활동 계획이 휴식/식사로 대체됐습니다.";
    confidence = "high";
  } else if (LIFE_OS_ACTIVE_CATEGORIES.has(goalCategory) && actionCategory === "movement") {
    outcome = "logistics_displacement";
    reason = "활동 계획이 이동/물류 시간으로 밀렸습니다.";
    confidence = "high";
  } else if (goalCategory !== "other" && actionCategory !== "other") {
    outcome = "category_swap";
    reason = "목표와 실행의 분류가 다릅니다.";
    confidence = "high";
  } else {
    outcome = "unknown_mismatch";
    reason = "일부 분류가 불명확하지만 목표와 실행이 다릅니다.";
    confidence = "low";
  }

  return buildClassification(
    entry,
    outcome,
    goalCategory,
    actionCategory,
    isOverplannedOutcome(outcome, hasGoal),
    confidence,
    reason,
  );
}

function buildClassification(
  entry: LifeOsHourEntry,
  outcome: LifeOsOutcome,
  goalCategory: LifeOsCategory,
  actionCategory: LifeOsCategory,
  overplanned: boolean,
  confidence: LifeOsHourClassification["confidence"],
  reason: string,
): LifeOsHourClassification {
  return {
    hour: entry.hour,
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
  const mismatchByBlock: Record<LifeOsBlockKey, number> = {
    "0-7": 0,
    "8-15": 0,
    "16-23": 0,
  };

  for (const item of classifications) {
    if (item.overplanned) {
      mismatchByBlock[blockKeyForHour(item.hour)] += 1;
    }
  }

  const plannedHours = entries.filter((entry) => normalizeLifeOsText(entry.goalText)).length;
  const actionHours = entries.filter((entry) => normalizeLifeOsText(entry.actionText)).length;
  const matchedHours = classifications.filter((item) => item.outcome === "matched").length;
  const overplannedHours = classifications.filter((item) => item.overplanned).length;
  const restInsteadOfPlanHours = classifications.filter((item) => item.outcome === "rest_instead_of_plan").length;
  const unrelatedActionHours = classifications.filter((item) => item.outcome === "category_swap" || item.outcome === "unknown_mismatch" || item.outcome === "logistics_displacement").length;
  const spilloverHours = classifications.filter((item) => item.outcome === "spillover_candidate").length;

  return {
    localDate: params.localDate,
    plannedHours,
    actionHours,
    matchedHours,
    overplannedHours,
    restInsteadOfPlanHours,
    unrelatedActionHours,
    spilloverHours,
    overplanningScore: Math.round((overplannedHours / Math.max(plannedHours, 1)) * 100),
    mismatchByBlock,
    classifications,
    caveat: plannedHours + actionHours < 4 ? "기록이 적어 확신도 낮음: 하루 4칸 미만 기록입니다." : undefined,
  };
}

export function computeLifeOsWeeklyMetrics(params: {
  periodStart: string;
  periodEnd: string;
  days: Array<{ localDate: string; entries: LifeOsHourEntry[] }>;
}): LifeOsWeeklyMetrics {
  const days = params.days.map((day) => computeLifeOsDailyMetrics(day));
  const plannedHours = days.reduce((sum, day) => sum + day.plannedHours, 0);
  const actionHours = days.reduce((sum, day) => sum + day.actionHours, 0);
  const overplannedHours = days.reduce((sum, day) => sum + day.overplannedHours, 0);

  return {
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    days,
    plannedHours,
    actionHours,
    overplannedHours,
    overplanningScore: Math.round((overplannedHours / Math.max(plannedHours, 1)) * 100),
    caveat: plannedHours + actionHours < 12 ? "주간 기록이 적어 반복 패턴은 참고용입니다." : undefined,
  };
}

export function detectLifeOsOverplanningPatterns(
  metrics: LifeOsDailyMetrics | LifeOsWeeklyMetrics,
): LifeOsPattern[] {
  const days = "days" in metrics ? metrics.days : [metrics];
  const patterns: LifeOsPattern[] = [];

  const blockCounts = new Map<LifeOsBlockKey, number>();
  const categoryPlanned = new Map<LifeOsCategory, { planned: number; mismatch: number; hours: Set<number> }>();

  for (const day of days) {
    for (const [block, count] of Object.entries(day.mismatchByBlock) as Array<[LifeOsBlockKey, number]>) {
      if (count > 0) blockCounts.set(block, (blockCounts.get(block) ?? 0) + 1);
    }
    for (const item of day.classifications) {
      if (item.goalCategory === "other") continue;
      const current = categoryPlanned.get(item.goalCategory) ?? {
        planned: 0,
        mismatch: 0,
        hours: new Set<number>(),
      };
      current.planned += 1;
      if (item.overplanned) {
        current.mismatch += 1;
        current.hours.add(item.hour);
      }
      categoryPlanned.set(item.goalCategory, current);
    }
  }

  for (const [block, dayCount] of blockCounts) {
    if (dayCount >= (days.length > 1 ? 2 : 1)) {
      patterns.push({
        type: "repeated_overplanned_block",
        title: `${block} 시간대 과계획 반복`,
        evidence: `${dayCount}일에서 ${block} 블록에 계획-실행 불일치가 나타났습니다.`,
        affectedHours: LIFE_OS_HOUR_BLOCKS.find((item) => item.key === block)?.hours ?? [],
        affectedCategories: [],
        confidence: dayCount >= 3 ? "high" : "medium",
      });
    }
  }

  for (const [category, value] of categoryPlanned) {
    if (value.planned >= 3 && value.mismatch / value.planned >= 0.5) {
      patterns.push({
        type: "repeated_overplanned_category",
        title: `${category} 계획 과밀`,
        evidence: `${category} 계획 ${value.planned}칸 중 ${value.mismatch}칸이 불일치했습니다.`,
        affectedHours: [...value.hours].sort((a, b) => a - b),
        affectedCategories: [category],
        confidence: value.mismatch >= 4 ? "high" : "medium",
      });
    }
  }

  if (metrics.plannedHours > metrics.actionHours && metrics.overplanningScore >= 40) {
    patterns.push({
      type: "planned_capacity_exceeds_actual",
      title: "계획 용량이 실제 실행보다 큼",
      evidence: `계획 ${metrics.plannedHours}시간, 실행 ${metrics.actionHours}시간, 과계획 점수 ${metrics.overplanningScore}점입니다.`,
      affectedHours: [],
      affectedCategories: [],
      confidence: metrics.plannedHours >= 6 ? "high" : "medium",
    });
  }

  for (const day of days) {
    const denseMismatchHours = day.classifications.filter((item) => item.overplanned).map((item) => item.hour);
    if (denseMismatchHours.length >= 3) {
      patterns.push({
        type: "dense_planning_then_mismatch",
        title: `${day.localDate} 조밀한 계획 후 불일치`,
        evidence: `${day.localDate}에 과계획 후보 ${denseMismatchHours.length}칸이 있습니다.`,
        affectedHours: denseMismatchHours,
        affectedCategories: [],
        confidence: "medium",
      });
      break;
    }
  }

  return patterns.slice(0, 5);
}

export function generateLifeOsRecommendations(
  metrics: LifeOsDailyMetrics | LifeOsWeeklyMetrics,
  patterns = detectLifeOsOverplanningPatterns(metrics),
): LifeOsRecommendation[] {
  if (patterns.length === 0) {
    return [
      {
        title: "기록 밀도를 먼저 높이기",
        evidence: metrics.caveat ?? "반복 과계획 신호가 아직 충분하지 않습니다.",
        suggestedAdjustment: "오늘은 GOAL/ACTION을 최소 4칸 이상만 채워 다음 리포트의 신뢰도를 높이세요.",
        confidence: "low",
        affectedHours: [],
        affectedCategories: [],
      },
    ];
  }

  return patterns.map((pattern) => ({
    title: pattern.type === "planned_capacity_exceeds_actual" ? "다음 계획에서 20% 덜 잡기" : `${pattern.title} 줄이기`,
    evidence: pattern.evidence,
    suggestedAdjustment:
      pattern.affectedHours.length > 0
        ? `${pattern.affectedHours.slice(0, 4).join(", ")}시 근처에는 완충/회복 칸을 먼저 배치하고 핵심 목표를 1개로 제한하세요.`
        : "계획한 시간 수를 실제 실행 시간에 맞춰 줄이고, 남는 칸은 백로그가 아니라 완충으로 남겨두세요.",
    confidence: pattern.confidence,
    affectedHours: pattern.affectedHours,
    affectedCategories: pattern.affectedCategories,
  }));
}

export function buildLifeOsReport(params: {
  periodType: "daily" | "weekly";
  periodStart: string;
  periodEnd: string;
  metrics: LifeOsDailyMetrics | LifeOsWeeklyMetrics;
}): LifeOsReport {
  const patterns = detectLifeOsOverplanningPatterns(params.metrics);
  return {
    periodType: params.periodType,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    metrics: params.metrics,
    patterns,
    recommendations: generateLifeOsRecommendations(params.metrics, patterns),
    generatedAt: new Date().toISOString(),
    aiSummary: null,
  };
}
