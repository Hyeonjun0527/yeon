"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LifeOsDayDto } from "@yeon/api-contract/life-os";
import { LIFE_OS_API_PATHS } from "@yeon/api-contract/life-os";

import styles from "./life-os.module.css";
import {
  createEmptyLifeOsEntries,
  LIFE_OS_HOUR_BLOCKS,
  LIFE_OS_ROWS,
} from "./constants";
import type { LifeOsHourEntry } from "./types";
import { buildLifeOsReport, computeLifeOsDailyMetrics } from "./utils";

type LifeOsDraft = {
  localDate: string;
  timezone: string;
  mindset: string;
  backlogText: string;
  entries: LifeOsHourEntry[];
};

type LifeOsViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; draft: LifeOsDraft };

function getTodayLocalDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function toDraft(
  day?: LifeOsDayDto | null,
  localDate = getTodayLocalDate(),
): LifeOsDraft {
  return {
    localDate: day?.localDate ?? localDate,
    timezone: day?.timezone ?? "Asia/Seoul",
    mindset: day?.mindset ?? "",
    backlogText: day?.backlogText ?? "",
    entries: normalizeEntries(day?.entries ?? createEmptyLifeOsEntries()),
  };
}

function normalizeEntries(entries: LifeOsHourEntry[]) {
  const byHour = new Map(entries.map((entry) => [entry.hour, entry]));
  return createEmptyLifeOsEntries().map((emptyEntry) => ({
    ...emptyEntry,
    ...byHour.get(emptyEntry.hour),
  }));
}

async function fetchLifeOsDay(localDate: string) {
  const response = await fetch(LIFE_OS_API_PATHS.dayByDate(localDate));
  if (!response.ok) {
    throw new Error("Life OS 기록을 불러오지 못했습니다.");
  }
  const data = (await response.json()) as { day: LifeOsDayDto };
  return data.day;
}

async function saveLifeOsDay(draft: LifeOsDraft) {
  const response = await fetch(LIFE_OS_API_PATHS.dayByDate(draft.localDate), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!response.ok) {
    throw new Error("Life OS 기록을 저장하지 못했습니다.");
  }
  const data = (await response.json()) as { day: LifeOsDayDto };
  return data.day;
}

function toViewState(params: {
  isPending: boolean;
  error: Error | null;
  draft: LifeOsDraft;
}): LifeOsViewState {
  if (params.isPending) return { kind: "loading" };
  if (params.error) return { kind: "error", message: params.error.message };
  return { kind: "ready", draft: params.draft };
}

function getRowContent(row: (typeof LIFE_OS_ROWS)[number], hour: number) {
  if (row === "MINDSET") return hour === 0 ? "오늘의 기준" : "";
  if (row === "TIME") return `${hour}`;
  return null;
}

