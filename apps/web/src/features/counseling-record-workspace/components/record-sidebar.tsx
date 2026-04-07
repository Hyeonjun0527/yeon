import {
  ChevronDown,
  Filter,
  List,
  Search,
  Upload,
  Users,
} from "lucide-react";
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
        className={styles.hiddenFileInput}
        onChange={handleAudioFileChange}
      />

      <button
        type="button"
        className={styles.newRecordButton}
        onClick={onNewRecord}
      >
        <Upload size={14} strokeWidth={2.2} />
        새 기록
      </button>

      {/* 탐색 섹션 (기록이 있을 때만) */}
      {records.length > 0 || isLoadingList || loadError ? (
        <section className={styles.browseSection}>
          <div className={styles.browseSectionHeader}>
            <h2 className={styles.sidebarSectionTitle}>기록 찾기</h2>
            {!isLoadingList && !loadError ? (
              <p className={styles.browseCount}>
                기록 {records.length}건
              </p>
            ) : null}
          </div>

          {/* 78차: 전체/학생별 뷰 전환 */}
          {!isLoadingList && !loadError && records.length > 0 ? (
            <div className={styles.viewModeToggle}>
              <button
                type="button"
                className={`${styles.viewModeButton} ${sidebarViewMode === "all" ? styles.viewModeButtonActive : ""}`}
                onClick={() => setSidebarViewMode("all")}
              >
                <List size={13} strokeWidth={2.2} />
                전체
              </button>
              <button
                type="button"
                className={`${styles.viewModeButton} ${sidebarViewMode === "student" ? styles.viewModeButtonActive : ""}`}
                onClick={() => setSidebarViewMode("student")}
              >
                <Users size={13} strokeWidth={2.2} />
                학생별
              </button>
            </div>
          ) : null}

          {/* 14차: 5건 초과일 때만 검색/필터 노출 */}
          {records.length > 5 ? (
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

              {/* 14차: 필터 기본 접힘 토글 */}
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
                      {FILTER_META.find((f) => f.id === recordFilter)
                        ?.label ?? "전체"}
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
                <div
                  id="browse-filter-chips"
                  className={styles.filterRow}
                >
                  {FILTER_META.map((filter) => {
                    const count = records.filter((record) =>
                      filter.id === "all"
                        ? true
                        : record.status === filter.id,
                    ).length;

                    return (
                      <button
                        key={filter.id}
                        type="button"
                        className={`${styles.filterChip} ${
                          recordFilter === filter.id
                            ? styles.filterChipActive
                            : ""
                        }`}
                        onClick={() => setRecordFilter(filter.id)}
                      >
                        <span className={styles.filterChipLabel}>
                          {filter.label}
                        </span>
                        <span className={styles.filterChipCount}>
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
              <div className={styles.skeletonList}>
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className={styles.skeletonCard}>
                    <div className={styles.skeletonLine} style={{ width: "60%" }} />
                    <div className={styles.skeletonLine} style={{ width: "80%" }} />
                    <div className={styles.skeletonLine} style={{ width: "40%" }} />
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className={styles.emptyListState}>
                <p className={styles.emptyStateTitle}>
                  목록을 불러오지 못했습니다.
                </p>
                <p className={styles.emptyStateDescription}>
                  {loadError}
                </p>
              </div>
            ) : sidebarViewMode === "student" ? (
              /* 78차: 학생별 그룹 뷰 */
              studentGroups.length > 0 ? (
                studentGroups.map((group) => {
                  const isExpanded = expandedStudents.has(
                    group.studentName,
                  );

                  return (
                    <div
                      key={group.studentName}
                      className={styles.studentGroup}
                    >
                      <button
                        type="button"
                        className={`${styles.studentGroupHeader} ${selectedStudentName === group.studentName ? styles.studentGroupHeaderActive : ""}`}
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
                          className={`${styles.studentGroupChevron} ${isExpanded ? styles.studentGroupChevronOpen : ""}`}
                        />
                        <span className={styles.studentGroupName}>
                          {group.studentName}
                        </span>
                        <span className={styles.studentGroupCount}>
                          {group.recordCount}건
                        </span>
                      </button>
                      {isExpanded
                        ? group.records.map((record) => {
                            const status = statusMeta[record.status];
                            const StatusIcon = status.icon;
                            const isSelected =
                              record.id === selectedRecord?.id;

                            return (
                              <button
                                key={record.id}
                                type="button"
                                className={`${styles.recordItem} ${styles.recordItemIndented} ${
                                  isSelected
                                    ? styles.recordItemSelected
                                    : ""
                                } ${recentlySavedId === record.id ? styles.recordItemSaved : ""}`}
                                onClick={() =>
                                  handleSelectRecord(record.id)
                                }
                              >
                                {isSelected ? (
                                  <span
                                    className={styles.recordAccentBar}
                                    aria-hidden
                                  />
                                ) : null}
                                <div className={styles.recordItemBody}>
                                  <div
                                    className={styles.recordItemHeader}
                                  >
                                    <div className={styles.recordMain}>
                                      <span
                                        className={
                                          styles.recordSessionTitle
                                        }
                                      >
                                        {record.sessionTitle}
                                      </span>
                                    </div>
                                    <div className={styles.recordMetaRow}>
                                      <span>
                                        {formatDateTimeLabel(
                                          record.createdAt,
                                        )}
                                      </span>
                                      <span
                                        className={`${styles.statusBadge} ${status.className}`}
                                      >
                                        <StatusIcon
                                          size={10}
                                          strokeWidth={2.2}
                                        />
                                        {status.label}
                                      </span>
                                    </div>
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
                <div className={styles.emptyListState}>
                  <p className={styles.emptyStateTitle}>
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
                    className={`${styles.recordItem} ${
                      isSelected ? styles.recordItemSelected : ""
                    } ${recentlySavedId === record.id ? styles.recordItemSaved : ""}`}
                    onClick={() => handleSelectRecord(record.id)}
                  >
                    {/* 15차: 선택 accent bar */}
                    {isSelected ? (
                      <span
                        className={styles.recordAccentBar}
                        aria-hidden
                      />
                    ) : null}

                    <div className={styles.recordItemBody}>
                      <div className={styles.recordItemHeader}>
                        <div className={styles.recordMain}>
                          <span className={styles.recordName}>
                            {record.studentName}
                          </span>
                          <span className={styles.recordSessionTitle}>
                            {record.sessionTitle}
                          </span>
                        </div>

                        <div className={styles.recordMetaRow}>
                          <span>
                            {formatDateTimeLabel(record.createdAt)}
                          </span>
                          <span
                            className={`${styles.statusBadge} ${status.className}`}
                          >
                            <StatusIcon size={10} strokeWidth={2.2} />
                            {status.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className={styles.emptyListState}>
                <p className={styles.emptyStateTitle}>
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
