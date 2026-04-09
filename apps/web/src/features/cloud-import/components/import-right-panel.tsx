"use client";

import { Check, Loader2, Trash2 } from "lucide-react";
import type { useCloudImport } from "../hooks/use-cloud-import";
import type { ImportPreview } from "../types";
import styles from "../cloud-import.module.css";

interface ImportRightPanelProps {
  hook: ReturnType<typeof useCloudImport>;
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
      <div className={styles.rightPanel}>
        <div className={styles.previewPlaceholder}>
          파일을 선택하면 여기에 미리보기가 나타납니다
        </div>
      </div>
    );
  }

  /* 완료 */
  if (importResult) {
    return (
      <div className={styles.rightPanel}>
        <div className={styles.successMsg}>
          <Check size={20} />
          <span>
            {importResult.spaces}개 스페이스, {importResult.members}명 수강생이
            생성되었습니다.
          </span>
        </div>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button className={styles.importBtn} onClick={onClose} type="button">
            닫기
          </button>
        </div>
      </div>
    );
  }

  /* 가져오는 중 */
  if (importing) {
    return (
      <div className={styles.rightPanel}>
        <div className={styles.loadingOverlay}>
          <Loader2 size={24} className={styles.spinner} />
          <span>가져오는 중...</span>
        </div>
      </div>
    );
  }

  /* 분석 중 */
  if (analyzing) {
    return (
      <div className={styles.rightPanel}>
        <div className={styles.loadingOverlay}>
          <Loader2 size={24} className={styles.spinner} />
          <span>AI가 파일을 분석하고 있습니다...</span>
        </div>
      </div>
    );
  }

  /* 분석 결과 미리보기 */
  if (editablePreview) {
    return (
      <div className={styles.rightPanel}>
        {error && <div className={styles.errorMsg}>{error}</div>}
        <PreviewEditor
          preview={editablePreview}
          onUpdate={updatePreview}
          onConfirm={confirmImport}
          onCancel={() => {
            hook.selectFileForPreview(selectedFile);
          }}
          importing={importing}
        />
      </div>
    );
  }

  /* 파일 선택됨, 분석 전 */
  return (
    <div className={styles.rightPanel}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: 4,
          }}
        >
          {selectedFile.name}
        </p>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            marginBottom: 20,
          }}
        >
          AI가 파일에서 수강생 정보를 분석합니다.
        </p>
        <button
          className={styles.analyzeBtn}
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
  importing: boolean;
}

function PreviewEditor({
  preview,
  onUpdate,
  onConfirm,
  onCancel,
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
    <div style={{ padding: "12px 0" }}>
      <div className={styles.previewSummary}>
        {preview.cohorts.length}개 스페이스, {totalStudents}명 수강생
      </div>

      {preview.cohorts.map((cohort, ci) => (
        <div key={ci} className={styles.cohortSection}>
          <input
            className={styles.cohortInput}
            value={cohort.name}
            onChange={(e) => updateCohortName(ci, e.target.value)}
            placeholder="스페이스명"
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
          onClick={onCancel}
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
    </div>
  );
}