function DayBlock({
  side,
  draft,
  isDisabled,
  onEntryChange,
}: {
  side: "left" | "right";
  draft: LifeOsDraft;
  isDisabled: boolean;
  onEntryChange: (
    hour: number,
    field: "goalText" | "actionText",
    value: string,
  ) => void;
}) {
  return (
    <section className={styles.sheetBlock} aria-label={`${side} day block`}>
      {LIFE_OS_HOUR_BLOCKS.map((block) => (
        <div key={`${side}-${block.label}`}>
          <div className={styles.dayBand}>
            {draft.localDate} · {side === "left" ? "기록" : "다음 기록"} ·{" "}
            {block.label}
          </div>
          {LIFE_OS_ROWS.map((row) => (
            <div className={styles.row} key={`${side}-${block.label}-${row}`}>
              <div className={styles.rowLabel}>{row}</div>
              {block.hours.map((hour) => {
                const entry =
                  draft.entries[hour] ?? createEmptyLifeOsEntries()[hour]!;
                const readOnlyContent = getRowContent(row, hour);
                const field =
                  row === "GOAL"
                    ? "goalText"
                    : row === "ACTION"
                      ? "actionText"
                      : null;

                return (
                  <div
                    className={styles.cell}
                    key={`${side}-${block.label}-${row}-${hour}`}
                  >
                    {field ? (
                      <textarea
                        aria-label={`${draft.localDate} ${hour}시 ${row}`}
                        className={styles.cellInput}
                        disabled={isDisabled}
                        value={entry[field]}
                        onChange={(event) =>
                          onEntryChange(hour, field, event.target.value)
                        }
                        placeholder={row === "GOAL" ? "계획" : "실행"}
                      />
                    ) : (
                      <span className={styles.readOnlyCell}>
                        {readOnlyContent}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

export function LifeOsScreen() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(getTodayLocalDate);
  const [draft, setDraft] = useState(() => toDraft(null, selectedDate));

  const dayQuery = useQuery({
    queryKey: ["life-os", "day", selectedDate],
    queryFn: () => fetchLifeOsDay(selectedDate),
  });
  const saveMutation = useMutation({
    mutationFn: saveLifeOsDay,
    onSuccess(day) {
      queryClient.setQueryData(["life-os", "day", day.localDate], day);
      setDraft(toDraft(day, day.localDate));
    },
  });

  useEffect(() => {
    if (dayQuery.data) {
      setDraft(toDraft(dayQuery.data, selectedDate));
      return;
    }
    setDraft(toDraft(null, selectedDate));
  }, [dayQuery.data, selectedDate]);

  const viewState = toViewState({
    isPending: dayQuery.isPending,
    error: dayQuery.error,
    draft,
  });
  const report = useMemo(() => {
    const metrics = computeLifeOsDailyMetrics({
      localDate: draft.localDate,
      entries: draft.entries,
    });
    return buildLifeOsReport({
      periodType: "daily",
      periodStart: draft.localDate,
      periodEnd: draft.localDate,
      metrics,
    });
  }, [draft]);
  const isEntryDisabled =
    viewState.kind === "loading" || saveMutation.isPending;
  const isSaveDisabled = isEntryDisabled;
  const saveButtonLabel = saveMutation.isPending ? "저장 중" : "저장";
  const saveStatusText = saveMutation.isError
    ? saveMutation.error.message
    : saveMutation.isSuccess
      ? "저장되었습니다."
      : null;

  function handleEntryChange(
    hour: number,
    field: "goalText" | "actionText",
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      entries: current.entries.map((entry) =>
        entry.hour === hour ? { ...entry, [field]: value } : entry,
      ),
    }));
  }

  function handleSave() {
    saveMutation.mutate(draft);
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Life OS</h1>
            <p className={styles.subtitle}>
              스프레드시트처럼 시간별 GOAL/ACTION을 직접 기록하고, 과계획 신호를
              리포트로 전환합니다.
            </p>
          </div>
          <div className={styles.headerActions}>
            <input
              className={styles.dateInput}
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            <button
              className={styles.saveButton}
              type="button"
              disabled={isSaveDisabled}
              onClick={handleSave}
            >
              {saveButtonLabel}
            </button>
          </div>
        </header>

        {viewState.kind === "loading" ? (
          <p className={styles.statusText}>기록을 불러오는 중입니다.</p>
        ) : null}
        {viewState.kind === "error" ? (
          <p className={styles.statusText}>{viewState.message}</p>
        ) : null}
        {saveStatusText ? (
          <p className={styles.statusText}>{saveStatusText}</p>
        ) : null}

        <div className={styles.canvasWrap}>
          <div className={styles.canvas}>
            <DayBlock
              side="left"
              draft={draft}
              isDisabled={isEntryDisabled}
              onEntryChange={handleEntryChange}
            />

            <section
              className={styles.memoZone}
              aria-label="central memo backlog"
            >
              <label className={styles.memoCard}>
                <strong>MINDSET</strong>
                <textarea
                  className={styles.memoInput}
                  disabled={isEntryDisabled}
                  value={draft.mindset}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      mindset: event.target.value,
                    }))
                  }
                  placeholder="오늘 판단 기준, 버릴 것, 지킬 것"
                />
              </label>
              <label className={styles.memoCard}>
                <strong>Memo / Backlog</strong>
                <textarea
                  className={styles.memoInput}
                  disabled={isEntryDisabled}
                  value={draft.backlogText}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      backlogText: event.target.value,
                    }))
                  }
                  placeholder="중앙 여백처럼 아직 시간표에 넣지 않을 생각을 보관"
                />
              </label>
              <div className={styles.reportPanel}>
                <div className={styles.reportCard}>
                  <strong>Daily report</strong>
                  <p>
                    planned: {report.metrics.plannedHours}h · matched:{" "}
                    {report.metrics.matchedHours}h · overplanned:{" "}
                    {report.metrics.overplannedHours}h
                  </p>
                </div>
                <div className={styles.reportCard}>
                  <strong>Pattern evidence</strong>
                  <p>
                    {report.patterns[0]?.evidence ??
                      "아직 반복 패턴을 판단할 기록이 부족합니다."}
                  </p>
                </div>
                <div className={styles.reportCard}>
                  <strong>Next adjustment</strong>
                  <p>
                    {report.recommendations[0]?.suggestedAdjustment ??
                      "GOAL/ACTION을 최소 4칸 이상 기록하세요."}
                  </p>
                </div>
              </div>
            </section>

            <DayBlock
              side="right"
              draft={draft}
              isDisabled={isEntryDisabled}
              onEntryChange={handleEntryChange}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
