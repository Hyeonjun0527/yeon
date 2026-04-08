import { List, Upload, Users } from "lucide-react";
import type { CounselingRecordListItem } from "@yeon/api-contract/counseling-records";
import type { RecordFilter, SidebarViewMode } from "../types";
import styles from "../counseling-record-workspace.module.css";
import { SidebarSearchFilter } from "./sidebar-search-filter";
import { SidebarStudentGroupList } from "./sidebar-student-group-list";
import { SidebarRecordListView } from "./sidebar-record-list-view";

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
        <Upload size={14} strokeWidth={2.2} />새 기록
      </button>

      {records.length > 0 || isLoadingList || loadError ? (
        <section className={styles.browseSection}>
          <div className={styles.browseSectionHeader}>
            <h2 className={styles.sidebarSectionTitle}>기록 찾기</h2>
            {!isLoadingList && !loadError ? (
              <p className={styles.browseCount}>기록 {records.length}건</p>
            ) : null}
          </div>

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

          {records.length > 5 ? (
            <SidebarSearchFilter
              records={records}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              recordFilter={recordFilter}
              setRecordFilter={setRecordFilter}
              isFilterOpen={isFilterOpen}
              setIsFilterOpen={setIsFilterOpen}
            />
          ) : null}

          <div className={styles.recordList}>
            {isLoadingList ? (
              <div className={styles.skeletonList}>
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className={styles.skeletonCard}>
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
              <div className={styles.emptyListState}>
                <p className={styles.emptyStateTitle}>
                  목록을 불러오지 못했습니다.
                </p>
                <p className={styles.emptyStateDescription}>{loadError}</p>
              </div>
            ) : sidebarViewMode === "student" ? (
              <SidebarStudentGroupList
                studentGroups={studentGroups}
                expandedStudents={expandedStudents}
                setExpandedStudents={setExpandedStudents}
                selectedStudentName={selectedStudentName}
                setSelectedStudentName={setSelectedStudentName}
                selectedRecord={selectedRecord}
                recentlySavedId={recentlySavedId}
                statusMeta={statusMeta}
                handleSelectRecord={handleSelectRecord}
              />
            ) : (
              <SidebarRecordListView
                filteredRecords={filteredRecords}
                selectedRecord={selectedRecord}
                recentlySavedId={recentlySavedId}
                statusMeta={statusMeta}
                handleSelectRecord={handleSelectRecord}
              />
            )}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
