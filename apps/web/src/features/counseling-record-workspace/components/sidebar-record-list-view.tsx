import type { CounselingRecordListItem } from "@yeon/api-contract/counseling-records";
import { formatDateTimeLabel } from "../utils";
import styles from "../counseling-record-workspace.module.css";

interface StatusMetaEntry {
  label: string;
  className: string;
  detail: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

export interface SidebarRecordListViewProps {
  filteredRecords: CounselingRecordListItem[];
  selectedRecord: CounselingRecordListItem | null;
  recentlySavedId: string | null;
  statusMeta: Record<CounselingRecordListItem["status"], StatusMetaEntry>;
  handleSelectRecord: (recordId: string) => void;
}

export function SidebarRecordListView({
  filteredRecords,
  selectedRecord,
  recentlySavedId,
  statusMeta,
  handleSelectRecord,
}: SidebarRecordListViewProps) {
  if (filteredRecords.length === 0) {
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
      {filteredRecords.map((record) => {
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
            {isSelected ? (
              <span className={styles.recordAccentBar} aria-hidden />
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
                  <span>{formatDateTimeLabel(record.createdAt)}</span>
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
      })}
    </>
  );
}
