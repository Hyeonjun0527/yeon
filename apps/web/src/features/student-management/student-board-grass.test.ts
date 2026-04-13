import { describe, expect, it } from "vitest";

import {
  buildStudentBoardGrassCalendar,
  getStudentBoardGrassAvailableYears,
  getStudentBoardGrassDefaultYear,
  isStudentBoardGrassDateInDisplayYear,
  toStudentBoardGrassDateKey,
} from "./student-board-grass";

describe("student-board-grass", () => {
  it("스페이스 기간이 여러 해를 걸치면 사용 가능한 연도 목록을 순서대로 만든다", () => {
    expect(
      getStudentBoardGrassAvailableYears("2026-11-01", "2028-02-28"),
    ).toEqual([2026, 2027, 2028]);
  });

  it("기본 진입 연도는 스페이스 시작일이 속한 해를 사용한다", () => {
    expect(getStudentBoardGrassDefaultYear("2026-11-01")).toBe(2026);
  });

  it("선택한 연도의 주간 정렬 캘린더를 만든다", () => {
    const { weeks, monthHeaders, displayYear } = buildStudentBoardGrassCalendar(
      "2026-11-01",
      "2027-02-28",
      2026,
    );

    expect(displayYear).toBe(2026);
    expect(toStudentBoardGrassDateKey(weeks[0]?.[0] as Date)).toBe(
      "2025-12-28",
    );
    expect(toStudentBoardGrassDateKey(weeks.at(-1)?.at(-1) as Date)).toBe(
      "2027-01-02",
    );
    expect(monthHeaders.filter(Boolean)[0]).toBe("1월");
    expect(monthHeaders).toContain("12월");
  });

  it("선택 연도 밖 날짜는 현재 연도 셀로 취급하지 않는다", () => {
    expect(
      isStudentBoardGrassDateInDisplayYear(
        new Date("2027-01-01T00:00:00.000Z"),
        2026,
      ),
    ).toBe(false);
    expect(
      isStudentBoardGrassDateInDisplayYear(
        new Date("2026-12-31T00:00:00.000Z"),
        2026,
      ),
    ).toBe(true);
  });
});
