import { ChevronDown, Filter, Search } from "lucide-react";
import type { CounselingRecordListItem } from "@yeon/api-contract/counseling-records";
import type { RecordFilter } from "../types";
import { FILTER_META } from "../constants";
import styles from "../counseling-record-workspace.module.css";

export interface SidebarSearchFilterProps {
  records: CounselingRecordListItem[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  recordFilter: RecordFilter;
  setRecordFilter: (value: RecordFilter) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function SidebarSearchFilter({
  records,
  searchTerm,
  setSearchTerm,
  recordFilter,
  setRecordFilter,
  isFilterOpen,
  setIsFilterOpen,
}: SidebarSearchFilterProps) {
  return (
    <div className={styles.browseTools}>
      <label className={styles.searchField}>
        <Search
          size={16}
          strokeWidth={2.1}
          className={styles.searchIcon}
        />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className={styles.searchInput}
          placeholder="학생명, 상담 주제, 태그 검색"
          aria-label="상담 기록 검색"
        />
      </label>

      <div className={styles.filterToggleRow}>
        <button
          type="button"
          className={styles.filterToggleButton}
          onClick={() => setIsFilterOpen((prev) => !prev)}
          aria-expanded={isFilterOpen}
          aria-controls="browse-filter-chips"
        >
          <Filter size={14} strokeWidth={2.2} />
          {recordFilter !== "all" ? (
            <span className={styles.activeFilterLabel}>
              {FILTER_META.find((f) => f.id === recordFilter)?.label ??
                "전체"}
            </span>
          ) : (
            <span>필터</span>
          )}
          <ChevronDown
            size={14}
            strokeWidth={2.2}
            className={`${styles.filterToggleChevron} ${isFilterOpen ? styles.filterToggleChevronOpen : ""}`}
          />
        </button>
      </div>

      {isFilterOpen ? (
        <div id="browse-filter-chips" className={styles.filterRow}>
          {FILTER_META.map((filter) => {
            const count = records.filter((record) =>
              filter.id === "all" ? true : record.status === filter.id,
            ).length;

            return (
              <button
                key={filter.id}
                type="button"
                className={`${styles.filterChip} ${
                  recordFilter === filter.id ? styles.filterChipActive : ""
                }`}
                onClick={() => setRecordFilter(filter.id)}
              >
                <span className={styles.filterChipLabel}>
                  {filter.label}
                </span>
                <span className={styles.filterChipCount}>{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
