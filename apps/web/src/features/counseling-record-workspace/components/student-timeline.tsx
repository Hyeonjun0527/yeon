import { Bot, ClipboardCopy, LoaderCircle, Square, Users } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CounselingRecordListItem } from "@yeon/api-contract/counseling-records";
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
  handleStartTrendAnalysis: (studentName: string, recordIds: string[]) => void;
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
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  return (
    <div className="scrollbar-subtle flex flex-col gap-5 p-6 max-w-[640px] mx-auto overflow-y-auto">
      <div
        className="flex items-center gap-[10px]"
        style={{ color: "var(--text-primary)" }}
      >
        <Users size={20} strokeWidth={1.8} />
        <h2 className="m-0 text-xl font-bold tracking-[-0.02em]">
          {selectedStudentName}
        </h2>
        <span
          className="text-[13px] font-semibold"
          style={{ color: "var(--text-muted)" }}
        >
          상담 {studentRecords.length}건
        </span>
      </div>

      {studentRecords.length === 0 ? (
        <p
          className="text-sm text-center py-8"
          style={{ color: "var(--text-muted)" }}
        >
          해당 수강생의 상담 기록이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col">
          {studentRecords.map((record, index) => {
            const status = statusMeta[record.status];
            const StatusIcon = status.icon;

            return (
              <div key={record.id} className="flex gap-[14px] min-h-0">
                <div className="flex flex-col items-center w-5 flex-shrink-0 pt-[6px]">
                  <div
                    className="w-[10px] h-[10px] rounded-full flex-shrink-0"
                    style={{ background: "var(--accent)" }}
                  />
                  {index < studentRecords.length - 1 ? (
                    <div
                      className="w-[2px] flex-1 mt-1"
                      style={{ background: "var(--border-primary)" }}
                    />
                  ) : null}
                </div>
                <button
                  type="button"
                  className="flex-1 flex flex-col gap-[6px] py-3 px-[14px] mb-3 border rounded-xl cursor-pointer text-left transition-[border-color,box-shadow] duration-150 hover:border-[var(--accent)]"
                  style={{
                    borderColor: "var(--border-primary)",
                    background: "var(--surface-primary)",
                  }}
                  onClick={() => handleSelectRecord(record.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {formatDateTimeLabel(record.createdAt)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 py-[3px] px-2 rounded-full text-[11px] font-semibold leading-none whitespace-nowrap ${status.className}`}
                    >
                      <StatusIcon size={10} strokeWidth={2.2} />
                      {status.label}
                    </span>
                  </div>
                  <p
                    className="m-0 text-sm font-bold leading-[1.3]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {record.sessionTitle}
                  </p>
                  <div
                    className="flex items-center gap-2 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <span>{record.counselingType}</span>
                    {record.preview ? (
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[280px]">
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
          className="flex items-center justify-center gap-2 w-full py-[10px] px-4 border rounded-xl text-sm font-bold cursor-pointer transition-[background,box-shadow] duration-150 disabled:opacity-70 disabled:cursor-not-allowed hover:enabled:text-white"
          style={{
            borderColor: "var(--accent)",
            background: "var(--accent-soft)",
            color: "var(--accent)",
          }}
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

      {trendAnalysis && trendAnalysis.studentName === selectedStudentName ? (
        <div
          className="flex flex-col gap-3 p-4 border rounded-xl"
          style={{
            borderColor: "var(--border-primary)",
            background: "var(--surface-primary)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div
            className="flex items-center gap-2 text-[13px] font-bold"
            style={{ color: "var(--accent)" }}
          >
            <Bot size={14} strokeWidth={2} />
            <span className="flex-1">추이 분석 결과</span>
            {trendAnalysis.isStreaming ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 py-1 px-[10px] border rounded-lg bg-transparent text-xs font-semibold cursor-pointer transition-[background] duration-[120ms]"
                style={{
                  borderColor: "var(--border-primary)",
                  color: "var(--text-secondary)",
                }}
                onClick={handleStopTrendAnalysis}
              >
                <Square size={12} strokeWidth={2.5} />
                중지
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1 py-1 px-[10px] border rounded-lg bg-transparent text-xs font-semibold cursor-pointer transition-[background] duration-[120ms]"
                style={{
                  borderColor: "var(--border-primary)",
                  color: "var(--text-secondary)",
                }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(trendAnalysis.content);
                    setSaveToast("추이 분석이 클립보드에 복사되었습니다.");
                  } catch {
                    setSaveToast("클립보드 복사에 실패했습니다.");
                  }
                }}
              >
                <ClipboardCopy size={12} strokeWidth={2} />
                복사
              </button>
            )}
          </div>
          <div
            className={`text-sm leading-[1.7] ${styles.trendResultContent}`}
            style={{ color: "var(--text-primary)" }}
          >
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
