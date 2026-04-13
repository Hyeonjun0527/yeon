"use client";

import { useEffect, useMemo, useState } from "react";
import type { MemberStudentBoardResponse } from "@yeon/api-contract";

import { useMemberStudentBoard } from "../hooks/use-space-student-board";
import {
  getStudentBoardGrassAvailableYears,
  getStudentBoardGrassDefaultYear,
} from "../student-board-grass";
import { StudentBoardGrassGrid } from "./student-board-grass-grid";
import { StudentBoardGrassYearNavigator } from "./student-board-grass-year-navigator";

interface MemberBoardSlotCardProps {
  spaceId?: string | null;
  memberId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

function toMemberBoardSlotDailyCells(
  data: MemberStudentBoardResponse | undefined,
) {
  if (!data) {
    return [];
  }

  return data.dailyCells;
}

export function MemberBoardSlotCard({
  spaceId,
  memberId,
  startDate,
  endDate,
}: MemberBoardSlotCardProps) {
  const historyQuery = useMemberStudentBoard(
    spaceId ?? null,
    memberId ?? null,
    "space",
  );
  const dailyCells = useMemo(
    () => toMemberBoardSlotDailyCells(historyQuery.data),
    [historyQuery.data],
  );
  const hasRange = !!startDate;
  const availableYears = useMemo(
    () => getStudentBoardGrassAvailableYears(startDate, endDate),
    [endDate, startDate],
  );
  const defaultYear = useMemo(
    () => getStudentBoardGrassDefaultYear(startDate),
    [startDate],
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(defaultYear);

  useEffect(() => {
    if (availableYears.length === 0) {
      setSelectedYear(null);
      return;
    }

    setSelectedYear((previousYear) => {
      if (previousYear !== null && availableYears.includes(previousYear)) {
        return previousYear;
      }

      return defaultYear ?? availableYears[0] ?? null;
    });
  }, [availableYears, defaultYear]);

  return (
    <section className="border-t border-border pt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-sm font-semibold text-text">출석·과제 요약</p>
        <StudentBoardGrassYearNavigator
          years={availableYears}
          selectedYear={selectedYear}
          onChange={setSelectedYear}
        />
      </div>

      {!hasRange ? (
        <div className="mt-3 text-[12px] text-text-dim">
          진행기간을 설정하면 요약이 표시됩니다.
        </div>
      ) : null}

      {historyQuery.error instanceof Error ? (
        <div className="mt-3 text-[12px] text-red-300">
          출석·과제 이력을 불러오지 못했습니다.
        </div>
      ) : null}

      {hasRange && !(historyQuery.error instanceof Error) ? (
        <div className="mt-3">
          <StudentBoardGrassGrid
            dailyCells={dailyCells}
            startDate={startDate}
            endDate={endDate}
            displayYear={selectedYear}
          />
        </div>
      ) : null}
    </section>
  );
}
