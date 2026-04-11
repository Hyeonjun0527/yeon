import { ChevronDown, Filter, List, Search, Upload, Users } from "lucide-react";
import type { CounselingRecordListItem } from "@yeon/api-contract";
import type { RecordFilter, SidebarViewMode } from "../types";
import { FILTER_META } from "../constants";
import { formatDateTimeLabel } from "../utils";
import styles from "../counseling-record-workspace.module.css";

interface StatusMetaEntry {
  label: string;
  className: string;
  detail: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

export interface RecordSidebarProps {
  records: CounselingRecordListItem[];
  filteredRecords: CounselingRecordListItem[];
  selectedRecord: CounselingRecordListItem | null;
  recentlySavedId: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  recordFilter: RecordFilter;
  setRecordFilter: (value: RecordFilter) => void;
  sidebarViewMode: SidebarViewMode;
  setSidebarViewMode: (value: SidebarViewMode) => void;
  expandedStudents: Set<string>;
  setExpandedStudents: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedStudentName: string | null;
  setSelectedStudentName: (value: string | null) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingList: boolean;
  loadError: string | null;
  studentGroups: Array<{
    studentName: string;
    records: CounselingRecordListItem[];
    recordCount: number;
    lastCounselingAt: string;
  }>;
  statusMeta: Record<CounselingRecordListItem["status"], StatusMetaEntry>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleAudioFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectRecord: (recordId: string) => void;
  onNewRecord: () => void;
}

export function RecordSidebar({
  records,
  filteredRecords,
  selectedRecord,
  recentlySavedId,
  searchTerm,
  setSearchTerm,
  recordFilter,
  setRecordFilter,
  sidebarViewMode,
  setSidebarViewMode,
  expandedStudents,
  setExpandedStudents,
  selectedStudentName,
  setSelectedStudentName,
  isFilterOpen,
  setIsFilterOpen,
  isLoadingList,
  loadError,
  studentGroups,
  statusMeta,
  fileInputRef,
  handleAudioFileChange,
  handleSelectRecord,
  onNewRecord,
}: RecordSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioFileChange}
      />

      <button
        type="button"
        className="flex items-center justify-center gap-[6px] w-full min-h-9 px-3 border border-dashed rounded-lg bg-transparent text-[13px] font-semibold cursor-pointer transition-[background-color,border-color] duration-[120ms]"
        style={{
          borderColor: "var(--border-primary)",
          color: "var(--accent)",
        }}
        onClick={onNewRecord}
      >
        <Upload size={14} strokeWidth={2.2} />새 기록
      </button>

