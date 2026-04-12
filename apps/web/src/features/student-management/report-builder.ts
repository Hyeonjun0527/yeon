import type {
  AnalysisResult,
  CounselingRecordDetail,
  CounselingRecordListItem,
} from "@yeon/api-contract/counseling-records";

import type { Member, Memo } from "./types";

export type StudentReportRecordScope = 3 | 5 | "all";

export interface StudentReportSettings {
  title: string;
  focusNote: string;
  recordScope: StudentReportRecordScope;
  includeKeywords: boolean;
  includeIssues: boolean;
  includeActions: boolean;
  includeRecordPreviews: boolean;
}

export interface StudentReportBuildInput {
  member: Member;
  records: CounselingRecordListItem[];
  detailsById?: Record<string, CounselingRecordDetail>;
  memos?: Memo[];
  memoCount?: number;
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

function collectKeywords(analyses: AnalysisResult[]) {
  return unique(analyses.flatMap((item) => item.keywords)).slice(0, 8);
}

function collectIssues(analyses: AnalysisResult[]) {
  return unique(
    analyses.flatMap((item) =>
      item.issues.map((issue) => `${issue.title}: ${issue.detail}`),
    ),
  ).slice(0, 6);
}

function collectActions(analyses: AnalysisResult[]) {
  return unique(
    analyses.flatMap((item) => [
      ...item.actions.mentor,
      ...item.actions.member,
      ...item.actions.nextSession,
    ]),
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

function collectRecentMemos(memos: Memo[]) {
  return memos.slice(0, 3).map((memo) => {
    const authorLabel = memo.author ? ` · ${memo.author}` : "";
    return `${fmtDate(memo.date)}${authorLabel} — ${memo.text}`;
  });
}

function buildSummary(
  member: Member,
  selectedRecords: CounselingRecordListItem[],
  analyses: AnalysisResult[],
  settings: StudentReportSettings,
) {
  const latestRecord = selectedRecords[0];
  const latestSummary = latestRecord
    ? analyses[0]?.summary ||
      latestRecord.preview ||
      "최근 상담 요약 정보가 아직 없습니다."
    : "연결된 상담 기록이 아직 없습니다.";

  if (settings.focusNote.trim()) {
    return `${member.name} 수강생의 최근 상담 ${selectedRecords.length}건을 기준으로, ${settings.focusNote.trim()} 관점에서 정리한 리포트입니다. ${latestSummary}`;
  }

  return `${member.name} 수강생의 최근 상담 ${selectedRecords.length}건을 바탕으로 현재 흐름과 후속 액션을 정리한 리포트입니다. ${latestSummary}`;
}

export function buildStudentReportDocument({
  member,
  records,
  detailsById,
  memos = [],
  memoCount = memos.length,
  settings,
  generatedAt = new Date(),
}: StudentReportBuildInput): StudentReportDocument {
  const selectedRecords = pickRecords(records, settings.recordScope);
  const analyses = collectAnalyses(selectedRecords, detailsById);

  const sections: StudentReportSection[] = [];

  if (settings.focusNote.trim()) {
    sections.push({
      id: "focus-note",
      title: "작성 메모",
      bullets: [settings.focusNote.trim()],
    });
  }

  if (memos.length > 0) {
    sections.push({
      id: "memos",
      title: "최근 운영 메모",
      bullets: collectRecentMemos(memos),
    });
  }

  if (settings.includeKeywords) {
    const keywords = collectKeywords(analyses);
    sections.push({
      id: "keywords",
      title: "핵심 키워드",
      bullets:
        keywords.length > 0 ? keywords : ["추출된 키워드가 아직 없습니다."],
    });
  }

  if (settings.includeIssues) {
    const issues = collectIssues(analyses);
    sections.push({
      id: "issues",
      title: "주요 이슈",
      bullets:
        issues.length > 0
          ? issues
          : ["현재까지 구조화된 주요 이슈가 없습니다."],
    });
  }

  if (settings.includeActions) {
    const actions = collectActions(analyses);
    sections.push({
      id: "actions",
      title: "후속 액션",
      bullets: actions.length > 0 ? actions : ["추천 액션이 아직 없습니다."],
    });
  }

  if (settings.includeRecordPreviews) {
    const previews = collectRecordPreviews(selectedRecords, detailsById);
    sections.push({
      id: "records",
      title: "상담 기록 요약",
      bullets:
        previews.length > 0 ? previews : ["연결된 상담 기록이 없습니다."],
    });
  }

  return {
    title: settings.title,
    summary: buildSummary(member, selectedRecords, analyses, settings),
    meta: [
      { label: "생성 시각", value: fmtDateTime(generatedAt) },
      { label: "수강생", value: member.name },
      { label: "상태", value: member.status },
      { label: "리포트 반영 상담", value: `${selectedRecords.length}건` },
      { label: "운영 메모", value: `${memoCount}건` },
      {
        label: "최근 상담일",
        value: selectedRecords[0] ? fmtDate(selectedRecords[0].createdAt) : "-",
      },
      { label: "AI 분석 반영", value: `${analyses.length}건` },
    ],
    sections,
  };
}

export function createDefaultStudentReportSettings(
  memberName: string,
): StudentReportSettings {
  return {
    title: `${memberName} 상담 리포트`,
    focusNote: "",
    recordScope: 3,
    includeKeywords: false,
    includeIssues: true,
    includeActions: true,
    includeRecordPreviews: false,
  };
}
