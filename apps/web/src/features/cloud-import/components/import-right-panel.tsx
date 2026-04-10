"use client";

import { useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import type { ImportHook, ImportPreview } from "../types";

interface ImportRightPanelProps {
  hook: ImportHook;
  onClose: () => void;
}

export function ImportRightPanel({ hook, onClose }: ImportRightPanelProps) {
  const {
    selectedFile,
    analyzing,
    editablePreview,
    importing,
    importResult,
    error,
    analyzeSelectedFile,
    updatePreview,
    confirmImport,
  } = hook;

  /* 파일 미선택 */
  if (!selectedFile) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-center h-full min-h-[200px] text-text-dim text-sm text-center">
          파일을 선택하면 여기에 미리보기가 나타납니다
        </div>
      </div>
    );
  }

  /* 완료 */
  if (importResult) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2.5 p-5 rounded-lg bg-[rgba(34,197,94,0.1)] text-green text-sm font-medium">
          <Check size={20} />
          <span>
            {importResult.spaces}개 스페이스, {importResult.members}명 수강생이
            생성되었습니다.
          </span>
        </div>
        <div className="mt-4 text-center">
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-[13px] font-medium border-0 bg-accent text-white cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  /* 가져오는 중 */
  if (importing) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-center gap-2.5 p-6 mb-3 bg-accent-dim rounded-lg text-accent text-[13px] font-medium">
          <Loader2 size={24} className="animate-spin" />
          <span>가져오는 중...</span>
        </div>
      </div>
    );
  }

  /* 분석 결과 미리보기 (재분석 중에도 표시 — RefinementBar가 disabled 상태로 보임) */
  if (editablePreview) {
    return (
      <div className="h-full flex flex-col">
        {error && (
          <div className="px-3 py-2.5 rounded-[6px] bg-[rgba(239,68,68,0.1)] text-red text-[13px] mb-3">
            {error}
          </div>
        )}
        <PreviewEditor
          preview={editablePreview}
          onUpdate={updatePreview}
          onConfirm={confirmImport}
          onCancel={() => {
            hook.selectFileForPreview(selectedFile);
          }}
          onRefine={hook.refineWithInstruction}
          analyzing={analyzing}
          importing={importing}
        />
      </div>
    );
  }

  /* 초기 분석 중 (editablePreview 없음 — 재분석 중은 위 editablePreview 분기에서 처리) */
  if (analyzing) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-center gap-2.5 p-6 mb-3 bg-accent-dim rounded-lg text-accent text-[13px] font-medium">
          <Loader2 size={24} className="animate-spin" />
          <span>AI가 파일을 분석하고 있습니다...</span>
        </div>
      </div>
    );
  }

  /* 파일 선택됨, 분석 전 */
  return (
    <div className="h-full flex flex-col">
      {error && (
        <div className="px-3 py-2.5 rounded-[6px] bg-[rgba(239,68,68,0.1)] text-red text-[13px] mb-3">
          {error}
        </div>
      )}
      <div className="text-center px-5 py-10">
        <p className="text-sm font-semibold text-text mb-1">{selectedFile.name}</p>
        <p className="text-xs text-text-dim mb-5">AI가 파일에서 수강생 정보를 분석합니다.</p>
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

/* ── Preview Editor (분석 결과 편집) ── */

interface PreviewEditorProps {
  preview: ImportPreview;
  onUpdate: (p: ImportPreview) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onRefine: (instruction: string) => Promise<void>;
  analyzing: boolean;
  importing: boolean;
}

function PreviewEditor({
  preview,
  onUpdate,
  onConfirm,
  onCancel,
  onRefine,
  analyzing,
  importing,
}: PreviewEditorProps) {
  const updateCohortName = (ci: number, name: string) => {
    const updated = structuredClone(preview);
    updated.cohorts[ci].name = name;
    onUpdate(updated);
  };

  const updateStudent = (
    ci: number,
    si: number,
    field: "name" | "email" | "phone",
    value: string,
  ) => {
    const updated = structuredClone(preview);
    const student = updated.cohorts[ci].students[si];
    if (field === "name") {
      student.name = value;
    } else {
      student[field] = value || null;
    }
    onUpdate(updated);
  };

  const removeStudent = (ci: number, si: number) => {
    const updated = structuredClone(preview);
    updated.cohorts[ci].students.splice(si, 1);
    onUpdate(updated);
  };

  const totalStudents = preview.cohorts.reduce(
    (sum, c) => sum + c.students.length,
    0,
  );

  return (
    <div className="py-3">
      <div className="text-[13px] text-text-dim mb-4">
        {preview.cohorts.length}개 스페이스, {totalStudents}명 수강생
      </div>

      {preview.cohorts.map((cohort, ci) => (
        <div key={ci} className="mb-5">
          <input
            className="text-sm font-semibold text-text bg-[var(--surface2,var(--surface))] border border-border rounded-[6px] px-3 py-2 w-full mb-2.5 focus:outline-none focus:border-accent"
            value={cohort.name}
            onChange={(e) => updateCohortName(ci, e.target.value)}
            placeholder="스페이스명"
          />
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5 font-semibold text-text-dim text-[11px] uppercase tracking-[0.04em] border-b border-border">이름</th>
                <th className="text-left px-2 py-1.5 font-semibold text-text-dim text-[11px] uppercase tracking-[0.04em] border-b border-border">이메일</th>
                <th className="text-left px-2 py-1.5 font-semibold text-text-dim text-[11px] uppercase tracking-[0.04em] border-b border-border">전화번호</th>
                <th className="text-left px-2 py-1.5 border-b border-border" style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {cohort.students.map((student, si) => (
                <tr key={si}>
                  <td className="px-2 py-1 border-b border-border">
                    <input
                      className="w-full px-1.5 py-1 border border-transparent rounded bg-transparent text-text text-[13px] focus:outline-none focus:border-accent focus:bg-[var(--surface2,var(--surface))]"
                      value={student.name}
                      onChange={(e) =>
                        updateStudent(ci, si, "name", e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1 border-b border-border">
                    <input
                      className="w-full px-1.5 py-1 border border-transparent rounded bg-transparent text-text text-[13px] focus:outline-none focus:border-accent focus:bg-[var(--surface2,var(--surface))]"
                      value={student.email ?? ""}
                      onChange={(e) =>
                        updateStudent(ci, si, "email", e.target.value)
                      }
                      placeholder="-"
                    />
                  </td>
                  <td className="px-2 py-1 border-b border-border">
                    <input
                      className="w-full px-1.5 py-1 border border-transparent rounded bg-transparent text-text text-[13px] focus:outline-none focus:border-accent focus:bg-[var(--surface2,var(--surface))]"
                      value={student.phone ?? ""}
                      onChange={(e) =>
                        updateStudent(ci, si, "phone", e.target.value)
                      }
                      placeholder="-"
                    />
                  </td>
                  <td className="px-2 py-1 border-b border-border">
                    <button
                      className="flex items-center justify-center w-6 h-6 rounded bg-transparent text-text-dim cursor-pointer border-0 transition-[background,color] duration-[120ms] hover:bg-[rgba(239,68,68,0.1)] hover:text-red"
                      onClick={() => removeStudent(ci, si)}
                      type="button"
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <RefinementBar onRefine={onRefine} analyzing={analyzing} />

      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
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

/* ── Refinement Bar (AI 추가 요청) ── */

function RefinementBar({
  onRefine,
  analyzing,
}: {
  onRefine: (instruction: string) => Promise<void>;
  analyzing: boolean;
}) {
  const [instruction, setInstruction] = useState("");

  const handleSubmit = async () => {
    const trimmed = instruction.trim();
    if (!trimmed || analyzing) return;
    await onRefine(trimmed);
    setInstruction("");
  };

  return (
    <div className="px-4 py-3 border-t border-border bg-[var(--surface2)] flex flex-col gap-2">
      <p className="text-xs font-semibold text-text-dim m-0">AI에게 추가 요청</p>
      <textarea
        className="w-full px-2.5 py-2 text-[13px] border border-border rounded-[6px] bg-surface text-text resize-none outline-none box-border font-[inherit] leading-relaxed transition-[border-color] duration-150 focus:border-accent-border disabled:opacity-60 disabled:cursor-not-allowed"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="예: 출결 정보도 뽑아줘 / 이메일이 빠진 수강생 다시 확인해줘"
        rows={2}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
        }}
        disabled={analyzing}
      />
      <button
        className="self-end flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium border border-accent-border rounded-[6px] bg-transparent text-accent cursor-pointer transition-[background,color] duration-150 hover:not-disabled:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleSubmit}
        disabled={!instruction.trim() || analyzing}
        type="button"
      >
        {analyzing ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            재분석 중...
          </>
        ) : (
          "AI 재분석 요청"
        )}
      </button>
    </div>
  );
}
