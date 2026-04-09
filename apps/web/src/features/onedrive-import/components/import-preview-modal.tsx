"use client";

import { Check, Loader2, Trash2, X } from "lucide-react";
import type { ImportPreview, ImportResult } from "../hooks/use-onedrive";
import styles from "../onedrive-import.module.css";

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
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.modalWide}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>가져오기 미리보기</h3>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {importResult ? (
            <div className={styles.successMsg}>
              <Check size={20} />
              <span>
                {importResult.spaces}개 스페이스, {importResult.members}명
                수강생이 생성되었습니다.
              </span>
            </div>
          ) : (
            <>
              {error && <div className={styles.errorMsg}>{error}</div>}

              <div className={styles.previewSummary}>
                {preview.cohorts.length}개 코호트, {totalStudents}명 수강생
              </div>

              {preview.cohorts.map((cohort, ci) => (
                <div key={ci} className={styles.cohortSection}>
                  <input
                    className={styles.cohortInput}
                    value={cohort.name}
                    onChange={(e) => updateCohortName(ci, e.target.value)}
                    placeholder="코호트명"
                  />

                  <table className={styles.previewTable}>
                    <thead>
                      <tr>
                        <th>이름</th>
                        <th>이메일</th>
                        <th>전화번호</th>
                        <th style={{ width: 40 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {cohort.students.map((student, si) => (
                        <tr key={si}>
                          <td>
                            <input
                              className={styles.cellInput}
                              value={student.name}
                              onChange={(e) =>
                                updateStudent(ci, si, "name", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              className={styles.cellInput}
                              value={student.email ?? ""}
                              onChange={(e) =>
                                updateStudent(ci, si, "email", e.target.value)
                              }
                              placeholder="-"
                            />
                          </td>
                          <td>
                            <input
                              className={styles.cellInput}
                              value={student.phone ?? ""}
                              onChange={(e) =>
                                updateStudent(ci, si, "phone", e.target.value)
                              }
                              placeholder="-"
                            />
                          </td>
                          <td>
                            <button
                              className={styles.removeBtn}
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

              <div className={styles.modalFooter}>
                <button
                  className={styles.cancelBtn}
                  onClick={onClose}
                  type="button"
                  disabled={importing}
                >
                  취소
                </button>
                <button
                  className={styles.importBtn}
                  onClick={onConfirm}
                  type="button"
                  disabled={importing || totalStudents === 0}
                >
                  {importing ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
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
