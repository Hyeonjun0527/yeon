"use client";

import { LayoutGrid, List, UserPlus } from "lucide-react";
import { STUDENT_STATUS_META } from "../constants";
import { ALL_TAGS, MOCK_CLASSES } from "../mock-data";
import type { StudentStatus, ViewMode } from "../types";

export interface StudentListHeaderProps {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StudentStatus | "all";
  onStatusFilterChange: (value: StudentStatus | "all") => void;
  classFilter: string | "all";
  onClassFilterChange: (value: string | "all") => void;
  tagFilter: string | "all";
  onTagFilterChange: (value: string | "all") => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAddStudent: () => void;
}

export function StudentListHeader({
  totalCount,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  classFilter,
  onClassFilterChange,
  tagFilter,
  onTagFilterChange,
  viewMode,
  onViewModeChange,
  onAddStudent,
}: StudentListHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4 md:flex-row flex-col md:items-center items-start">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-[-0.02em]">
            수강생 관리
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            총 {totalCount}명
          </p>
        </div>
        <div className="flex items-center gap-[10px] md:w-auto w-full flex-wrap">
          <input
            type="text"
            className="py-2 px-[14px] border border-border rounded-lg text-sm w-[220px] outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border focus:shadow-[0_0_0_3px_var(--accent-dim)] md:w-[220px] w-full"
            placeholder="이름, 태그 검색..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button
            className="flex items-center gap-1.5 py-2 px-4 bg-accent text-white border-none rounded-sm text-sm font-semibold cursor-pointer transition-[opacity,box-shadow] duration-150 hover:opacity-90 hover:shadow-[0_8px_32px_rgba(129,140,248,0.25)]"
            onClick={onAddStudent}
          >
            <UserPlus size={16} />
            수강생 추가
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <select
          className="py-1.5 px-3 border border-border rounded-sm text-[13px] text-text-secondary bg-surface-2 cursor-pointer outline-none transition-[border-color] duration-150 hover:border-border-light focus:border-accent-border"
          value={statusFilter}
          onChange={(e) =>
            onStatusFilterChange(e.target.value as StudentStatus | "all")
          }
        >
          <option value="all">전체 상태</option>
          {(Object.keys(STUDENT_STATUS_META) as StudentStatus[]).map(
            (status) => (
              <option key={status} value={status}>
                {STUDENT_STATUS_META[status].label}
              </option>
            ),
          )}
        </select>

        <select
          className="py-1.5 px-3 border border-border rounded-sm text-[13px] text-text-secondary bg-surface-2 cursor-pointer outline-none transition-[border-color] duration-150 hover:border-border-light focus:border-accent-border"
          value={classFilter}
          onChange={(e) => onClassFilterChange(e.target.value)}
        >
          <option value="all">전체 반</option>
          {MOCK_CLASSES.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>

        <select
          className="py-1.5 px-3 border border-border rounded-sm text-[13px] text-text-secondary bg-surface-2 cursor-pointer outline-none transition-[border-color] duration-150 hover:border-border-light focus:border-accent-border"
          value={tagFilter}
          onChange={(e) => onTagFilterChange(e.target.value)}
        >
          <option value="all">전체 태그</option>
          {ALL_TAGS.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>

        <div className="flex gap-0.5 ml-auto bg-surface-2 rounded-sm p-0.5">
          <button
            className={`py-1.5 px-2.5 border-none rounded-[4px] cursor-pointer transition-all duration-150 flex items-center${viewMode === "card" ? " bg-surface-3 text-text shadow-[0_1px_2px_rgba(0,0,0,0.2)]" : " bg-transparent text-text-dim"}`}
            onClick={() => onViewModeChange("card")}
            aria-label="카드 뷰"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`py-1.5 px-2.5 border-none rounded-[4px] cursor-pointer transition-all duration-150 flex items-center${viewMode === "table" ? " bg-surface-3 text-text shadow-[0_1px_2px_rgba(0,0,0,0.2)]" : " bg-transparent text-text-dim"}`}
            onClick={() => onViewModeChange("table")}
            aria-label="테이블 뷰"
          >
            <List size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