      {/* 탐색 섹션 (기록이 있을 때만) */}
      {records.length > 0 || isLoadingList || loadError ? (
        <section className={styles.browseSection}>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="m-0 text-[17px] font-bold leading-[1.2] tracking-[-0.02em]">
              기록 찾기
            </h2>
            {!isLoadingList && !loadError ? (
              <p className="m-0 text-xs" style={{ color: "var(--text-muted)" }}>
                기록 {records.length}건
              </p>
            ) : null}
          </div>

          {/* 전체/수강생별 뷰 전환 */}
          {!isLoadingList && !loadError && records.length > 0 ? (
            <div
              className="flex gap-[2px] p-[2px] rounded-[10px]"
              style={{ background: "var(--surface-soft)" }}
            >
              <button
                type="button"
                className={`flex items-center gap-[5px] flex-1 justify-center py-[5px] px-2 border-none rounded-lg text-xs font-semibold cursor-pointer transition-[background,color] duration-150 ${
                  sidebarViewMode === "all" ? "shadow-sm" : ""
                }`}
                style={
                  sidebarViewMode === "all"
                    ? {
                        background: "var(--surface-primary)",
                        color: "var(--text-primary)",
                      }
                    : { background: "transparent", color: "var(--text-muted)" }
                }
                onClick={() => setSidebarViewMode("all")}
              >
                <List size={13} strokeWidth={2.2} />
                전체
              </button>
              <button
                type="button"
                className={`flex items-center gap-[5px] flex-1 justify-center py-[5px] px-2 border-none rounded-lg text-xs font-semibold cursor-pointer transition-[background,color] duration-150 ${
                  sidebarViewMode === "student" ? "shadow-sm" : ""
                }`}
                style={
                  sidebarViewMode === "student"
                    ? {
                        background: "var(--surface-primary)",
                        color: "var(--text-primary)",
                      }
                    : { background: "transparent", color: "var(--text-muted)" }
                }
                onClick={() => setSidebarViewMode("student")}
              >
                <Users size={13} strokeWidth={2.2} />
                수강생별
              </button>
            </div>
          ) : null}

          {/* 5건 초과일 때만 검색/필터 노출 */}
          {records.length > 5 ? (
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
                      {FILTER_META.find((f) => f.id === recordFilter)?.label ??
                        "전체"}
                    </span>
                  ) : (
                    <span>필터</span>
                  )}
                  <ChevronDown
                    size={14}
                    strokeWidth={2.2}
                    className="transition-transform duration-[180ms]"
                    style={{
                      transform: isFilterOpen ? "rotate(180deg)" : undefined,
                    }}
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
                          color: isActive
                            ? "var(--accent)"
                            : "var(--text-secondary)",
                        }}
                        onClick={() => setRecordFilter(filter.id)}
                      >
                        <span className="text-[11px] tracking-[-0.02em]">
                          {filter.label}
                        </span>
                        <span className="text-[13px] font-extrabold">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={styles.recordList}>
            {isLoadingList ? (
              <div className="grid gap-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className="grid gap-2 p-[14px] rounded-[10px] border"
                    style={{
                      borderColor: "rgba(255,255,255,0.06)",
                      background: "var(--surface-soft)",
                    }}
                  >
                    <div
                      className={styles.skeletonLine}
                      style={{ width: "60%" }}
                    />
                    <div
                      className={styles.skeletonLine}
                      style={{ width: "80%" }}
                    />
                    <div
                      className={styles.skeletonLine}
                      style={{ width: "40%" }}
                    />
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="grid place-items-center gap-[6px] min-h-[120px] p-5 text-center">
                <p className="m-0 text-sm font-bold leading-[1.4]">
                  목록을 불러오지 못했습니다.
                </p>
                <p
                  className="m-0 text-[13px] leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {loadError}
                </p>
              </div>
            ) : sidebarViewMode === "student" ? (
              studentGroups.length > 0 ? (
                studentGroups.map((group) => {
                  const isExpanded = expandedStudents.has(group.studentName);

                  return (
                    <div key={group.studentName} className="flex flex-col">
                      <button
                        type="button"
                        className="flex items-center gap-2 py-2 px-[10px] border-none rounded-[10px] text-[13px] font-bold cursor-pointer text-left transition-[background] duration-[120ms]"
                        style={
                          selectedStudentName === group.studentName
                            ? {
                                background: "var(--accent-soft)",
                                color: "var(--accent)",
                              }
                            : {
                                background: "transparent",
                                color: "var(--text-primary)",
                              }
                        }
                        onClick={() => {
                          setExpandedStudents((prev) => {
                            const next = new Set(prev);
                            if (next.has(group.studentName)) {
                              next.delete(group.studentName);
                            } else {
                              next.add(group.studentName);
                            }
                            return next;
                          });
                          setSelectedStudentName(group.studentName);
                        }}
                      >
                        <ChevronDown
                          size={14}
                          strokeWidth={2.2}
                          className={styles.studentGroupChevron}
                          style={
                            isExpanded
                              ? undefined
                              : { transform: "rotate(-90deg)" }
                          }
                        />
                        <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                          {group.studentName}
                        </span>
                        <span
                          className="flex-shrink-0 text-[11px] font-semibold"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {group.recordCount}건
                        </span>
                      </button>
                      {isExpanded
                        ? group.records.map((record) => {
                            const status = statusMeta[record.status];
                            const StatusIcon = status.icon;
                            const isSelected = record.id === selectedRecord?.id;

                            return (
                              <button
                                key={record.id}
                                type="button"
                                className={`${styles.recordItem} ml-[14px] ${isSelected ? styles.recordItemSelected : ""} ${recentlySavedId === record.id ? styles.recordItemSaved : ""}`}
                                onClick={() => handleSelectRecord(record.id)}
                              >
                                {isSelected ? (
                                  <span
                                    className="flex-shrink-0 w-[3px] self-stretch"
                                    style={{ background: "var(--accent)" }}
                                    aria-hidden
                                  />
                                ) : null}
                                <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] items-center gap-2 py-[10px] px-3">
                                  <div className="contents">
                                    <div className="min-w-0 flex items-baseline gap-2">
                                      <span
                                        className="m-0 text-[12px] overflow-hidden text-ellipsis whitespace-nowrap"
                                        style={{ color: "var(--text-muted)" }}
                                      >
                                        {record.sessionTitle}
                                      </span>
                                    </div>
                                    <div
                                      className="flex items-center gap-2 text-[11px] whitespace-nowrap"
                                      style={{ color: "var(--text-muted)" }}
                                    >
                                      <span>
                                        {formatDateTimeLabel(record.createdAt)}
                                      </span>
                                      <span
                                        className={`inline-flex items-center gap-1 py-[3px] px-2 rounded-full text-[11px] font-semibold leading-none whitespace-nowrap ${status.className}`}
                                      >
                                        <StatusIcon
                                          size={10}
                                          strokeWidth={2.2}
                                        />
                                        {status.label}
                                      </span>
                                    </div>
                                    {record.status === "processing" ||
                                    ["queued", "processing"].includes(
                                      record.analysisStatus,
                                    ) ? (
                                      <div
                                        className="col-span-2 text-[11px] leading-[1.5] text-left"
                                        style={{ color: "var(--text-muted)" }}
                                      >
                                        {record.processingMessage ||
                                          (record.analysisStatus ===
                                          "processing"
                                            ? `AI 분석 ${record.analysisProgress}%`
                                            : `진행률 ${record.processingProgress}%`)}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        : null}
                    </div>
                  );
                })
              ) : (
                <div className="grid place-items-center gap-[6px] min-h-[120px] p-5 text-center">
                  <p className="m-0 text-sm font-bold leading-[1.4]">
                    표시할 상담 기록이 없습니다.
                  </p>
                </div>
              )
            ) : filteredRecords.length > 0 ? (
              filteredRecords.map((record) => {
                const status = statusMeta[record.status];
                const StatusIcon = status.icon;
                const isSelected = record.id === selectedRecord?.id;

                return (
                  <button
                    key={record.id}
                    type="button"
                    className={`${styles.recordItem} ${isSelected ? styles.recordItemSelected : ""} ${recentlySavedId === record.id ? styles.recordItemSaved : ""}`}
                    onClick={() => handleSelectRecord(record.id)}
                  >
                    {isSelected ? (
                      <span
                        className="flex-shrink-0 w-[3px] self-stretch"
                        style={{ background: "var(--accent)" }}
                        aria-hidden
                      />
                    ) : null}

                    <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] items-center gap-2 py-[10px] px-3">
                      <div className="contents">
                        <div className="min-w-0 flex items-baseline gap-2">
                          <span className="m-0 text-[13px] font-semibold leading-[1.3] whitespace-nowrap">
                            {record.studentName}
                          </span>
                          <span
                            className="m-0 text-xs leading-[1.3] overflow-hidden text-ellipsis whitespace-nowrap"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {record.sessionTitle}
                          </span>
                        </div>

                        <div
                          className="flex items-center gap-2 text-[11px] whitespace-nowrap"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <span>{formatDateTimeLabel(record.createdAt)}</span>
                          <span
                            className={`inline-flex items-center gap-1 py-[3px] px-2 rounded-full text-[11px] font-semibold leading-none whitespace-nowrap ${status.className}`}
                          >
                            <StatusIcon size={10} strokeWidth={2.2} />
                            {status.label}
                          </span>
                        </div>
                        {record.status === "processing" ||
                        ["queued", "processing"].includes(
                          record.analysisStatus,
                        ) ? (
                          <div
                            className="col-span-2 text-[11px] leading-[1.5] text-left"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {record.processingMessage ||
                              (record.analysisStatus === "processing"
                                ? `AI 분석 ${record.analysisProgress}%`
                                : `진행률 ${record.processingProgress}%`)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="grid place-items-center gap-[6px] min-h-[120px] p-5 text-center">
                <p className="m-0 text-sm font-bold leading-[1.4]">
                  표시할 상담 기록이 없습니다.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
