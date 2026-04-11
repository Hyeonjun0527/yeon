"use client";

import { Check, Loader2, Trash2, X } from "lucide-react";
import type { ImportPreview, ImportResult } from "../hooks/use-onedrive";

interface ImportPreviewModalProps {
  preview: ImportPreview;
  importing: boolean;
  importResult: ImportResult | null;
  error: string | null;
  onUpdate: (preview: ImportPreview) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function ImportPreviewModal({
  preview,
  importing,
  importResult,
  error,
  onUpdate,
  onConfirm,
  onClose,
}: ImportPreviewModalProps) {
  const updateCohortName = (cohortIndex: number, name: string) => {
    const updated = structuredClone(preview);
    updated.cohorts[cohortIndex].name = name;
    onUpdate(updated);
  };

  const updateStudent = (
    cohortIndex: number,
    studentIndex: number,
    field: "name" | "email" | "phone",
    value: string,
  ) => {
    const updated = structuredClone(preview);
    const student = updated.cohorts[cohortIndex].students[studentIndex];
    if (field === "name") {
      student.name = value;
    } else {
      student[field] = value || null;
    }
    onUpdate(updated);
  };

  const removeStudent = (cohortIndex: number, studentIndex: number) => {
    const updated = structuredClone(preview);
    updated.cohorts[cohortIndex].students.splice(studentIndex, 1);
    onUpdate(updated);
  };

  const totalStudents = preview.cohorts.reduce(
    (sum, c) => sum + c.students.length,
    0,
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-xl w-[640px] max-h-[80vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.3)] md:w-[calc(100vw-32px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-[15px] font-semibold text-text">
            가져오기 미리보기
          </h3>
          <button
            className="flex items-center justify-center w-7 h-7 rounded-[6px] border-0 bg-transparent text-text-dim cursor-pointer transition-[background] duration-[120ms] hover:bg-[var(--surface3)] hover:text-text"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="scrollbar-subtle px-5 py-4 overflow-y-auto flex-1">
          {importResult ? (
            <div className="flex items-center gap-2.5 p-5 rounded-lg bg-[rgba(34,197,94,0.1)] text-green text-sm font-medium">
              <Check size={20} />
              <span>
                {importResult.spaces}개 스페이스, {importResult.members}명
                수강생이 생성되었습니다.
              </span>
            </div>
          ) : (
            <>
              {error && (
                <div className="px-3 py-2.5 rounded-[6px] bg-[rgba(239,68,68,0.1)] text-red text-[13px] mb-3">
                  {error}
                </div>
              )}

              <div className="text-[13px] text-text-dim mb-4">
                {preview.cohorts.length}개 코호트, {totalStudents}명 수강생
              </div>

              {preview.cohorts.map((cohort, ci) => (
                <div key={ci} className="mb-5">
                  <input
                    className="text-sm font-semibold text-text bg-[var(--surface2,var(--surface))] border border-border rounded-[6px] px-3 py-2 w-full mb-2.5 focus:outline-none focus:border-accent"
                    value={cohort.name}
                    onChange={(e) => updateCohortName(ci, e.target.value)}
                    placeholder="코호트명"
                  />

                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        <th className="text-left px-2 py-1.5 font-semibold text-text-dim text-[11px] uppercase tracking-[0.04em] border-b border-border">
                          이름
                        </th>
                        <th className="text-left px-2 py-1.5 font-semibold text-text-dim text-[11px] uppercase tracking-[0.04em] border-b border-border">
                          이메일
                        </th>
                        <th className="text-left px-2 py-1.5 font-semibold text-text-dim text-[11px] uppercase tracking-[0.04em] border-b border-border">
                          전화번호
                        </th>
                        <th
                          className="text-left px-2 py-1.5 border-b border-border"
                          style={{ width: 40 }}
                        />
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

              <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
                <button
                  className="px-4 py-2 rounded-[6px] text-[13px] font-medium border border-border bg-transparent text-text-secondary cursor-pointer hover:bg-[var(--surface3)]"
                  onClick={onClose}
                  type="button"
                  disabled={importing}
                >
                  취소
                </button>
                <button
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-[13px] font-medium border-0 bg-accent text-white cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={onConfirm}
                  type="button"
                  disabled={importing || totalStudents === 0}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
