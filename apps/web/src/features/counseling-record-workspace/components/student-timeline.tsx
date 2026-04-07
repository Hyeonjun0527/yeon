import {
  Bot,
  ClipboardCopy,
  LoaderCircle,
  Square,
  Users,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CounselingRecordListItem } from "@yeon/api-contract";
import { formatDateTimeLabel } from "../utils";
import styles from "../counseling-record-workspace.module.css";

interface StatusMetaEntry {
  label: string;
  className: string;
  detail: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

export interface StudentTimelineProps {
  selectedStudentName: string;
  filteredRecords: CounselingRecordListItem[];
  statusMeta: Record<CounselingRecordListItem["status"], StatusMetaEntry>;
  handleSelectRecord: (recordId: string) => void;
  trendAnalysis: {
    studentName: string;
    content: string;
    isStreaming: boolean;
  } | null;
  handleStartTrendAnalysis: (
    studentName: string,
    recordIds: string[],
  ) => void;
  handleStopTrendAnalysis: () => void;
  setSaveToast: (message: string) => void;
}

export function StudentTimeline({
  selectedStudentName,
  filteredRecords,
  statusMeta,
  handleSelectRecord,
  trendAnalysis,
  handleStartTrendAnalysis,
  handleStopTrendAnalysis,
  setSaveToast,
}: StudentTimelineProps) {
  const studentRecords = filteredRecords
    .filter((r) => r.studentName === selectedStudentName)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime(),
    );

  return (
    <div className={styles.studentTimeline}>
      <div className={styles.timelineHeader}>
        <Users size={20} strokeWidth={1.8} />
        <h2 className={styles.timelineTitle}>
          {selectedStudentName}
        </h2>
        <span className={styles.timelineCount}>
          상담 {studentRecords.length}건
        </span>
      </div>

      {studentRecords.length === 0 ? (
        <p className={styles.timelineEmptyText}>
          해당 학생의 상담 기록이 없습니다.
        </p>
      ) : (
        <div className={styles.timelineList}>
          {studentRecords.map((record, index) => {
            const status = statusMeta[record.status];
            const StatusIcon = status.icon;

            return (
              <div
                key={record.id}
                className={styles.timelineItem}
              >
                <div className={styles.timelineTrack}>
                  <div className={styles.timelineDot} />
                  {index < studentRecords.length - 1 ? (
                    <div className={styles.timelineLine} />
                  ) : null}
                </div>
                <button
                  type="button"
                  className={styles.timelineCard}
                  onClick={() =>
                    handleSelectRecord(record.id)
                  }
                >
                  <div className={styles.timelineCardHeader}>
                    <span className={styles.timelineDate}>
                      {formatDateTimeLabel(record.createdAt)}
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
                  <p className={styles.timelineCardTitle}>
                    {record.sessionTitle}
                  </p>
                  <div className={styles.timelineCardMeta}>
                    <span>{record.counselingType}</span>
                    {record.preview ? (
                      <span className={styles.timelinePreview}>
                        {record.preview}
                      </span>
                    ) : null}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {studentRecords.length >= 3 ? (
        <button
          type="button"
          className={styles.trendAnalysisButton}
          disabled={
            trendAnalysis?.isStreaming &&
            trendAnalysis.studentName === selectedStudentName
          }
          onClick={() => {
            handleStartTrendAnalysis(
              selectedStudentName,
              studentRecords.map((r) => r.id),
            );
          }}
        >
          {trendAnalysis?.isStreaming &&
          trendAnalysis.studentName === selectedStudentName ? (
            <>
              <LoaderCircle
                size={16}
                strokeWidth={2}
                className={styles.spinnerIcon}
              />
              분석 중...
            </>
          ) : (
            <>
              <Bot size={16} strokeWidth={2} />
              AI 추이 분석
            </>
          )}
        </button>
      ) : null}

      {/* 78차: 추이 분석 결과 패널 */}
      {trendAnalysis &&
      trendAnalysis.studentName === selectedStudentName ? (
        <div className={styles.trendResultPanel}>
          <div className={styles.trendResultHeader}>
            <Bot size={14} strokeWidth={2} />
            <span className={styles.trendResultTitle}>
              추이 분석 결과
            </span>
            {trendAnalysis.isStreaming ? (
              <button
                type="button"
                className={styles.trendStopButton}
                onClick={handleStopTrendAnalysis}
              >
                <Square size={12} strokeWidth={2.5} />
                중지
              </button>
            ) : (
              <button
                type="button"
                className={styles.trendExportButton}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      trendAnalysis.content,
                    );
                    setSaveToast(
                      "추이 분석이 클립보드에 복사되었습니다.",
                    );
                  } catch {
                    setSaveToast(
                      "클립보드 복사에 실패했습니다.",
                    );
                  }
                }}
              >
                <ClipboardCopy size={12} strokeWidth={2} />
                복사
              </button>
            )}
          </div>
          <div className={styles.trendResultContent}>
            <Markdown remarkPlugins={[remarkGfm]}>
              {trendAnalysis.content}
            </Markdown>
            {trendAnalysis.isStreaming ? (
              <span className={styles.streamingCursor} />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
