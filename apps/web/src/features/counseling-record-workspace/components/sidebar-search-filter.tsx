import { ChevronDown, Filter, Search } from "lucide-react";
import type { CounselingRecordListItem } from "@yeon/api-contract/counseling-records";
import type { RecordFilter } from "../types";
import { FILTER_META } from "../constants";

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
    <div className="grid gap-[10px]">
      <label className="relative flex items-center">
        <Search
          size={16}
          strokeWidth={2.1}
          className="absolute left-[14px]"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full h-10 pl-10 pr-[14px] rounded-xl text-[13px] border outline-none transition-[border-color,background-color] duration-[180ms]"
          style={{
            borderColor: "var(--border-primary)",
            background: "var(--surface-secondary)",
            color: "var(--text-primary)",
          }}
          placeholder="수강생명, 상담 주제, 태그 검색"
          aria-label="상담 기록 검색"
        />
      </label>

      <div className="flex">
        <button
          type="button"
          className="inline-flex items-center gap-[6px] h-8 px-[10px] border rounded-full bg-transparent text-xs font-semibold cursor-pointer transition-[border-color,background-color] duration-[180ms]"
          style={{
            borderColor: "var(--border-soft)",
            color: "var(--text-secondary)",
          }}
          onClick={() => setIsFilterOpen((prev) => !prev)}
          aria-expanded={isFilterOpen}
          aria-controls="browse-filter-chips"
        >
          <Filter size={14} strokeWidth={2.2} />
          {recordFilter !== "all" ? (
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>
              {FILTER_META.find((f) => f.id === recordFilter)?.label ?? "전체"}
            </span>
          ) : (
            <span>필터</span>
          )}
          <ChevronDown
            size={14}
            strokeWidth={2.2}
            className="transition-transform duration-[180ms]"
            style={{ transform: isFilterOpen ? "rotate(180deg)" : undefined }}
          />
        </button>
      </div>

      {isFilterOpen ? (
        <div id="browse-filter-chips" className="flex flex-wrap gap-2">
          {FILTER_META.map((filter) => {
            const count = records.filter((record) =>
              filter.id === "all" ? true : record.status === filter.id,
            ).length;
            const isActive = recordFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                className="grid justify-items-center content-center gap-[2px] min-h-[34px] px-[10px] rounded-full text-xs font-bold cursor-pointer transition-[border-color,background-color,color,transform] duration-[180ms] hover:-translate-y-px"
                style={{
                  border: isActive
                    ? "1px solid rgba(99,102,241,0.24)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: isActive
                    ? "rgba(99,102,241,0.1)"
                    : "var(--surface-soft)",
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                }}
                onClick={() => setRecordFilter(filter.id)}
              >
                <span className="text-[11px] tracking-[-0.02em]">
                  {filter.label}
                </span>
                <span className="text-[13px] font-extrabold">{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
