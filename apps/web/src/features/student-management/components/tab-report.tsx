"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  CounselingRecordDetail,
  CounselingRecordListItem,
} from "@yeon/api-contract/counseling-records";
import { bulkCounselingRecordDetailsResponseSchema } from "@yeon/api-contract/counseling-records";
import {
  Download,
  FileText,
  Loader2,
  RefreshCcw,
  Settings2,
} from "lucide-react";

import { exportStudentReportDocx } from "../report-docx";
import {
  buildStudentReportDocument,
  createDefaultStudentReportSettings,
  type StudentReportRecordScope,
} from "../report-builder";
import type { Member, Memo } from "../types";
import { fmtDate } from "../utils";

interface TabReportProps {
  member: Member;
  memos?: Memo[];
  memosLoading?: boolean;
  totalMemoCount?: number;
}

const RECORD_SCOPE_OPTIONS: Array<{
  value: StudentReportRecordScope;
  label: string;
}> = [
  { value: 3, label: "최근 3건" },
  { value: 5, label: "최근 5건" },
  { value: "all", label: "전체" },
];

export function TabReport({
  member,
  memos = [],
  memosLoading = false,
  totalMemoCount = memos.length,
}: TabReportProps) {
  const [settings, setSettings] = useState(() =>
    createDefaultStudentReportSettings(member.name),
  );
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const canLoadRecords = !!member.spaceId;

  const recordsQuery = useQuery({
    queryKey: ["member-report-records", member.spaceId, member.id],
    enabled: canLoadRecords,
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/spaces/${member.spaceId}/members/${member.id}/counseling-records`,
      );
      if (!res.ok) throw new Error("상담 기록을 불러오지 못했습니다.");
      return res.json() as Promise<{ records: CounselingRecordListItem[] }>;
    },
  });

  const allRecords = useMemo(() => {
    if (!recordsQuery.data) {
      return [] as CounselingRecordListItem[];
    }

    return recordsQuery.data.records;
  }, [recordsQuery.data]);

  const selectedRecords = useMemo(() => {
    const sorted = [...allRecords].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return settings.recordScope === "all"
      ? sorted
      : sorted.slice(0, settings.recordScope);
  }, [allRecords, settings.recordScope]);

  const detailsQuery = useQuery({
    queryKey: [
      "member-report-record-details",
      member.id,
      selectedRecords.map((record) => record.id).join(","),
    ],
    enabled: selectedRecords.length > 0,
    queryFn: async () => {
      const res = await fetch("/api/v1/counseling-records/details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recordIds: selectedRecords.map((record) => record.id),
        }),
      });

      if (!res.ok) {
        throw new Error("상담 상세를 불러오지 못했습니다.");
      }

      const parsed = bulkCounselingRecordDetailsResponseSchema.parse(
        await res.json(),
      );

      return parsed.records.reduce<Record<string, CounselingRecordDetail>>(
        (acc, item) => {
          acc[item.id] = item;
          return acc;
        },
        {},
      );
    },
  });

  const reportDocument = useMemo(
    () =>
      buildStudentReportDocument({
        member,
        records: allRecords,
        detailsById: detailsQuery.data,
        memos,
        memoCount: totalMemoCount,
        settings,
      }),
    [allRecords, member, detailsQuery.data, memos, settings, totalMemoCount],
  );

  const latestRecord = selectedRecords[0] ?? null;
  const analysisReadyCount = detailsQuery.data
    ? Object.values(detailsQuery.data).filter(
        (record) => !!record.analysisResult,
      ).length
    : 0;
  const recordsLoading = canLoadRecords && recordsQuery.isPending;
  const recordsErrorMessage =
    recordsQuery.error instanceof Error
      ? recordsQuery.error.message
      : recordsQuery.error
        ? "리포트 데이터를 불러오지 못했습니다."
        : null;

  async function handleDownloadDocx() {
    try {
      await exportStudentReportDocx(reportDocument);
      setSaveToast("워드 리포트를 다운로드했습니다.");
    } catch {
      setSaveToast("워드 리포트 생성에 실패했습니다.");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section className="rounded-xl border border-border bg-surface-2 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 size={15} className="text-text-dim" />
          <h3 className="m-0 text-[14px] font-semibold text-text">
            리포트 구성 설정
          </h3>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-[11px] font-semibold text-text-dim uppercase tracking-[0.06em]">
              리포트 제목
            </span>
            <input
              value={settings.title}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-text outline-none focus:border-accent-border"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-[11px] font-semibold text-text-dim uppercase tracking-[0.06em]">
              작성 메모
            </span>
            <textarea
              value={settings.focusNote}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  focusNote: event.target.value,
                }))
              }
              placeholder="예: 학부모 공유용으로 불안 요소보다 개선 흐름을 더 강조해줘"
              className="min-h-[96px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-text outline-none focus:border-accent-border resize-y"
            />
          </label>

          <div className="grid gap-2">
            <span className="text-[11px] font-semibold text-text-dim uppercase tracking-[0.06em]">
              반영 범위
            </span>
            <div className="flex flex-wrap gap-2">
              {RECORD_SCOPE_OPTIONS.map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      recordScope: option.value,
                    }))
                  }
                  className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                    settings.recordScope === option.value
                      ? "border-accent-border bg-accent-dim text-accent"
                      : "border-border bg-surface text-text-secondary"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <span className="text-[11px] font-semibold text-text-dim uppercase tracking-[0.06em]">
              포함 콘텐츠
            </span>
            <label className="flex items-center gap-2 text-[13px] text-text-secondary">
              <input
                type="checkbox"
                checked={settings.includeKeywords}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    includeKeywords: event.target.checked,
                  }))
                }
              />
              핵심 키워드
            </label>
            <label className="flex items-center gap-2 text-[13px] text-text-secondary">
              <input
                type="checkbox"
                checked={settings.includeIssues}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    includeIssues: event.target.checked,
                  }))
                }
              />
              주요 이슈
            </label>
            <label className="flex items-center gap-2 text-[13px] text-text-secondary">
              <input
                type="checkbox"
                checked={settings.includeActions}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    includeActions: event.target.checked,
                  }))
                }
              />
              후속 액션
            </label>
            <label className="flex items-center gap-2 text-[13px] text-text-secondary">
              <input
                type="checkbox"
                checked={settings.includeRecordPreviews}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    includeRecordPreviews: event.target.checked,
                  }))
                }
              />
              상담 기록 요약
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <div className="text-[11px] text-text-dim mb-1">
              연결된 상담 기록
            </div>
            <div className="text-[24px] font-semibold text-text">
              {allRecords.length}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <div className="text-[11px] text-text-dim mb-1">AI 분석 반영</div>
            <div className="text-[24px] font-semibold text-text">
              {analysisReadyCount}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <div className="text-[11px] text-text-dim mb-1">최근 상담일</div>
            <div className="text-[18px] font-semibold text-text">
              {latestRecord ? fmtDate(latestRecord.createdAt) : "-"}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <div className="text-[11px] text-text-dim mb-1">운영 메모</div>
            <div className="text-[24px] font-semibold text-text">
              {memosLoading ? "..." : totalMemoCount}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="m-0 text-[15px] font-semibold text-text">
                리포트 프리뷰
              </h3>
              <p className="m-0 mt-1 text-[12px] text-text-dim">
                어떤 콘텐츠를 넣을지 먼저 조정하고, 그대로 워드 문서로
                내려받습니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void recordsQuery.refetch();
                  void detailsQuery.refetch();
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[12px] text-text-secondary"
              >
                <RefreshCcw size={13} />
                새로고침
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadDocx()}
                className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-[12px] font-semibold text-white"
              >
                <Download size={13} />
                Word 다운로드
              </button>
            </div>
          </div>

          {!canLoadRecords ? (
            <div className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-[13px] text-text-dim">
              레거시 수강생 상세에서는 아직 상담 기록 기반 리포트를 만들 수
              없습니다.
            </div>
          ) : recordsLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-10 text-[13px] text-text-dim">
              <Loader2 size={15} className="animate-spin" /> 상담 기록 불러오는
              중...
            </div>
          ) : recordsErrorMessage ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-6 text-[13px] text-red-300">
              {recordsErrorMessage}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-lg border border-border bg-surface px-4 py-4">
                <div className="flex items-center gap-2 text-text-secondary">
                  <FileText size={14} />
                  <span className="text-[14px] font-semibold text-text">
                    {reportDocument.title}
                  </span>
                </div>
                <p className="mt-3 text-[13px] leading-6 text-text-secondary">
                  {reportDocument.summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {reportDocument.meta.map((item) => (
                    <span
                      key={item.label}
                      className="rounded-full border border-border bg-surface-2 px-3 py-1 text-[12px] text-text-dim"
                    >
                      {item.label}: {item.value}
                    </span>
                  ))}
                </div>
              </div>

              {reportDocument.sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-lg border border-border bg-surface px-4 py-4"
                >
                  <h4 className="m-0 text-[14px] font-semibold text-text">
                    {section.title}
                  </h4>
                  <ul className="mt-3 grid gap-2 pl-5 text-[13px] leading-6 text-text-secondary">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {saveToast && (
            <p className="mt-3 text-[12px] text-text-dim">{saveToast}</p>
          )}
        </div>
      </section>
    </div>
  );
}
