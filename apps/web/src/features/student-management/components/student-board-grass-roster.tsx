"use client";

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type {
  StudentBoardDailyCell,
  StudentBoardRow,
} from "@yeon/api-contract";

import type { Member } from "../types";
import { StudentBoardGrassGrid } from "./student-board-grass-grid";

function countMatchingCells(
  dailyCells: StudentBoardDailyCell[],
  target: {
    attendanceStatus?: StudentBoardDailyCell["attendanceStatus"];
    assignmentStatus?: StudentBoardDailyCell["assignmentStatus"];
  },
) {
  return dailyCells.filter((cell) => {
    if (target.attendanceStatus) {
      return cell.attendanceStatus === target.attendanceStatus;
    }

    if (target.assignmentStatus) {
      return cell.assignmentStatus === target.assignmentStatus;
    }

    return false;
  }).length;
}

interface StudentBoardGrassRosterProps {
  members: Member[];
  rows: StudentBoardRow[];
  startDate?: string | null;
  endDate?: string | null;
}

export function StudentBoardGrassRoster({
  members,
  rows,
  startDate,
  endDate,
}: StudentBoardGrassRosterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rosterItems = useMemo(() => {
    const rowMap = new Map(rows.map((row) => [row.memberId, row]));

    return members.map((member) => {
      const row = rowMap.get(member.id);
      const dailyCells = row ? row.dailyCells : [];

      return {
        member,
        dailyCells,
        presentCount: countMatchingCells(dailyCells, {
          attendanceStatus: "present",
        }),
        assignmentDoneCount: countMatchingCells(dailyCells, {
          assignmentStatus: "done",
        }),
      };
    });
  }, [members, rows]);
  const rowVirtualizer = useVirtualizer({
    count: startDate ? rosterItems.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 118,
    overscan: 6,
    measureElement: (element) => element?.getBoundingClientRect().height ?? 118,
  });

  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-3 sm:p-4">
      <div className="flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-text">출석·과제 잔디</h4>
          <p className="mt-1 text-[11px] text-text-dim">
            진행기간 전체 · 하루 2분할 · 범위 밖 날짜는 ghost cell로 유지
          </p>
        </div>
        <div className="text-[11px] text-text-dim">{members.length}명 보기</div>
      </div>

      {!startDate ? (
        <div className="px-1 py-5 text-sm text-text-secondary">
          진행기간을 설정하면 잔디가 표시됩니다.
        </div>
      ) : null}

      {startDate ? (
        <div className="scrollbar-subtle mt-4 overflow-x-auto">
          <div className="min-w-[880px]">
            <div className="grid grid-cols-[180px_minmax(0,1fr)] items-start gap-3 border-b border-border pb-3">
              <div className="px-1 pt-[13px] text-[11px] text-text-dim">
                이름 · 출석 · 과제 완료
              </div>
              <StudentBoardGrassGrid
                dailyCells={[]}
                startDate={startDate}
                endDate={endDate}
              />
            </div>

            <div
              ref={scrollRef}
              className="mt-3 max-h-[560px] overflow-y-auto pr-1"
            >
              <div
                className="relative"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = rosterItems[virtualRow.index];

                  return (
                    <div
                      key={item.member.id}
                      ref={rowVirtualizer.measureElement}
                      className="absolute left-0 top-0 w-full"
                      style={{
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="grid grid-cols-[180px_minmax(0,1fr)] items-start gap-3 rounded-xl border border-border bg-surface px-3 py-3">
                        <div className="min-w-0 pt-1">
                          <div className="truncate text-[13px] font-semibold tracking-[-0.02em] text-text">
                            {item.member.name}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-text-dim">
                            <span>{item.presentCount}회 출석</span>
                            <span>·</span>
                            <span>{item.assignmentDoneCount}회 완료</span>
                          </div>
                        </div>

                        <StudentBoardGrassGrid
                          dailyCells={item.dailyCells}
                          startDate={startDate}
                          endDate={endDate}
                          showMonthHeaders={false}
                          showDayLabels={false}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
