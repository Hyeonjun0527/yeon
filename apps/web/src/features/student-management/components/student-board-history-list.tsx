"use client";

import type {
  StudentAssignmentStatus,
  StudentAttendanceStatus,
  StudentBoardHistoryItem,
  StudentBoardHistoryPeriod,
  StudentBoardSource,
} from "@yeon/api-contract";

const PERIOD_OPTIONS: Array<{
  value: StudentBoardHistoryPeriod;
  label: string;
}> = [
  { value: "space", label: "진행기간" },
  { value: "7d", label: "7일" },
  { value: "30d", label: "30일" },
  { value: "365d", label: "1년" },
];

function getAttendanceLabel(status: StudentAttendanceStatus) {
  switch (status) {
    case "present":
      return "출석";
    case "absent":
      return "결석";
    default:
      return "미정";
  }
}

function getAssignmentLabel(status: StudentAssignmentStatus) {
  switch (status) {
    case "done":
      return "완료";
    case "not_done":
      return "미완료";
    default:
      return "미정";
  }
}

function getSourceLabel(source: StudentBoardSource) {
  switch (source) {
    case "manual":
      return "수동";
    case "public_qr":
      return "QR";
    case "public_location":
      return "위치";
  }
}

function getStatusChipClass(
  status: StudentAttendanceStatus | StudentAssignmentStatus,
) {
  if (status === "present" || status === "done") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "absent" || status === "not_done") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  }

  return "border-border bg-surface text-text-dim";
}

