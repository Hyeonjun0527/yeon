"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Loader2, Trash2, X } from "lucide-react";
import {
  IMPORT_ANALYSIS_CHECKLIST,
  getImportAnalysisChecklistStep,
} from "@/lib/import-analysis-progress";
import { getSpacePeriodInputError } from "@/lib/space-period";
import type { ChatMessage, ImportHook, ImportPreview } from "../types";

function formatImportErrorMessage(error: string) {
  if (error.includes("AI 응답 구조 검증 실패")) {
    return "AI가 만든 초안 형식이 올바르지 않아 이번 요청을 반영하지 못했습니다. 다시 요청하거나 초안을 지운 뒤 다시 시작해 주세요.";
  }

  if (error.includes("Invalid input") || error.includes("invalid_type")) {
    return "가져오기 초안 형식이 예상과 달라 처리하지 못했습니다. 다시 분석하거나 파일 형식을 확인해 주세요.";
  }

  return error;
}

function ErrorRecoveryNotice({
  error,
  onRetry,
  retryLabel,
  onDiscard,
  disabled,
}: {
  error: string;
  onRetry: () => void;
  retryLabel: string;
  onDiscard?: (() => Promise<void>) | (() => void);
  disabled: boolean;
}) {
  return (
    <div className="mb-3 rounded-[6px] bg-[rgba(239,68,68,0.1)] px-3 py-2.5 text-red">
      <p className="m-0 text-[13px] leading-relaxed">
        {formatImportErrorMessage(error)}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          className="rounded-[6px] border border-red/30 bg-transparent px-2.5 py-1 text-[12px] font-medium text-red transition-colors hover:bg-red/10 disabled:opacity-50"
          onClick={onRetry}
          type="button"
          disabled={disabled}
        >
          {retryLabel}
        </button>
        {onDiscard ? (
          <button
            className="rounded-[6px] border border-border bg-transparent px-2.5 py-1 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-3 hover:text-text disabled:opacity-50"
            onClick={() => {
              void onDiscard();
            }}
            type="button"
            disabled={disabled}
          >
            초안 지우기
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface ImportRightPanelProps {
  hook: ImportHook;
  onClose: () => void;
}

export function ImportRightPanel({ hook, onClose }: ImportRightPanelProps) {
  const {
    selectedFile,
    recoveryNotice,
    draftPolicyText,
    analyzing,
    processingStage,
    processingProgress,
    processingMessage,
    streamingText,
    editablePreview,
    importing,
    importResult,
    error,
    chatMessages,
    analyzeSelectedFile,
    updatePreview,
    confirmImport,
    discardDraft,
  } = hook;
  const [isDraftPolicyNoticeDismissed, setIsDraftPolicyNoticeDismissed] =
    useState(false);

  useEffect(() => {
    setIsDraftPolicyNoticeDismissed(false);
  }, [draftPolicyText, selectedFile?.id]);

  const visibleDraftPolicyText = isDraftPolicyNoticeDismissed
    ? null
    : draftPolicyText;

  /* 파일 미선택 */
  if (!selectedFile) {
    return (
      <div className="h-full min-h-0 flex flex-col">
        <div className="flex items-center justify-center h-full min-h-[200px] text-text-dim text-sm text-center">
          파일을 선택하면 여기에 미리보기가 나타납니다
        </div>
      </div>
    );
  }

  /* 완료 */
  if (importResult) {
    return (
      <div className="h-full min-h-0 flex flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="flex items-center gap-2.5 p-5 rounded-lg bg-[rgba(34,197,94,0.1)] text-green text-sm font-medium">
            <Check size={20} />
            <span>
              {importResult.spaces}개 스페이스, {importResult.members}명
              수강생이 생성되었습니다.
            </span>
          </div>
          <div className="text-center">
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-[13px] font-medium border-0 bg-accent text-white cursor-pointer transition-opacity duration-150 hover:opacity-90"
              onClick={onClose}
              type="button"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 가져오는 중 */
  if (importing) {
    return (
      <div className="h-full min-h-0 flex flex-col">
        <div className="flex flex-1 items-center justify-center gap-2.5 p-6 mb-3 bg-accent-dim rounded-lg text-accent text-[13px] font-medium">
          <Loader2 size={24} className="animate-spin" />
          <span>가져오는 중...</span>
        </div>
      </div>
    );
  }

  /* 분석 결과 미리보기 */
  if (editablePreview) {
    return (
      <div className="h-full min-h-0 flex flex-col">
        {recoveryNotice && (
          <div className="px-3 py-2.5 rounded-[6px] bg-accent-dim text-accent text-[13px] mb-3">
            {recoveryNotice}
          </div>
        )}
        <DraftPolicyNotice
          text={visibleDraftPolicyText}
          onDismiss={() => setIsDraftPolicyNoticeDismissed(true)}
        />
        {error && (
          <ErrorRecoveryNotice
            error={error}
            onRetry={() => {
              void analyzeSelectedFile();
            }}
            retryLabel="다시 분석"
            onDiscard={discardDraft}
            disabled={analyzing || importing}
          />
        )}
        <PreviewEditor
          preview={editablePreview}
          onUpdate={updatePreview}
          onConfirm={confirmImport}
          onCancel={() => hook.selectFileForPreview(selectedFile)}
          onRefine={hook.refineWithInstruction}
          analyzing={analyzing}
          streamingText={streamingText}
          importing={importing}
          chatMessages={chatMessages}
        />
      </div>
    );
  }

  /* 초기 분석 중 */
  if (analyzing) {
    return (
      <div className="h-full min-h-0 flex flex-col">
        {recoveryNotice && (
          <div className="px-3 py-2.5 rounded-[6px] bg-accent-dim text-accent text-[13px] mb-3">
            {recoveryNotice}
          </div>
        )}
        <DraftPolicyNotice
          text={visibleDraftPolicyText}
          onDismiss={() => setIsDraftPolicyNoticeDismissed(true)}
        />
        <ImportAnalysisStatusCard
          message={
            processingMessage ?? streamingText ?? "파일을 분석하고 있습니다..."
          }
          processingStage={processingStage}
          processingProgress={processingProgress}
        />
      </div>
    );
  }

  /* 파일 선택됨, 분석 전 */
  return (
    <div className="h-full min-h-0 flex flex-col">
      {recoveryNotice && (
        <div className="px-3 py-2.5 rounded-[6px] bg-accent-dim text-accent text-[13px] mb-3">
          {recoveryNotice}
        </div>
      )}
      <DraftPolicyNotice
        text={visibleDraftPolicyText}
        onDismiss={() => setIsDraftPolicyNoticeDismissed(true)}
      />
      {error && (
        <ErrorRecoveryNotice
          error={error}
          onRetry={() => {
            void analyzeSelectedFile();
          }}
          retryLabel="다시 분석"
          onDiscard={discardDraft}
          disabled={analyzing || importing}
        />
      )}
      <div className="flex flex-1 flex-col items-center justify-center text-center px-5 py-10">
        <p className="text-sm font-semibold text-text mb-1">
          {selectedFile.name}
        </p>
        <p className="text-xs text-text-dim mb-5">
          AI가 파일에서 수강생 정보를 분석합니다.
        </p>
        <button
          className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-semibold border-0 bg-accent text-white cursor-pointer transition-opacity duration-150 hover:opacity-90"
          onClick={analyzeSelectedFile}
          type="button"
        >
          분석 시작
        </button>
      </div>
    </div>
  );
}

function ImportAnalysisStatusCard({
  message,
  processingStage,
  processingProgress,
}: {
  message: string;
  processingStage: ImportHook["processingStage"];
  processingProgress: number;
}) {
  const activeStep = getImportAnalysisChecklistStep(
    processingStage ?? undefined,
  );

  return (
    <div className="mb-3 rounded-lg border border-accent-border bg-accent-dim p-5">
      <div className="flex items-center gap-2.5 text-accent text-[13px] font-medium mb-4">
        <Loader2 size={20} className="animate-spin" />
        <span>{message}</span>
      </div>
      <div className="mb-4 text-[12px] text-text-dim">
        진행률 {processingProgress}%
      </div>
      <div className="grid gap-2">
        {IMPORT_ANALYSIS_CHECKLIST.map((step, index) => {
          const state =
            index < activeStep
              ? "done"
              : index == activeStep
                ? "current"
                : "todo";
          return (
            <div
              key={step.label}
              className="flex items-center gap-2 text-[13px]"
            >
              <span
                className={
                  state === "done"
                    ? "text-accent"
                    : state === "current"
                      ? "text-accent"
                      : "text-text-dim"
                }
              >
                {state === "done" ? "✓" : state === "current" ? "⟳" : "○"}
              </span>
              <span
                className={
                  state === "todo" ? "text-text-dim" : "text-text-secondary"
                }
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DraftPolicyNotice({
  text,
  onDismiss,
}: {
  text?: string | null;
  onDismiss: () => void;
}) {
  if (!text) return null;

  return (
    <div className="mb-3 flex items-start justify-between gap-3 rounded-[10px] border border-accent-border/40 bg-[rgba(99,102,241,0.08)] px-3 py-2.5 text-[12px] text-text-secondary">
      <p className="m-0 flex-1 leading-relaxed">{text}</p>
      <button
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-transparent bg-transparent text-text-dim transition-[background,color,border-color] duration-[120ms] hover:border-border hover:bg-[var(--surface3)] hover:text-text"
        onClick={onDismiss}
        type="button"
        aria-label="임시 초안 안내 닫기"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ── Preview Editor ── */

const IMPORT_REVIEW_SPLIT_STORAGE_KEY = "yeon:import-review:split-ratio";
const IMPORT_REVIEW_DEFAULT_RATIO = 0.64;
const IMPORT_REVIEW_MIN_RATIO = 0.34;
const IMPORT_REVIEW_MAX_RATIO = 0.8;
const IMPORT_REVIEW_MIN_ANALYSIS_HEIGHT = 220;
const IMPORT_REVIEW_MIN_CHAT_HEIGHT = 160;
const IMPORT_REVIEW_RESIZER_HEIGHT = 20;

interface PreviewEditorProps {
  preview: ImportPreview;
  onUpdate: (p: ImportPreview) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onRefine: (instruction: string) => Promise<void>;
  analyzing: boolean;
  streamingText: string | null;
  importing: boolean;
  chatMessages: ChatMessage[];
}

type PreviewColumn =
  | { key: "name" | "email" | "phone" | "status"; label: string; kind: "core" }
  | { key: string; label: string; kind: "custom" };

const CORE_COLUMNS: PreviewColumn[] = [
  { key: "name", label: "이름", kind: "core" },
  { key: "email", label: "이메일", kind: "core" },
  { key: "phone", label: "전화번호", kind: "core" },
  { key: "status", label: "상태", kind: "core" },
];

function collectPreviewColumns(preview: ImportPreview): PreviewColumn[] {
  const customColumnKeys: string[] = [];
  const seen = new Set<string>();
  const hasMeaningfulValue = new Set<string>();

  for (const cohort of preview.cohorts) {
    for (const student of cohort.students) {
      for (const [key, rawValue] of Object.entries(
        student.customFields ?? {},
      )) {
        if (!key.trim() || seen.has(key)) continue;
        seen.add(key);
        customColumnKeys.push(key);

        if (typeof rawValue === "string" && rawValue.trim()) {
          hasMeaningfulValue.add(key);
        }
      }

      for (const [key, rawValue] of Object.entries(
        student.customFields ?? {},
      )) {
        if (typeof rawValue === "string" && rawValue.trim()) {
          hasMeaningfulValue.add(key);
        }
      }
    }
  }

  return [
    ...CORE_COLUMNS,
    ...customColumnKeys
      .filter((key) => hasMeaningfulValue.has(key))
      .map((key) => ({
        key,
        label: key,
        kind: "custom" as const,
      })),
  ];
}

function hasMeaningfulCustomValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasMeaningfulCustomValueElsewhere(
  preview: ImportPreview,
  targetKey: string,
  skippedPosition?: { ci: number; si: number },
) {
  for (let ci = 0; ci < preview.cohorts.length; ci += 1) {
    const cohort = preview.cohorts[ci];
    if (!cohort) continue;

    for (let si = 0; si < cohort.students.length; si += 1) {
      if (
        skippedPosition &&
        skippedPosition.ci === ci &&
        skippedPosition.si === si
      ) {
        continue;
      }

      const student = cohort.students[si];
      if (!student) continue;

      if (hasMeaningfulCustomValue(student.customFields?.[targetKey])) {
        return true;
      }
    }
  }

  return false;
}

function removeCustomColumns(
  columns: PreviewColumn[],
  targetKeys: Set<string>,
): PreviewColumn[] {
  if (targetKeys.size === 0) return columns;

  const nextColumns = columns.filter(
    (column) => column.kind === "core" || !targetKeys.has(column.key),
  );

  return nextColumns.length === columns.length ? columns : nextColumns;
}

function getAnalysisColumnTrackWidth(
  preview: ImportPreview,
  column: PreviewColumn,
) {
  const longestLength = preview.cohorts.reduce((maxLength, cohort) => {
    return cohort.students.reduce((studentMaxLength, student) => {
      const rawValue =
        column.kind === "custom"
          ? (student.customFields?.[column.key] ?? "")
          : (student[column.key] ?? "");

      const nextLength = String(rawValue ?? "").trim().length;
      return Math.max(studentMaxLength, nextLength);
    }, maxLength);
  }, column.label.trim().length);

  const estimatedWidth = longestLength * 8 + 52;
  const minWidth = column.key === "name" ? 160 : 132;
  const maxWidth = column.key === "name" ? 280 : 240;
  const clampedWidth = Math.min(maxWidth, Math.max(minWidth, estimatedWidth));

  return `${clampedWidth}px`;
}

type AnalysisVirtualRow =
  | {
      key: string;
      type: "cohort";
      ci: number;
      cohort: ImportPreview["cohorts"][number];
    }
  | {
      key: string;
      type: "columns";
      ci: number;
    }
  | {
      key: string;
      type: "student";
      ci: number;
      si: number;
      student: ImportPreview["cohorts"][number]["students"][number];
    };

const ANALYSIS_ROW_HEIGHTS = {
  cohort: 82,
  columns: 38,
  student: 42,
} as const;

function buildAnalysisVirtualRows(
  preview: ImportPreview,
): AnalysisVirtualRow[] {
  const rows: AnalysisVirtualRow[] = [];

  preview.cohorts.forEach((cohort, ci) => {
    rows.push({
      key: `cohort-${ci}`,
      type: "cohort",
      ci,
      cohort,
    });
    rows.push({
      key: `columns-${ci}`,
      type: "columns",
      ci,
    });

    cohort.students.forEach((student, si) => {
      rows.push({
        key: `student-${ci}-${si}`,
        type: "student",
        ci,
        si,
        student,
      });
    });
  });

  return rows;
}

const PreviewAnalysisContent = memo(
  function PreviewAnalysisContent({
    preview,
    totalStudents,
    columns,
    columnSignature: _columnSignature,
    onUpdateCohortName,
    onUpdateCohortPeriod,
    onUpdateStudent,
    onRemoveStudent,
  }: {
    preview: ImportPreview;
    totalStudents: number;
    columns: PreviewColumn[];
    columnSignature: string;
    onUpdateCohortName: (ci: number, name: string) => void;
    onUpdateCohortPeriod: (
      ci: number,
      field: "startDate" | "endDate",
      value: string,
    ) => void;
    onUpdateStudent: (
      ci: number,
      si: number,
      field: PreviewColumn,
      value: string,
    ) => void;
    onRemoveStudent: (ci: number, si: number) => void;
  }) {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const virtualRows = useMemo(
      () => buildAnalysisVirtualRows(preview),
      [preview],
    );
    const gridTemplateColumns = useMemo(() => {
      const columnTracks = columns.map((column) =>
        getAnalysisColumnTrackWidth(preview, column),
      );

      return [...columnTracks, "48px"].join(" ");
    }, [columns, preview]);
    const rowVirtualizer = useVirtualizer({
      count: virtualRows.length,
      getScrollElement: () => scrollRef.current,
      estimateSize: (index) => {
        const row = virtualRows[index];
        if (!row) return ANALYSIS_ROW_HEIGHTS.student;

        return ANALYSIS_ROW_HEIGHTS[row.type];
      },
      overscan: 12,
    });

    return (
      <>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-dim">
              분석 결과
            </p>
            <p className="m-0 mt-1 text-[13px] text-text-secondary">
              {preview.cohorts.length}개 스페이스, {totalStudents}명 수강생
            </p>
          </div>
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text-dim">
            표 편집 가능
          </span>
        </div>

        <div
          ref={scrollRef}
          className="scrollbar-subtle min-h-0 flex-1 overflow-auto px-4 py-4"
        >
          <div className="min-w-max" style={{ minWidth: "100%" }}>
            <div
              className="relative"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = virtualRows[virtualRow.index];
                if (!row) return null;

                return (
                  <PreviewAnalysisVirtualRow
                    key={virtualRow.key}
                    row={row}
                    columns={columns}
                    gridTemplateColumns={gridTemplateColumns}
                    onUpdateCohortName={onUpdateCohortName}
                    onUpdateCohortPeriod={onUpdateCohortPeriod}
                    onUpdateStudent={onUpdateStudent}
                    onRemoveStudent={onRemoveStudent}
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      height: `${virtualRow.size}px`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  },
  (prev, next) =>
    prev.preview === next.preview &&
    prev.totalStudents === next.totalStudents &&
    prev.columnSignature === next.columnSignature &&
    prev.onUpdateCohortName === next.onUpdateCohortName &&
    prev.onUpdateCohortPeriod === next.onUpdateCohortPeriod &&
    prev.onUpdateStudent === next.onUpdateStudent &&
    prev.onRemoveStudent === next.onRemoveStudent,
);

const PreviewAnalysisVirtualRow = memo(function PreviewAnalysisVirtualRow({
  row,
  columns,
  gridTemplateColumns,
  onUpdateCohortName,
  onUpdateCohortPeriod,
  onUpdateStudent,
  onRemoveStudent,
  style,
}: {
  row: AnalysisVirtualRow;
  columns: PreviewColumn[];
  gridTemplateColumns: string;
  onUpdateCohortName: (ci: number, name: string) => void;
  onUpdateCohortPeriod: (
    ci: number,
    field: "startDate" | "endDate",
    value: string,
  ) => void;
  onUpdateStudent: (
    ci: number,
    si: number,
    field: PreviewColumn,
    value: string,
  ) => void;
  onRemoveStudent: (ci: number, si: number) => void;
  style: {
    transform: string;
    height: string;
  };
}) {
  if (row.type === "cohort") {
    const periodError = getSpacePeriodInputError(
      row.cohort.startDate ?? null,
      row.cohort.endDate ?? null,
    );

    return (
      <div
        className="absolute left-0 top-0 w-full rounded-t-2xl border-x border-t border-border bg-surface/65 px-3 pt-2"
        style={style}
      >
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] items-start gap-2">
          <div className="min-w-0">
            <input
              className="block w-full rounded-[10px] border border-border bg-[var(--surface2,var(--surface))] px-3 py-1.5 text-sm font-semibold text-text focus:border-accent focus:outline-none"
              value={row.cohort.name}
              onChange={(event) =>
                onUpdateCohortName(row.ci, event.target.value)
              }
              placeholder="스페이스명"
            />
          </div>

          <div className="min-w-0">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="min-w-0 rounded-[10px] border border-border bg-[var(--surface2,var(--surface))] px-3 py-1.5 text-[13px] text-text outline-none transition-colors focus:border-accent"
                value={row.cohort.startDate ?? ""}
                onChange={(event) =>
                  onUpdateCohortPeriod(row.ci, "startDate", event.target.value)
                }
                aria-label={`${row.cohort.name || "스페이스"} 시작일`}
              />
              <input
                type="date"
                className="min-w-0 rounded-[10px] border border-border bg-[var(--surface2,var(--surface))] px-3 py-1.5 text-[13px] text-text outline-none transition-colors focus:border-accent"
                value={row.cohort.endDate ?? ""}
                onChange={(event) =>
                  onUpdateCohortPeriod(row.ci, "endDate", event.target.value)
                }
                aria-label={`${row.cohort.name || "스페이스"} 종료일`}
              />
            </div>
            <p
              className={`m-0 min-h-4 px-1 pt-1 text-[10px] leading-tight ${
                periodError ? "text-red" : "text-text-dim"
              }`}
            >
              {periodError ?? ""}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (row.type === "columns") {
    return (
      <div
        className="absolute left-0 top-0 grid min-w-full border-x border-b border-border bg-surface/65"
        style={{ ...style, gridTemplateColumns, width: "max-content" }}
      >
        {columns.map((column) => (
          <div
            key={`${row.key}-${column.key}`}
            className="overflow-hidden text-ellipsis whitespace-nowrap border-r border-border px-2 py-1.5 text-[11px] font-semibold text-text-dim last:border-r-0"
            title={column.label}
          >
            {column.label}
          </div>
        ))}
        <div className="px-2 py-1.5" />
      </div>
    );
  }

  return (
    <div
      className="absolute left-0 top-0 grid min-w-full border-x border-b border-border bg-surface/65 even:bg-surface"
      style={{ ...style, gridTemplateColumns, width: "max-content" }}
    >
      {columns.map((column) => {
        const value =
          column.kind === "custom"
            ? (row.student.customFields?.[column.key] ?? "")
            : (row.student[column.key] ?? "");

        return (
          <div
            key={`${row.key}-${column.key}`}
            className="min-w-0 border-r border-border px-2 py-1 last:border-r-0"
          >
            <input
              className="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded bg-transparent px-1.5 py-1 text-[13px] text-text outline-none focus:border-accent focus:bg-[var(--surface2,var(--surface))]"
              value={value ?? ""}
              onChange={(event) =>
                onUpdateStudent(row.ci, row.si, column, event.target.value)
              }
              placeholder="-"
              title={value ?? ""}
            />
          </div>
        );
      })}
      <div className="px-2 py-1">
        <button
          className="flex h-6 w-6 items-center justify-center rounded bg-transparent text-text-dim transition-[background,color] duration-[120ms] hover:bg-[rgba(239,68,68,0.1)] hover:text-red"
          onClick={() => onRemoveStudent(row.ci, row.si)}
          type="button"
          title="삭제"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
});

function PreviewEditor({
  preview,
  onUpdate,
  onConfirm,
  onCancel,
  onRefine,
  analyzing,
  streamingText,
  importing,
  chatMessages,
}: PreviewEditorProps) {
  const [columns, setColumns] = useState<PreviewColumn[]>(() =>
    collectPreviewColumns(preview),
  );
  const columnSignature = useMemo(
    () => columns.map((column) => `${column.kind}:${column.key}`).join("|"),
    [columns],
  );
  const previewRef = useRef(preview);
  const columnsRef = useRef(columns);
  const pendingColumnsRef = useRef<PreviewColumn[] | null>(null);
  const reviewWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const resizeStateRef = useRef<{
    startClientY: number;
    startRatio: number;
    availableHeight: number;
  } | null>(null);
  const [analysisPanelRatio, setAnalysisPanelRatio] = useState(
    IMPORT_REVIEW_DEFAULT_RATIO,
  );
  const [isResizingPanels, setIsResizingPanels] = useState(false);

  useEffect(() => {
    previewRef.current = preview;
    const nextColumns =
      pendingColumnsRef.current ?? collectPreviewColumns(preview);
    pendingColumnsRef.current = null;
    columnsRef.current = nextColumns;
    setColumns(nextColumns);
  }, [preview]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const clampAnalysisPanelRatio = useCallback((ratio: number) => {
    const containerHeight =
      reviewWorkspaceRef.current?.getBoundingClientRect().height ?? 0;
    const availableHeight = Math.max(
      containerHeight - IMPORT_REVIEW_RESIZER_HEIGHT,
      1,
    );

    if (!containerHeight) {
      return Math.min(
        IMPORT_REVIEW_MAX_RATIO,
        Math.max(IMPORT_REVIEW_MIN_RATIO, ratio),
      );
    }

    const minRatio = Math.max(
      IMPORT_REVIEW_MIN_RATIO,
      IMPORT_REVIEW_MIN_ANALYSIS_HEIGHT / availableHeight,
    );
    const maxRatio = Math.min(
      IMPORT_REVIEW_MAX_RATIO,
      1 - IMPORT_REVIEW_MIN_CHAT_HEIGHT / availableHeight,
    );

    if (minRatio >= maxRatio) {
      return Math.min(
        IMPORT_REVIEW_MAX_RATIO,
        Math.max(IMPORT_REVIEW_MIN_RATIO, ratio),
      );
    }

    return Math.min(maxRatio, Math.max(minRatio, ratio));
  }, []);

  useEffect(() => {
    const savedRatio = window.localStorage.getItem(
      IMPORT_REVIEW_SPLIT_STORAGE_KEY,
    );

    if (!savedRatio) return;

    const parsed = Number(savedRatio);
    if (!Number.isFinite(parsed)) return;

    setAnalysisPanelRatio(clampAnalysisPanelRatio(parsed));
  }, [clampAnalysisPanelRatio]);

  useEffect(() => {
    window.localStorage.setItem(
      IMPORT_REVIEW_SPLIT_STORAGE_KEY,
      analysisPanelRatio.toFixed(4),
    );
  }, [analysisPanelRatio]);

  useEffect(() => {
    if (!isResizingPanels) return;

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;

      const deltaY = event.clientY - resizeState.startClientY;
      const nextRatio =
        resizeState.startRatio + deltaY / resizeState.availableHeight;
      setAnalysisPanelRatio(clampAnalysisPanelRatio(nextRatio));
    };

    const stopResizing = () => {
      resizeStateRef.current = null;
      setIsResizingPanels(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };
  }, [clampAnalysisPanelRatio, isResizingPanels]);

  const updateCohortName = useCallback(
    (ci: number, name: string) => {
      const cohorts = previewRef.current.cohorts.map((c, i) =>
        i === ci ? { ...c, name } : c,
      );
      pendingColumnsRef.current = columnsRef.current;
      onUpdate({ cohorts });
    },
    [onUpdate],
  );

  const updateCohortPeriod = useCallback(
    (ci: number, field: "startDate" | "endDate", value: string) => {
      const nextValue = value || null;
      const cohorts = previewRef.current.cohorts.map((cohort, index) =>
        index === ci ? { ...cohort, [field]: nextValue } : cohort,
      );
      pendingColumnsRef.current = columnsRef.current;
      onUpdate({ cohorts });
    },
    [onUpdate],
  );

  const updateStudent = useCallback(
    (ci: number, si: number, field: PreviewColumn, value: string) => {
      let nextColumns = columnsRef.current;

      if (
        field.kind === "custom" &&
        !hasMeaningfulCustomValue(value) &&
        !hasMeaningfulCustomValueElsewhere(previewRef.current, field.key, {
          ci,
          si,
        })
      ) {
        nextColumns = removeCustomColumns(nextColumns, new Set([field.key]));
      }

      pendingColumnsRef.current = nextColumns;

      const cohorts = previewRef.current.cohorts.map((c, i) => {
        if (i !== ci) return c;
        const students = c.students.map((s, j) => {
          if (j !== si) return s;
          if (field.kind === "custom") {
            return {
              ...s,
              customFields: {
                ...(s.customFields ?? {}),
                [field.key]: value || null,
              },
            };
          }

          return {
            ...s,
            [field.key]: field.key === "name" ? value : value || null,
          };
        });
        return { ...c, students };
      });
      onUpdate({ cohorts });
    },
    [onUpdate],
  );

  const removeStudent = useCallback(
    (ci: number, si: number) => {
      const removedStudent = previewRef.current.cohorts[ci]?.students[si];
      let nextColumns = columnsRef.current;

      if (removedStudent?.customFields) {
        const removableKeys = new Set(
          Object.entries(removedStudent.customFields)
            .filter(([, fieldValue]) => hasMeaningfulCustomValue(fieldValue))
            .map(([fieldKey]) => fieldKey)
            .filter(
              (fieldKey) =>
                !hasMeaningfulCustomValueElsewhere(
                  previewRef.current,
                  fieldKey,
                  {
                    ci,
                    si,
                  },
                ),
            ),
        );

        nextColumns = removeCustomColumns(nextColumns, removableKeys);
      }

      pendingColumnsRef.current = nextColumns;

      const cohorts = previewRef.current.cohorts.map((c, i) => {
        if (i !== ci) return c;
        return { ...c, students: c.students.filter((_, j) => j !== si) };
      });
      onUpdate({ cohorts });
    },
    [onUpdate],
  );

  const totalStudents = preview.cohorts.reduce(
    (sum, c) => sum + c.students.length,
    0,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={reviewWorkspaceRef} className="flex min-h-0 flex-1 flex-col">
        <section
          className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface-2/35"
          style={{
            flexBasis: `${(analysisPanelRatio * 100).toFixed(2)}%`,
          }}
        >
          <PreviewAnalysisContent
            preview={preview}
            totalStudents={totalStudents}
            columns={columns}
            columnSignature={columnSignature}
            onUpdateCohortName={updateCohortName}
            onUpdateCohortPeriod={updateCohortPeriod}
            onUpdateStudent={updateStudent}
            onRemoveStudent={removeStudent}
          />
        </section>

        <button
          type="button"
          className="group flex h-5 shrink-0 cursor-row-resize items-center justify-center bg-transparent"
          aria-label="분석 결과와 AI 요청 영역 높이 조절"
          onPointerDown={(event) => {
            const containerHeight =
              reviewWorkspaceRef.current?.getBoundingClientRect().height ?? 0;
            const availableHeight = Math.max(
              containerHeight - IMPORT_REVIEW_RESIZER_HEIGHT,
              1,
            );

            resizeStateRef.current = {
              startClientY: event.clientY,
              startRatio: analysisPanelRatio,
              availableHeight,
            };
            setIsResizingPanels(true);
          }}
        >
          <span className="h-1.5 w-14 rounded-full bg-border transition-colors group-hover:bg-accent-border" />
        </button>

        <section className="flex min-h-[160px] flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface/70">
          <div className="border-b border-border px-4 py-3">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-dim">
              AI 수정 요청
            </p>
            <p className="m-0 mt-1 text-[13px] text-text-secondary">
              분석 결과를 바탕으로 수정 요청을 보내고 응답을 바로 반영합니다.
            </p>
          </div>

          <div className="min-h-0 flex-1">
            <ChatSection
              messages={chatMessages}
              analyzing={analyzing}
              streamingText={streamingText}
              onSend={onRefine}
            />
          </div>
        </section>
      </div>

      {/* 확인/취소 버튼 */}
      <div className="flex justify-end gap-2 pt-3 pb-1 border-t border-border flex-shrink-0">
        <button
          className="px-4 py-2 rounded-[6px] text-[13px] font-medium border border-border bg-transparent text-text-secondary cursor-pointer hover:bg-[var(--surface3)]"
          onClick={onCancel}
          type="button"
          disabled={importing}
        >
          취소
        </button>
        <button
          className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-[13px] font-medium border-0 bg-accent text-white cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onConfirm}
          type="button"
          disabled={importing || analyzing || totalStudents === 0}
        >
          {importing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              가져오는 중...
            </>
          ) : (
            `${totalStudents}명 가져오기`
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Chat Section ── */

function SparkleIcon() {
  return (
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
      <path
        d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function ChatSection({
  messages,
  analyzing,
  streamingText,
  onSend,
}: {
  messages: ChatMessage[];
  analyzing: boolean;
  streamingText: string | null;
  onSend: (text: string) => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || analyzing) return;
    setInput("");
    await onSend(trimmed);
  }, [analyzing, input, onSend]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatMessageList
        messages={messages}
        analyzing={analyzing}
        streamingText={streamingText}
      />
      <ChatComposer
        input={input}
        analyzing={analyzing}
        onChange={setInput}
        onSend={handleSend}
      />
    </div>
  );
}

const ChatMessageList = memo(function ChatMessageList({
  messages,
  analyzing,
  streamingText,
}: {
  messages: ChatMessage[];
  analyzing: boolean;
  streamingText: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, analyzing]);

  const isEmpty = messages.length === 0 && !analyzing;

  return (
    <div
      ref={scrollRef}
      className="scrollbar-subtle flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3"
    >
      {isEmpty && (
        <div className="flex flex-col items-center justify-center h-full gap-1.5 text-center">
          <SparkleIcon />
          <p className="text-[12px] text-text-dim m-0 leading-relaxed">
            AI에게 수정을 요청해 보세요
            <br />
            <span className="text-text-dim opacity-70">
              예: 김민지 이름 김민제로 바꿔
            </span>
          </p>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
        >
          {msg.role === "ai" && (
            <div className="w-6 h-6 rounded-full bg-accent-dim flex items-center justify-center flex-shrink-0 mt-0.5 text-accent">
              <SparkleIcon />
            </div>
          )}
          <div
            className={`max-w-[80%] px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
              msg.role === "user"
                ? "bg-accent text-white rounded-tr-sm"
                : "bg-surface-3 text-text-secondary rounded-tl-sm"
            }`}
          >
            {msg.text}
          </div>
        </div>
      ))}

      {analyzing && (
        <div className="flex gap-2 flex-row">
          <div className="w-6 h-6 rounded-full bg-accent-dim flex items-center justify-center flex-shrink-0 mt-0.5 text-accent">
            <SparkleIcon />
          </div>
          <div className="px-3 py-2 rounded-xl rounded-tl-sm bg-surface-3 text-[12px] text-text-dim flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            <span>{streamingText ?? "처리 중..."}</span>
          </div>
        </div>
      )}
    </div>
  );
});

const ChatComposer = memo(function ChatComposer({
  input,
  analyzing,
  onChange,
  onSend,
}: {
  input: string;
  analyzing: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex items-end gap-2 px-3 py-2 border-t border-border">
      <textarea
        ref={textareaRef}
        className="flex-1 resize-none text-[12px] bg-surface-2 border border-border rounded-lg px-2.5 py-2 text-text outline-none leading-relaxed transition-[border-color] duration-150 focus:border-accent-border disabled:opacity-50 disabled:cursor-not-allowed font-[inherit]"
        rows={1}
        placeholder="수정 요청... (Enter로 전송)"
        value={input}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        disabled={analyzing}
        style={{ minHeight: 32, maxHeight: 80 }}
      />
      <button
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-white border-0 cursor-pointer flex-shrink-0 transition-opacity duration-150 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={onSend}
        disabled={!input.trim() || analyzing}
        type="button"
        title="전송"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
});
