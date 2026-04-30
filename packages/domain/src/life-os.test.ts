import { describe, expect, it } from "vitest";
import {
  buildLifeOsReport,
  classifyLifeOsHourOutcome,
  computeLifeOsDailyMetrics,
  computeLifeOsWeeklyMetrics,
  detectLifeOsOverplanningPatterns,
  generateLifeOsRecommendations,
  type LifeOsHourEntry,
} from "./life-os";

describe("classifyLifeOsHourOutcome", () => {
  it.each([
    ["matched", { hour: 9, goalText: "코딩", actionText: "코딩" }, "matched"],
    [
      "rest instead of plan",
      { hour: 9, goalText: "코딩", actionText: "휴식" },
      "rest_instead_of_plan",
    ],
    [
      "category swap",
      { hour: 9, goalText: "코딩", actionText: "메일 정리" },
      "category_swap",
    ],
    [
      "unknown mismatch",
      { hour: 9, goalText: "ABC", actionText: "XYZ" },
      "unknown_mismatch",
    ],
    [
      "unplanned productive",
      { hour: 9, goalText: "", actionText: "코딩" },
      "unplanned_productive",
    ],
    [
      "planned no action",
      { hour: 9, goalText: "코딩", actionText: "" },
      "planned_no_action",
    ],
  ] satisfies Array<[string, LifeOsHourEntry, string]>)(
    "classifies %s",
    (_caseName, entry, expected) => {
      expect(classifyLifeOsHourOutcome(entry).outcome).toBe(expected);
    },
  );

  it("detects spillover before category swap when previous action continues", () => {
    expect(
      classifyLifeOsHourOutcome(
        {
          hour: 10,
          goalText: "코딩",
          actionText: "문서",
        },
        {
          hour: 9,
          goalText: "문서",
          actionText: "문서",
        },
      ).outcome,
    ).toBe("spillover_candidate");
  });

  it("does not treat different unknown texts as matched", () => {
    const result = classifyLifeOsHourOutcome({
      hour: 11,
      goalText: "ABC",
      actionText: "XYZ",
      goalCategory: "other",
      actionCategory: "other",
    });

    expect(result.outcome).toBe("unknown_mismatch");
    expect(result.confidence).toBe("low");
  });
});

describe("Life OS metrics and recommendations", () => {
  it("computes daily overplanning metrics by spreadsheet hour block", () => {
    const metrics = computeLifeOsDailyMetrics({
      localDate: "2026-04-30",
      entries: [
        { hour: 8, goalText: "코딩", actionText: "코딩" },
        { hour: 9, goalText: "코딩", actionText: "휴식" },
        { hour: 16, goalText: "공부", actionText: "" },
      ],
    });

    expect(metrics.plannedHours).toBe(3);
    expect(metrics.matchedHours).toBe(1);
    expect(metrics.overplannedHours).toBe(2);
    expect(metrics.mismatchByBlock).toEqual({
      "0-7": 0,
      "8-15": 1,
      "16-23": 1,
    });
  });

  it("detects weekly repeated mismatch patterns and recommendation evidence", () => {
    const weekly = computeLifeOsWeeklyMetrics({
      periodStart: "2026-04-27",
      periodEnd: "2026-05-03",
      days: [
        {
          localDate: "2026-04-27",
          entries: [
            { hour: 9, goalText: "코딩", actionText: "휴식" },
            { hour: 10, goalText: "코딩", actionText: "메일 정리" },
            { hour: 11, goalText: "코딩", actionText: "메일 정리" },
          ],
        },
        {
          localDate: "2026-04-28",
          entries: [
            { hour: 9, goalText: "코딩", actionText: "휴식" },
            { hour: 10, goalText: "코딩", actionText: "메일 정리" },
          ],
        },
      ],
    });
    const patterns = detectLifeOsOverplanningPatterns(weekly);
    const recommendations = generateLifeOsRecommendations(patterns);

    expect(
      patterns.some((pattern) => pattern.type === "repeated_overplanned_block"),
    ).toBe(true);
    expect(
      patterns.some(
        (pattern) => pattern.type === "repeated_overplanned_category",
      ),
    ).toBe(true);
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]?.evidence).toBeTruthy();
  });

  it("builds deterministic reports without requiring AI summary", () => {
    const metrics = computeLifeOsDailyMetrics({
      localDate: "2026-04-30",
      entries: [{ hour: 9, goalText: "코딩", actionText: "휴식" }],
    });
    const report = buildLifeOsReport({
      periodType: "daily",
      periodStart: "2026-04-30",
      periodEnd: "2026-04-30",
      metrics,
      generatedAt: "2026-04-30T00:00:00.000Z",
    });

    expect(report.aiSummary).toBeNull();
    expect(report.metrics.overplannedHours).toBe(1);
  });
});
