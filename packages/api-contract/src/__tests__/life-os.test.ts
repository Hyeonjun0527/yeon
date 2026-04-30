import { describe, expect, it } from "vitest";

import {
  LIFE_OS_API_PATHS,
  lifeOsDayDtoSchema,
  lifeOsReportResponseSchema,
  upsertLifeOsDayBodySchema,
} from "../life-os";

describe("life-os API contract", () => {
  it("normalizes hourly manual record bodies", () => {
    const parsed = upsertLifeOsDayBodySchema.parse({
      localDate: "2026-04-30",
      entries: [{ hour: 9, goalText: "코딩", actionText: "휴식" }],
    });

    expect(parsed.timezone).toBe("Asia/Seoul");
    expect(parsed.entries[0]?.goalText).toBe("코딩");
  });

  it("keeps day DTO portable for web and mobile clients", () => {
    expect(
      lifeOsDayDtoSchema.parse({
        localDate: "2026-04-30",
        timezone: "Asia/Seoul",
        mindset: "self-first",
        backlogText: "record-to-report",
        entries: [],
      }),
    ).toMatchObject({ localDate: "2026-04-30" });
  });

  it("validates deterministic report responses", () => {
    const response = lifeOsReportResponseSchema.parse({
      report: {
        periodType: "daily",
        periodStart: "2026-04-30",
        periodEnd: "2026-04-30",
        metrics: {
          localDate: "2026-04-30",
          plannedHours: 1,
          actionHours: 1,
          matchedHours: 0,
          overplannedHours: 1,
          restInsteadOfPlanHours: 1,
          unrelatedActionHours: 0,
          spilloverHours: 0,
          overplanningScore: 100,
          mismatchByBlock: { "0-7": 0, "8-15": 1, "16-23": 0 },
          classifications: [],
        },
        patterns: [],
        recommendations: [],
        generatedAt: "2026-04-30T00:00:00.000Z",
        aiSummary: null,
      },
    });

    expect(response.report.periodType).toBe("daily");
  });

  it("builds stable public API paths", () => {
    expect(LIFE_OS_API_PATHS.dayByDate("2026-04-30")).toBe(
      "/api/v1/life-os/days/2026-04-30",
    );
    expect(LIFE_OS_API_PATHS.weeklyReport("2026-04-27", "2026-05-03")).toBe(
      "/api/v1/life-os/reports/weekly?periodStart=2026-04-27&periodEnd=2026-05-03",
    );
  });
});
