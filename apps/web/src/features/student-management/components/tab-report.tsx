"use client";

import { RISK_LEVEL_META } from "../constants";
import type { ActivityLog, Member, RiskLevel } from "../types";

interface TabReportProps {
  member: Member;
  activityLogs: ActivityLog[];
  logsLoading: boolean;
  logsError: string | null;
}

function calcRate(total: number, done: number): number {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

export function TabReport({
  member,
  activityLogs,
  logsLoading,
  logsError,
}: TabReportProps) {
  /* ── 출결 통계 ── */
  const attendanceLogs = activityLogs.filter((l) => l.type === "attendance");
  const attendancePresent = attendanceLogs.filter(
    (l) => l.status === "present",
  ).length;
  const attendanceAbsent = attendanceLogs.filter(
    (l) => l.status === "absent",
  ).length;
  const attendanceLate = attendanceLogs.filter(
    (l) => l.status === "late",
  ).length;
  const attendanceTotal = attendancePresent + attendanceAbsent + attendanceLate;
  const attendanceRate = calcRate(attendanceTotal, attendancePresent);

  /* ── 과제 통계 ── */
  const assignmentLogs = activityLogs.filter((l) => l.type === "assignment");
  const assignmentDone = assignmentLogs.filter(
    (l) => l.status === "submitted",
  ).length;
  const assignmentTotal = assignmentLogs.length;
  const assignmentRate = calcRate(assignmentTotal, assignmentDone);

  /* ── 위험도 뱃지 ── */
  const riskLevel = member.initialRiskLevel as RiskLevel | null | undefined;
  const riskMeta = riskLevel ? RISK_LEVEL_META[riskLevel] : null;

  return (
    <div>
      {logsLoading && (
        <div style={{ color: "var(--text-dim)", fontSize: 14, marginBottom: 16 }}>
          활동 로그 불러오는 중...
        </div>
      )}
      {logsError && !logsLoading && (
        <div
          className="text-red text-[13px] mb-4 py-2 px-3 bg-red-dim rounded-sm"
        >
          활동 로그를 불러오지 못했습니다. 통계가 표시되지 않을 수 있습니다.
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))] gap-3 mb-6">
        <div className="p-4 bg-surface-2 border border-border rounded">
          <div className="text-xs text-text-dim mb-1">출석률</div>
          <div className="text-[22px] font-bold text-text font-mono tracking-[-0.5px]">{attendanceRate}%</div>
          {attendanceTotal > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
              {attendancePresent}회 출석 / {attendanceTotal}회 전체
            </div>
          )}
          {attendanceTotal === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
              데이터 없음
            </div>
          )}
        </div>

        <div className="p-4 bg-surface-2 border border-border rounded">
          <div className="text-xs text-text-dim mb-1">과제 완료율</div>
          <div className="text-[22px] font-bold text-text font-mono tracking-[-0.5px]">{assignmentRate}%</div>
          {assignmentTotal > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
              {assignmentDone}건 완료 / {assignmentTotal}건 전체
            </div>
          )}
          {assignmentTotal === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
              데이터 없음
            </div>
          )}
        </div>

        <div className="p-4 bg-surface-2 border border-border rounded">
          <div className="text-xs text-text-dim mb-1">위험도</div>
          <div style={{ marginTop: 8 }}>
            {riskMeta ? (
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: riskMeta.color,
                  background: riskMeta.bgColor,
                  border: `1px solid ${riskMeta.borderColor}`,
                }}
              >
                {riskMeta.label}
              </span>
            ) : (
              <span style={{ fontSize: 14, color: "var(--text-dim)" }}>
                미설정
              </span>
            )}
          </div>
        </div>

      </div>

      {/* 출결 상세 */}
      {attendanceTotal > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="text-base font-semibold text-text mb-3">출결 상세</div>
          <div className="flex flex-col gap-2">
            {attendanceLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 py-3 px-4 bg-surface-2 border border-border rounded-lg text-sm transition-[border-color] duration-150 hover:border-border-light"
              >
                <span className="text-[11px] text-text-dim whitespace-nowrap font-mono">
                  {new Date(log.recordedAt).toLocaleDateString("ko-KR")}
                </span>
                <span className="flex-1 font-medium text-text-secondary">출결</span>
                <span
                  className="text-xs py-0.5 px-2 rounded-[10px]"
                  style={{
                    color:
                      log.status === "present"
                        ? "#34d399"
                        : log.status === "late"
                          ? "#fbbf24"
                          : "#f87171",
                    background:
                      log.status === "present"
                        ? "rgba(52,211,153,0.1)"
                        : log.status === "late"
                          ? "rgba(251,191,36,0.1)"
                          : "rgba(248,113,113,0.08)",
                  }}
                >
                  {log.status === "present"
                    ? "출석"
                    : log.status === "late"
                      ? "지각"
                      : "결석"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 과제 상세 */}
      {assignmentTotal > 0 && (
        <div>
          <div className="text-base font-semibold text-text mb-3">과제 상세</div>
          <div className="flex flex-col gap-2">
            {assignmentLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 py-3 px-4 bg-surface-2 border border-border rounded-lg text-sm transition-[border-color] duration-150 hover:border-border-light"
              >
                <span className="text-[11px] text-text-dim whitespace-nowrap font-mono">
                  {new Date(log.recordedAt).toLocaleDateString("ko-KR")}
                </span>
                <span className="flex-1 font-medium text-text-secondary">과제</span>
                <span
                  className="text-xs py-0.5 px-2 rounded-[10px]"
                  style={{
                    color:
                      log.status === "submitted" ? "#34d399" : "#f87171",
                    background:
                      log.status === "submitted"
                        ? "rgba(52,211,153,0.1)"
                        : "rgba(248,113,113,0.08)",
                  }}
                >
                  {log.status === "submitted" ? "제출" : "미제출"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
