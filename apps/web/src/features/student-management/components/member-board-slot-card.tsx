"use client";

import { useMemo } from "react";
import type { MemberStudentBoardResponse } from "@yeon/api-contract";

import { useMemberStudentBoard } from "../hooks/use-space-student-board";
import { StudentBoardGrassGrid } from "./student-board-grass-grid";

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

  return (
    <section className="border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-sm font-semibold text-text">출석·과제 요약</p>
        <span className="text-[11px] text-text-dim">출석 / 과제</span>
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
          />
        </div>
      ) : null}
    </section>
  );
}
