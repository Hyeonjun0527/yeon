"use client";

import { useMemo } from "react";
import type { StudentBoardDailyCell } from "@yeon/api-contract";

import {
  buildStudentBoardGrassCalendar,
  buildStudentBoardDailyCellDateMap,
  getStudentBoardGrassHalfTone,
  isStudentBoardGrassDateInDisplayYear,
  isStudentBoardGrassDateInRange,
  STUDENT_BOARD_GRASS_DAY_LABELS,
  toStudentBoardGrassDateKey,
} from "../student-board-grass";

interface StudentBoardGrassGridProps {
  dailyCells: StudentBoardDailyCell[];
  startDate?: string | null;
  endDate?: string | null;
  displayYear?: number | null;
  showMonthHeaders?: boolean;
  showDayLabels?: boolean;
}

export function StudentBoardGrassGrid({
  dailyCells,
  startDate,
  endDate,
  displayYear,
  showMonthHeaders = true,
  showDayLabels = true,
}: StudentBoardGrassGridProps) {
  const {
    weeks,
    monthHeaders,
    displayYear: resolvedDisplayYear,
  } = useMemo(
    () => buildStudentBoardGrassCalendar(startDate, endDate, displayYear),
    [displayYear, endDate, startDate],
  );
  const historyDateMap = useMemo(
    () => buildStudentBoardDailyCellDateMap(dailyCells),
    [dailyCells],
  );

  return (
    <div className="scrollbar-subtle overflow-x-auto">
      <table
        aria-hidden="true"
        className="border-separate border-spacing-[3px]"
      >
        {showMonthHeaders ? (
          <thead>
            <tr className="h-[13px]">
              {showDayLabels ? <td className="w-7" /> : null}
              {monthHeaders.map((label, index) => (
                <td
                  key={`${label || "blank"}-${index}`}
                  className="px-0 align-bottom text-[10px] text-text-dim"
                >
                  {label}
                </td>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {STUDENT_BOARD_GRASS_DAY_LABELS.map((label, dayIndex) => (
            <tr key={dayIndex} className="h-[11px]">
              {showDayLabels ? (
                <td className="pr-2 align-middle text-[10px] text-text-dim">
                  {label}
                </td>
              ) : null}
              {weeks.map((week, weekIndex) => {
                const date = week[dayIndex];
                const inRange =
                  isStudentBoardGrassDateInDisplayYear(
                    date,
                    resolvedDisplayYear,
                  ) &&
                  isStudentBoardGrassDateInRange({
                    date,
                    startDate,
                    endDate,
                  });
                const item = inRange
                  ? historyDateMap.get(toStudentBoardGrassDateKey(date))
                  : null;

                return (
                  <td key={`${dayIndex}-${weekIndex}`} className="p-0">
                    <div
                      className={`grid h-[11px] w-[14px] grid-cols-2 gap-px overflow-hidden rounded-[4px] p-px ${
                        inRange
                          ? "bg-white/[0.06] ring-1 ring-white/[0.07]"
                          : "bg-white/[0.015] ring-1 ring-white/[0.03]"
                      }`}
                    >
                      <span
                        className={`rounded-[1px] ${getStudentBoardGrassHalfTone(
                          {
                            item: item ?? null,
                            half: "attendance",
                            inRange,
                          },
                        )}`}
                      />
                      <span
                        className={`rounded-[1px] ${getStudentBoardGrassHalfTone(
                          {
                            item: item ?? null,
                            half: "assignment",
                            inRange,
                          },
                        )}`}
                      />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
