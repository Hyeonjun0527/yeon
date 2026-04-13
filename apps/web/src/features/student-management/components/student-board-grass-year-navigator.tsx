"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface StudentBoardGrassYearNavigatorProps {
  years: number[];
  selectedYear: number | null;
  onChange: (year: number) => void;
}

export function StudentBoardGrassYearNavigator({
  years,
  selectedYear,
  onChange,
}: StudentBoardGrassYearNavigatorProps) {
  if (years.length === 0 || selectedYear === null) {
    return null;
  }

  const selectedIndex = years.indexOf(selectedYear);
  const previousYear =
    selectedIndex > 0 ? (years[selectedIndex - 1] ?? null) : null;
  const nextYear =
    selectedIndex >= 0 && selectedIndex < years.length - 1
      ? (years[selectedIndex + 1] ?? null)
      : null;

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-1 py-1">
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:text-text-dim/50 disabled:hover:bg-transparent"
        onClick={() => previousYear && onChange(previousYear)}
        disabled={previousYear === null}
        aria-label="이전 연도 보기"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="min-w-[72px] text-center text-xs font-medium text-text">
        {selectedYear}년
      </span>
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:text-text-dim/50 disabled:hover:bg-transparent"
        onClick={() => nextYear && onChange(nextYear)}
        disabled={nextYear === null}
        aria-label="다음 연도 보기"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
