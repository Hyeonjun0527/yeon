import { describe, expect, it } from "vitest";
import {
  classifyLifeOsHourOutcome,
  computeLifeOsDailyMetrics,
  computeLifeOsWeeklyMetrics,
} from "./utils";

describe("classifyLifeOsHourOutcome", () => {
  it("matched case", () => {
    expect(
      classifyLifeOsHourOutcome({
        hour: 1,
        goalText: "코딩",
        actionText: "코딩",
      }).outcome,
    ).toBe("matched");
  });

  it("rest instead of plan", () => {
    expect(
      classifyLifeOsHourOutcome({
        hour: 1,
        goalText: "코딩",
        actionText: "휴식",
      }).outcome,
    ).toBe("rest_instead_of_plan");
  });

  it("category swap", () => {
    expect(
      classifyLifeOsHourOutcome({
        hour: 1,
        goalText: "코딩",
        actionText: "메일 정리",
        goalCategory: "deep_work",
        actionCategory: "admin",
      }).outcome,
    ).toBe("category_swap");
  });

  it("unknown mismatch", () => {
    expect(
      classifyLifeOsHourOutcome({ hour: 1, goalText: "ABC", actionText: "XYZ" })
        .outcome,
    ).toBe("unknown_mismatch");
  });

  it("unplanned productive", () => {
    expect(
      classifyLifeOsHourOutcome({ hour: 1, goalText: "", actionText: "코딩" })
        .outcome,
    ).toBe("unplanned_productive");
  });

  it("planned no action", () => {
    expect(
      classifyLifeOsHourOutcome({ hour: 1, goalText: "코딩", actionText: "" })
        .outcome,
    ).toBe("planned_no_action");
  });

  it("spillover candidate when previous action category continues", () => {
    expect(
      classifyLifeOsHourOutcome(
        {
          hour: 1,
          goalText: "코딩",
          actionText: "문서",
          goalCategory: "deep_work",
          actionCategory: "admin",
        },
        {
          hour: 0,
          goalText: "휴식",
          actionText: "문서",
          goalCategory: "learning",
          actionCategory: "admin",
        },
      ).outcome,
    ).toBe("spillover_candidate");
  });

  it("computes deterministic daily overplanning score and categories", () => {
    const metrics = computeLifeOsDailyMetrics({
      localDate: "2026-04-30",
      entries: [
        {
          hour: 8,
          goalText: "코딩",
          actionText: "휴식",
          goalCategory: "deep_work",
          actionCategory: "rest",
        },
        {
          hour: 9,
          goalText: "코딩",
          actionText: "코딩",
          goalCategory: "deep_work",
          actionCategory: "deep_work",
        },
      ],
    });

    expect(metrics.plannedHours).toBe(2);
    expect(metrics.actionHours).toBe(2);
    expect(metrics.overplannedHours).toBe(1);
    expect(metrics.overplanningScore).toBe(50);
  });

  it("aggregates weekly metrics across days deterministically", () => {
    const weekly = computeLifeOsWeeklyMetrics({
      periodStart: "2026-04-29",
      periodEnd: "2026-05-05",
      days: [
        {
          localDate: "2026-04-29",
          entries: [
            {
              hour: 8,
              goalText: "코딩",
              actionText: "",
              goalCategory: "deep_work",
              actionCategory: null,
            },
            {
              hour: 9,
              goalText: "",
              actionText: "",
              goalCategory: null,
              actionCategory: null,
            },
          ],
        },
        {
          localDate: "2026-04-30",
          entries: [
            {
              hour: 8,
              goalText: "",
              actionText: "메일 정리",
              goalCategory: null,
              actionCategory: "admin",
            },
          ],
        },
      ],
    });

    expect(weekly.days).toHaveLength(2);
    expect(weekly.plannedHours).toBe(1);
    expect(weekly.actionHours).toBe(1);
    expect(weekly.overplannedHours).toBe(1);
    expect(weekly.overplanningScore).toBe(100);
  });
});
