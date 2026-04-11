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
      <div className="grid place-items-center gap-[6px] min-h-[120px] p-5 text-center">
        <p className="m-0 text-sm font-bold leading-[1.4]">
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
              </div>
            </div>
          </button>
        );
      })}
    </>
  );
}
