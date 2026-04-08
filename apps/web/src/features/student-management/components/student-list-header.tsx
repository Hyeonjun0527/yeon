"use client";

import { LayoutGrid, List, UserPlus } from "lucide-react";
import { STUDENT_STATUS_META } from "../constants";
import { ALL_TAGS, MOCK_CLASSES } from "../mock-data";
import styles from "../student-list.module.css";
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
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>학생 관리</h1>
          <p className={styles.pageSubtitle}>총 {totalCount}명</p>
        </div>
        <div className={styles.headerActions}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="이름, 학교, 태그 검색..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button className={styles.addButton} onClick={onAddStudent}>
            <UserPlus size={16} />
            학생 추가
          </button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <select
          className={styles.filterSelect}
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
          className={styles.filterSelect}
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
          className={styles.filterSelect}
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

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewToggleBtn}${viewMode === "card" ? ` ${styles.viewToggleBtnActive}` : ""}`}
            onClick={() => onViewModeChange("card")}
            aria-label="카드 뷰"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`${styles.viewToggleBtn}${viewMode === "table" ? ` ${styles.viewToggleBtnActive}` : ""}`}
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