function formatHistoryDate(historyDate: string) {
  return new Date(`${historyDate}T00:00:00+09:00`).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatOccurredAt(value: string) {
  return new Date(value).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function groupHistoryByDate(history: StudentBoardHistoryItem[]) {
  const grouped = new Map<string, StudentBoardHistoryItem[]>();

  for (const item of history) {
    const list = grouped.get(item.historyDate);
    if (list) {
      list.push(item);
      continue;
    }

    grouped.set(item.historyDate, [item]);
  }

  return Array.from(grouped.entries()).map(([historyDate, items]) => ({
    historyDate,
    items,
    presentCount: items.filter((item) => item.attendanceStatus === "present")
      .length,
    assignmentDoneCount: items.filter(
      (item) => item.assignmentStatus === "done",
    ).length,
  }));
}

interface StudentBoardHistoryListProps {
  title?: string;
  description?: string;
  period: StudentBoardHistoryPeriod;
  history: StudentBoardHistoryItem[];
  onPeriodChange: (period: StudentBoardHistoryPeriod) => void;
  loading?: boolean;
  error?: string | null;
  emptyMessage: string;
  showMemberName?: boolean;
}

export function StudentBoardHistoryList({
  title,
  description,
  period,
  history,
  onPeriodChange,
  loading = false,
  error = null,
  emptyMessage,
  showMemberName = true,
}: StudentBoardHistoryListProps) {
  const groups = groupHistoryByDate(history);
  const hasHeaderCopy = !!title || !!description;

  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-3 sm:p-4">
      <div
        className={`border-b border-border pb-3 ${
          hasHeaderCopy
            ? "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
            : "flex justify-end"
        }`}
      >
        {hasHeaderCopy ? (
          <div>
            {title ? (
              <h4 className="text-sm font-semibold text-text">{title}</h4>
            ) : null}
            {description ? (
              <p className="mt-1 text-[11px] text-text-dim">{description}</p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                option.value === period
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border bg-surface text-text-secondary hover:border-border-light hover:text-text"
              }`}
              onClick={() => onPeriodChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="px-1 py-5 text-sm text-text-secondary">
          이력을 불러오는 중...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="px-1 py-5 text-sm text-red-300">{error}</div>
      ) : null}

      {!loading && !error && groups.length === 0 ? (
        <div className="px-1 py-5 text-sm text-text-secondary">
          {emptyMessage}
        </div>
      ) : null}

      {!loading && !error && groups.length > 0 ? (
        <div className="space-y-3 pt-3">
          {groups.map((group) => (
            <div
              key={group.historyDate}
              className="overflow-hidden rounded-xl border border-border bg-surface"
            >
              <div className="flex flex-col gap-1 border-b border-border bg-white/[0.02] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[12px] font-semibold text-text">
                  {formatHistoryDate(group.historyDate)}
                </div>
                <div className="text-[11px] text-text-dim">
                  {showMemberName
                    ? `${group.items.length}명 기록`
                    : `${group.items.length}건 기록`}{" "}
                  · 출석 {group.presentCount} · 과제 완료{" "}
                  {group.assignmentDoneCount}
                </div>
              </div>

              <div className="hidden xl:block">
                <div
                  className={`grid gap-3 border-b border-border bg-surface-2 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-text-dim ${
                    showMemberName
                      ? "grid-cols-[minmax(0,1.2fr)_74px_74px_minmax(0,1fr)_96px_64px]"
                      : "grid-cols-[74px_74px_minmax(0,1fr)_96px_64px]"
                  }`}
                >
                  {showMemberName ? <span>수강생</span> : null}
                  <span>출석</span>
                  <span>과제</span>
                  <span>과제 링크</span>
                  <span>반영 시각</span>
                  <span>방식</span>
                </div>

                <div className="divide-y divide-border">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className={`grid items-center gap-3 px-3 py-2.5 text-[12px] ${
                        showMemberName
                          ? "grid-cols-[minmax(0,1.2fr)_74px_74px_minmax(0,1fr)_96px_64px]"
                          : "grid-cols-[74px_74px_minmax(0,1fr)_96px_64px]"
                      }`}
                    >
                      {showMemberName ? (
                        <div className="min-w-0 truncate font-medium text-text">
                          {item.memberName}
                        </div>
                      ) : null}
                      <span
                        className={`inline-flex w-fit rounded-full border px-2 py-1 text-[10px] font-medium ${getStatusChipClass(
                          item.attendanceStatus,
                        )}`}
                      >
                        {getAttendanceLabel(item.attendanceStatus)}
                      </span>
                      <span
                        className={`inline-flex w-fit rounded-full border px-2 py-1 text-[10px] font-medium ${getStatusChipClass(
                          item.assignmentStatus,
                        )}`}
                      >
                        {getAssignmentLabel(item.assignmentStatus)}
                      </span>
                      <div className="min-w-0 truncate text-text-secondary">
                        {item.assignmentLink ? (
                          <a
                            className="truncate text-accent underline-offset-2 hover:underline"
                            href={item.assignmentLink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.assignmentLink}
                          </a>
                        ) : (
                          <span className="text-text-dim">-</span>
                        )}
                      </div>
                      <div className="text-text-secondary">
                        {formatOccurredAt(item.occurredAt)}
                      </div>
                      <div className="text-text-secondary">
                        {getSourceLabel(item.source)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-border xl:hidden">
                {group.items.map((item) => (
                  <div key={item.id} className="space-y-2 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {showMemberName ? (
                          <div className="truncate text-[13px] font-semibold text-text">
                            {item.memberName}
                          </div>
                        ) : null}
                        <div className="mt-1 text-[11px] text-text-dim">
                          {formatOccurredAt(item.occurredAt)} ·{" "}
                          {getSourceLabel(item.source)}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-medium ${getStatusChipClass(
                            item.attendanceStatus,
                          )}`}
                        >
                          {getAttendanceLabel(item.attendanceStatus)}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-medium ${getStatusChipClass(
                            item.assignmentStatus,
                          )}`}
                        >
                          {getAssignmentLabel(item.assignmentStatus)}
                        </span>
                      </div>
                    </div>

                    {item.assignmentLink ? (
                      <a
                        className="block truncate text-[12px] text-accent underline-offset-2 hover:underline"
                        href={item.assignmentLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.assignmentLink}
                      </a>
                    ) : (
                      <div className="text-[12px] text-text-dim">
                        과제 링크 없음
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
