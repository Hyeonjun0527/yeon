"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CounselingRecordDetail } from "@yeon/api-contract/counseling-records";
import { bulkCounselingRecordDetailsResponseSchema } from "@yeon/api-contract/counseling-records";
import { Download, FileText, Loader2, RefreshCcw } from "lucide-react";

import { exportStudentReportDocx } from "../report-docx";
import {
  buildStudentReportDocument,
  createDefaultStudentReportSettings,
  type StudentReportRecordScope,
} from "../report-builder";
import { useMemberCounselingRecords } from "../hooks/use-member-counseling-records";
import type { Member } from "../types";
import { fmtDate } from "../utils";

interface TabReportProps {
  member: Member;
}

const RECORD_SCOPE_OPTIONS: Array<{
  value: StudentReportRecordScope;
  label: string;
}> = [
  { value: 3, label: "최근 상담 3건" },
  { value: 5, label: "최근 상담 5건" },
  { value: "all", label: "전체 상담 기록" },
];

export function TabReport({ member }: TabReportProps) {
  const [settings, setSettings] = useState(() =>
    createDefaultStudentReportSettings(member.name),
  );
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const canLoadRecords = !!member.spaceId;

  const recordsQuery = useMemberCounselingRecords(member.spaceId, member.id);

  const allRecords = useMemo(() => {
    if (!recordsQuery.data) {
      return [];
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
        settings,
      }),
    [allRecords, member, detailsQuery.data, settings],
  );

  const latestRecord = selectedRecords[0] ?? null;
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
    <section className="overflow-hidden rounded-2xl border border-border bg-surface-2/80">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-text-secondary">
            <FileText size={15} />
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
              리포트
            </p>
          </div>
          <h3 className="m-0 mt-2 text-[20px] font-semibold tracking-[-0.03em] text-text">
            {member.name} 상담 리포트
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void recordsQuery.refetch();
              void detailsQuery.refetch();
            }}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-[12px] text-text-secondary transition-colors hover:border-border-light hover:bg-surface-3 hover:text-text"
          >
            <RefreshCcw size={13} />
            새로고침
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadDocx()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            <Download size={13} />
            Word 다운로드
          </button>
        </div>
      </div>

      {!canLoadRecords ? (
        <div className="border-t border-border px-5 py-12 text-center text-[13px] text-text-dim">
          레거시 수강생 상세에서는 아직 상담 기록 기반 리포트를 만들 수
          없습니다.
        </div>
      ) : recordsLoading ? (
        <div className="flex items-center justify-center gap-2 border-t border-border px-5 py-12 text-[13px] text-text-dim">
          <Loader2 size={15} className="animate-spin" /> 상담 기록 불러오는
          중...
        </div>
      ) : recordsErrorMessage ? (
        <div className="border-t border-border px-5 py-6 text-[13px] text-red-300">
          {recordsErrorMessage}
        </div>
      ) : (
        <>
          <div className="border-t border-border px-5 py-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <span className="text-[12px] font-medium text-text-secondary">
                    리포트에 포함할 상담 기록
                  </span>
                  <p className="m-0 text-[12px] leading-5 text-text-dim">
                    여러 상담 기록을 최신 상담일 순으로 묶어 반영합니다.
                  </p>
                </div>
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
                      className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        settings.recordScope === option.value
                          ? "border-accent-border bg-accent-dim text-accent"
                          : "border-border bg-surface-2 text-text-secondary hover:border-border-light hover:text-text"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 lg:border-l lg:border-border lg:pl-4">
                <div>
                  <p className="m-0 text-[11px] text-text-dim">검토 상담</p>
                  <p className="m-0 mt-1 text-[20px] font-semibold text-text">
                    {selectedRecords.length}건
                  </p>
                </div>
                <div>
                  <p className="m-0 text-[11px] text-text-dim">최근 상담일</p>
                  <p className="m-0 mt-1 text-[14px] font-semibold text-text">
                    {latestRecord ? fmtDate(latestRecord.createdAt) : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border px-5 py-5">
            <p className="m-0 text-[13px] leading-6 text-text-secondary">
              {reportDocument.summary}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-[12px] text-text-dim">
                검토 상담 {selectedRecords.length}건
              </span>
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-[12px] text-text-dim">
                최근 상담일{" "}
                {latestRecord ? fmtDate(latestRecord.createdAt) : "-"}
              </span>
            </div>
          </div>

          <div className="divide-y divide-border">
            {reportDocument.sections.map((section) => (
              <div key={section.id} className="px-5 py-4">
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
        </>
      )}

      {saveToast && (
        <p className="border-t border-border px-5 py-3 text-[12px] text-text-dim">
          {saveToast}
        </p>
      )}
    </section>
  );
}
