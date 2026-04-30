import { describe, expect, it } from "vitest";
import { classifyLifeOsHourOutcome } from "./utils";

describe("classifyLifeOsHourOutcome", () => {
  it("matched case", () => {
    expect(
      classifyLifeOsHourOutcome({ goal: "코딩", action: "코딩" }).outcome,
    ).toBe("matched");
  });

  it("rest instead of plan", () => {
    expect(
      classifyLifeOsHourOutcome({ goal: "코딩", action: "휴식" }).outcome,
    ).toBe("rest_instead_of_plan");
  });

  it("category swap", () => {
    expect(
      classifyLifeOsHourOutcome({
        goal: "코딩",
        action: "메일 정리",
        goalCategory: "work",
        actionCategory: "admin",
      }).outcome,
    ).toBe("category_swap");
  });

  it("unknown mismatch", () => {
    expect(classifyLifeOsHourOutcome({ goal: "ABC", action: "XYZ" }).outcome).toBe(
      "unknown_mismatch",
    );
  });

  it("unplanned productive", () => {
    expect(
      classifyLifeOsHourOutcome({ goal: "", action: "코딩" }).outcome,
    ).toBe("unplanned_productive");
  });

  it("planned no action", () => {
    expect(
      classifyLifeOsHourOutcome({ goal: "코딩", action: "" }).outcome,
    ).toBe("planned_no_action");
  });

  it("spillover candidate when previous action category continues", () => {
    expect(
      classifyLifeOsHourOutcome({
        goal: "코딩",
        action: "문서",
        goalCategory: "work",
        actionCategory: "ops",
        previousActionCategory: "ops",
      }).outcome,
    ).toBe("spillover_candidate");
  });
});
