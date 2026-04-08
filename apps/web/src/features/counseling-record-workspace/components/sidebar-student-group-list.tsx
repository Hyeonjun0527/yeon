import { ChevronDown } from "lucide-react";
import type { CounselingRecordListItem } from "@yeon/api-contract/counseling-records";
import { formatDateTimeLabel } from "../utils";
import styles from "../counseling-record-workspace.module.css";

interface StatusMetaEntry {
  label: string;
  className: string;
  detail: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

export interface SidebarStudentGroupListProps {
  studentGroups: Array<{
    studentName: string;
    records: CounselingRecordListItem[];
    recordCount: number;
    lastCounselingAt: string;
  }>;
  expandedStudents: Set<string>;
  setExpandedStudents: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedStudentName: string | null;
  setSelectedStudentName: (value: string | null) => void;
  selectedRecord: CounselingRecordListItem | null;
  recentlySavedId: string | null;
  statusMeta: Record<CounselingRecordListItem["status"], StatusMetaEntry>;
  handleSelectRecord: (recordId: string) => void;
}

export function SidebarStudentGroupList({
  studentGroups,
  expandedStudents,
  setExpandedStudents,
  selectedStudentName,
  setSelectedStudentName,
  selectedRecord,
  recentlySavedId,
  statusMeta,
  handleSelectRecord,
}: SidebarStudentGroupListProps) {
  if (studentGroups.length === 0) {
    return (
      <div className={styles.emptyListState}>
        <p className={styles.emptyStateTitle}>
          표시할 상담 기록이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <>
      {studentGroups.map((group) => {
        const isExpanded = expandedStudents.has(group.studentName);

        return (
          <div key={group.studentName} className={styles.studentGroup}>
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
                  const isSelected = record.id === selectedRecord?.id;

                  return (
                    <button
                      key={record.id}
                      type="button"
                      className={`${styles.recordItem} ${styles.recordItemIndented} ${
                        isSelected ? styles.recordItemSelected : ""
                      } ${recentlySavedId === record.id ? styles.recordItemSaved : ""}`}
                      onClick={() => handleSelectRecord(record.id)}
                    >
                      {isSelected ? (
                        <span
                          className={styles.recordAccentBar}
                          aria-hidden
                        />
                      ) : null}
                      <div className={styles.recordItemBody}>
                        <div className={styles.recordItemHeader}>
                          <div className={styles.recordMain}>
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
              : null}
          </div>
        );
      })}
    </>
  );
}
