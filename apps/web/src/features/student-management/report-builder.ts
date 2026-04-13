import type {
  AnalysisResult,
  CounselingRecordDetail,
  CounselingRecordListItem,
} from "@yeon/api-contract/counseling-records";

import type { Member } from "./types";

export type StudentReportRecordScope = 3 | 5 | "all";

export interface StudentReportSettings {
  title: string;
  recordScope: StudentReportRecordScope;
}

export interface StudentReportBuildInput {
  member: Member;
  records: CounselingRecordListItem[];
  detailsById?: Record<string, CounselingRecordDetail>;
  settings: StudentReportSettings;
  generatedAt?: Date;
}

export interface StudentReportSection {
  id: string;
  title: string;
  bullets: string[];
}

export interface StudentReportDocument {
  title: string;
  summary: string;
  meta: Array<{ label: string; value: string }>;
  sections: StudentReportSection[];
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function fmtDateTime(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function pickRecords(
  records: CounselingRecordListItem[],
  scope: StudentReportRecordScope,
) {
  const sorted = [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return scope === "all" ? sorted : sorted.slice(0, scope);
}

function collectAnalyses(
  selectedRecords: CounselingRecordListItem[],
  detailsById?: Record<string, CounselingRecordDetail>,
) {
  return selectedRecords.flatMap((record) => {
    const analysis = detailsById?.[record.id]?.analysisResult;
    return analysis ? [analysis] : [];
  });
}

function collectIssues(analyses: AnalysisResult[]) {
  return unique(
    analyses.flatMap((item) =>
      item.issues.map((issue) => `${issue.title}: ${issue.detail}`),
    ),
  ).slice(0, 8);
}

function collectRecordPreviews(
  selectedRecords: CounselingRecordListItem[],
  detailsById?: Record<string, CounselingRecordDetail>,
) {
  return selectedRecords.map((record) => {
    const summary = detailsById?.[record.id]?.analysisResult?.summary?.trim();
    return `${fmtDate(record.createdAt)} · ${record.sessionTitle} — ${summary || record.preview || "요약 정보 없음"}`;
  });
}

function collectDenseSummaryBullets(
  selectedRecords: CounselingRecordListItem[],
  detailsById?: Record<string, CounselingRecordDetail>,
) {
  const analyses = collectAnalyses(selectedRecords, detailsById);
  const issues = collectIssues(analyses);
  const closings = unique(
    selectedRecords.map((record) => {
      const summary = detailsById?.[record.id]?.analysisResult?.summary?.trim();
      const closing = summary || record.preview.trim();

      if (!closing) {
        return "";
      }

      return `${record.sessionTitle}: ${closing}`;
    }),
  ).slice(0, 8);

  return unique([...issues, ...closings]).slice(0, 10);
}

function buildSummary(
  member: Member,
  selectedRecords: CounselingRecordListItem[],
  detailsById?: Record<string, CounselingRecordDetail>,
) {
  const latestRecord = selectedRecords[0];
  const latestSummary = latestRecord
    ? detailsById?.[latestRecord.id]?.analysisResult?.summary ||
      latestRecord.preview ||
      "최근 상담 요약 정보가 아직 없습니다."
    : "연결된 상담 기록이 아직 없습니다.";

  return `${member.name} 수강생의 상담 ${selectedRecords.length}건을 묶어, 상담에서 다룬 핵심 내용과 상담 마무리 흐름을 정리한 리포트입니다. ${latestSummary}`;
}

export function buildStudentReportDocument({
  member,
  records,
  detailsById,
  settings,
  generatedAt = new Date(),
}: StudentReportBuildInput): StudentReportDocument {
  const selectedRecords = pickRecords(records, settings.recordScope);
  const sections: StudentReportSection[] = [];
  const denseSummaryBullets = collectDenseSummaryBullets(
    selectedRecords,
    detailsById,
  );
  const previews = collectRecordPreviews(selectedRecords, detailsById);

  sections.push({
    id: "dense-summary",
    title: "핵심 요약",
    bullets:
      denseSummaryBullets.length > 0
        ? denseSummaryBullets
        : ["정리할 상담 핵심 요약이 아직 없습니다."],
  });

  sections.push({
    id: "records",
    title: "상담 기록 요약",
    bullets: previews.length > 0 ? previews : ["연결된 상담 기록이 없습니다."],
  });

  return {
    title: settings.title,
    summary: buildSummary(member, selectedRecords, detailsById),
    meta: [
      { label: "생성 시각", value: fmtDateTime(generatedAt) },
      { label: "수강생", value: member.name },
      { label: "상태", value: member.status },
      { label: "리포트 반영 상담", value: `${selectedRecords.length}건` },
      {
        label: "최근 상담일",
        value: selectedRecords[0] ? fmtDate(selectedRecords[0].createdAt) : "-",
      },
    ],
    sections,
  };
}

export function createDefaultStudentReportSettings(
  memberName: string,
): StudentReportSettings {
  return {
    title: `${memberName} 상담 리포트`,
    recordScope: 3,
  };
}
