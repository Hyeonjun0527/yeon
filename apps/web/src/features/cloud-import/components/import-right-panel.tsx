"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import {
  IMPORT_ANALYSIS_CHECKLIST,
  getImportAnalysisChecklistStep,
} from "@/lib/import-analysis-progress";
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
          text={draftPolicyText}
          onDiscard={discardDraft}
          disabled={analyzing || importing}
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
          text={draftPolicyText}
          onDiscard={discardDraft}
          disabled={analyzing || importing}
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
        text={draftPolicyText}
        onDiscard={discardDraft}
        disabled={analyzing || importing}
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
  onDiscard,
  disabled,
}: {
  text?: string | null;
  onDiscard?: (() => Promise<void>) | (() => void);
  disabled: boolean;
}) {
  if (!text || !onDiscard) return null;

  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-[6px] bg-[rgba(99,102,241,0.08)] border border-accent-border/40 text-[12px] text-text-secondary mb-3">
      <p className="m-0 leading-relaxed">{text}</p>
      <button
        className="shrink-0 px-2.5 py-1 rounded-[6px] border border-border bg-transparent text-text-secondary text-[12px] font-medium cursor-pointer transition-[background,color] duration-[120ms] hover:bg-[var(--surface3)] hover:text-text disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => {
          void onDiscard();
        }}
        type="button"
        disabled={disabled}
      >
        초안 지우기
      </button>
    </div>
  );
}

/* ── Preview Editor ── */

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
      {/* 스크롤 가능한 미리보기 테이블 */}
      <div className="scrollbar-subtle flex-1 overflow-y-auto py-3 min-h-0">
        <div className="text-[13px] text-text-dim mb-4">
          {preview.cohorts.length}개 스페이스, {totalStudents}명 수강생
        </div>

        {preview.cohorts.map((cohort, ci) => (
          <PreviewCohortSection
            key={ci}
            ci={ci}
            cohort={cohort}
            columns={columns}
            columnSignature={columnSignature}
            onUpdateCohortName={updateCohortName}
            onUpdateStudent={updateStudent}
            onRemoveStudent={removeStudent}
          />
        ))}
      </div>

      {/* 채팅 영역 — 고정 */}
      <div className="flex-shrink-0 border-t border-border">
        <ChatSection
          messages={chatMessages}
          analyzing={analyzing}
          streamingText={streamingText}
          onSend={onRefine}
        />
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

const PreviewCohortSection = memo(
  function PreviewCohortSection({
    ci,
    cohort,
    columns,
    columnSignature,
    onUpdateCohortName,
    onUpdateStudent,
    onRemoveStudent,
  }: {
    ci: number;
    cohort: ImportPreview["cohorts"][number];
    columns: PreviewColumn[];
    columnSignature: string;
    onUpdateCohortName: (ci: number, name: string) => void;
    onUpdateStudent: (
      ci: number,
      si: number,
      field: PreviewColumn,
      value: string,
    ) => void;
    onRemoveStudent: (ci: number, si: number) => void;
  }) {
    return (
      <div className="mb-5">
        <input
          className="text-sm font-semibold text-text bg-[var(--surface2,var(--surface))] border border-border rounded-[6px] px-3 py-2 w-full mb-2.5 focus:outline-none focus:border-accent"
          value={cohort.name}
          onChange={(e) => onUpdateCohortName(ci, e.target.value)}
          placeholder="스페이스명"
        />
        <div className="scrollbar-subtle overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-[13px]">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="text-left px-2 py-1.5 font-semibold text-text-dim text-[11px] border-b border-border whitespace-nowrap"
                  >
                    {column.label}
                  </th>
                ))}
                <th
                  className="text-left px-2 py-1.5 border-b border-border"
                  style={{ width: 40 }}
                />
              </tr>
            </thead>
            <tbody>
              {cohort.students.map((student, si) => (
                <PreviewStudentRow
                  key={si}
                  ci={ci}
                  si={si}
                  student={student}
                  columns={columns}
                  columnSignature={columnSignature}
                  onUpdateStudent={onUpdateStudent}
                  onRemoveStudent={onRemoveStudent}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.ci === next.ci &&
    prev.cohort === next.cohort &&
    prev.columnSignature === next.columnSignature,
);

const PreviewStudentRow = memo(
  function PreviewStudentRow({
    ci,
    si,
    student,
    columns,
    onUpdateStudent,
    onRemoveStudent,
  }: {
    ci: number;
    si: number;
    student: ImportPreview["cohorts"][number]["students"][number];
    columns: PreviewColumn[];
    columnSignature: string;
    onUpdateStudent: (
      ci: number,
      si: number,
      field: PreviewColumn,
      value: string,
    ) => void;
    onRemoveStudent: (ci: number, si: number) => void;
  }) {
    return (
      <tr>
        {columns.map((column) => {
          const value =
            column.kind === "custom"
              ? (student.customFields?.[column.key] ?? "")
              : (student[column.key] ?? "");

          return (
            <td
              key={column.key}
              className="px-2 py-1 border-b border-border min-w-[140px]"
            >
              <input
                className="w-full px-1.5 py-1 border border-transparent rounded bg-transparent text-text text-[13px] focus:outline-none focus:border-accent focus:bg-[var(--surface2,var(--surface))]"
                value={value ?? ""}
                onChange={(e) =>
                  onUpdateStudent(ci, si, column, e.target.value)
                }
                placeholder="-"
              />
            </td>
          );
        })}
        <td className="px-2 py-1 border-b border-border">
          <button
            className="flex items-center justify-center w-6 h-6 rounded bg-transparent text-text-dim cursor-pointer border-0 transition-[background,color] duration-[120ms] hover:bg-[rgba(239,68,68,0.1)] hover:text-red"
            onClick={() => onRemoveStudent(ci, si)}
            type="button"
            title="삭제"
          >
            <Trash2 size={14} />
          </button>
        </td>
      </tr>
    );
  },
  (prev, next) =>
    prev.ci === next.ci &&
    prev.si === next.si &&
    prev.student === next.student &&
    prev.columnSignature === next.columnSignature,
);

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
    <div className="flex flex-col" style={{ height: 220 }}>
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
      className="scrollbar-subtle flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2"
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
