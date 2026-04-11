"use client";

import { useState } from "react";
import type { RecordItem } from "../_lib/types";
import type { MemberWithStatus } from "../_hooks/use-space-members";
import { exportMemberReportDocx } from "../_lib/export-docx";

export interface MemberPanelProps {
  member: MemberWithStatus;
  records: RecordItem[];
  onSelectRecord: (id: string) => void;
  onStartRecording: () => void;
}

function fmtDaysSince(days: number | null): string {
  if (days === null) return "상담 기록 없음";
  if (days === 0) return "오늘 상담";
  if (days === 1) return "어제 상담";
  return `${days}일 전 상담`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function fmtDuration(ms: number): string {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function MemberPanel({
  member,
  records,
  onSelectRecord,
  onStartRecording,
}: MemberPanelProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await exportMemberReportDocx(member, records);
    } finally {
      setExporting(false);
    }
  }

  const memberRecords = records
    .filter((r) => r.memberId === member.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const indicatorColor =
    member.indicator === "recent"
      ? "bg-green"
      : member.indicator === "warning"
        ? "bg-amber"
        : "bg-surface-4 border border-border";

  const indicatorTextColor =
    member.indicator === "recent"
      ? "text-green"
      : member.indicator === "warning"
        ? "text-amber"
        : "text-text-dim";

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
      {/* 수강생 헤더 */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-surface-3 border border-border flex items-center justify-center text-lg font-semibold text-text flex-shrink-0">
          {member.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-text mb-0.5">
            {member.name}
          </h2>
          <div
            className={`flex items-center gap-1.5 text-sm ${indicatorTextColor}`}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${indicatorColor}`}
            />
            <span>{fmtDaysSince(member.daysSinceLast)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-border text-text-secondary text-sm font-medium rounded-md hover:bg-surface-3 transition-colors border-none cursor-pointer font-[inherit] disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleExport}
            disabled={exporting}
            title="수강생 리포트를 DOCX로 내보내기"
          >
            {exporting ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-spin"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" x2="12" y1="2" y2="15" />
              </svg>
            )}
            리포트
          </button>
          <button
            className="flex-shrink-0 px-4 py-2 bg-accent text-white text-sm font-medium rounded-md hover:opacity-90 transition-opacity border-none cursor-pointer font-[inherit]"
            onClick={onStartRecording}
          >
            + 새 상담 녹음
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mb-1">
            총 상담
          </div>
          <div className="text-2xl font-bold text-text font-mono">
            {member.counselingCount}
          </div>
          <div className="text-xs text-text-dim mt-0.5">건</div>
        </div>

        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mb-1">
            마지막 상담
          </div>
          <div className={`text-sm font-semibold mt-1 ${indicatorTextColor}`}>
            {member.lastCounselingAt ? fmtDate(member.lastCounselingAt) : "─"}
          </div>
        </div>

        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mb-1">
            상태
          </div>
          <div className={`text-sm font-semibold mt-1 ${indicatorTextColor}`}>
            {member.indicator === "recent"
              ? "관리 중"
              : member.indicator === "warning"
                ? "주의 필요"
                : "상담 필요"}
          </div>
        </div>
      </div>

      {/* 상담 기록 목록 */}
      <div>
        <div className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mb-3">
          상담 기록 ({memberRecords.length})
        </div>

        {memberRecords.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-surface-3 border border-border flex items-center justify-center">
              <span className="text-xl">🎙</span>
            </div>
            <p className="text-sm text-text-dim">아직 상담 기록이 없습니다</p>
            <button
              className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-md hover:opacity-90 transition-opacity border-none cursor-pointer font-[inherit]"
              onClick={onStartRecording}
            >
              첫 상담 녹음 시작
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {memberRecords.map((rec) => (
              <button
                key={rec.id}
                className="w-full flex items-start gap-3 p-4 bg-surface-2 border border-border rounded-lg text-left hover:border-border-light transition-colors cursor-pointer font-[inherit]"
                onClick={() => onSelectRecord(rec.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-text truncate">
                      {rec.title}
                    </span>
                    <span
                      className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                        rec.status === "ready"
                          ? "bg-green-dim text-green"
                          : "bg-amber-dim text-amber"
                      }`}
                    >
                      {rec.status === "ready" ? "완료" : "처리 중"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-dim">
                    <span>{fmtDate(rec.createdAt)}</span>
                    {rec.durationMs > 0 && (
                      <>
                        <span>·</span>
                        <span>{fmtDuration(rec.durationMs)}</span>
                      </>
                    )}
                    {rec.type && (
                      <>
                        <span>·</span>
                        <span>{rec.type}</span>
                      </>
                    )}
                  </div>
                  {rec.aiSummary && rec.status === "ready" && (
                    <p className="mt-1.5 text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {rec.aiSummary}
                    </p>
                  )}
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="flex-shrink-0 text-text-dim mt-0.5"
                >
                  <path
                    d="M5 3l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
