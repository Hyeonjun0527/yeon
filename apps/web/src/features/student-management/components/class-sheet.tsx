"use client";

import { X } from "lucide-react";
import styles from "../student-detail.module.css";

interface ClassSheetProps {
  mode: "create" | "edit" | null;
  form: {
    name: string;
    subject: string;
    instructor: string;
    schedule: string;
    capacity: string;
    year: string;
  };
  onUpdateField: (field: "name" | "subject" | "instructor" | "schedule" | "capacity" | "year", value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function ClassSheet({
  mode,
  form,
  onUpdateField,
  onSubmit,
  onClose,
}: ClassSheetProps) {
  if (!mode) return null;

  return (
    <>
      <div className={styles.sheetOverlay} onClick={onClose} />
      <div className={styles.sheetPanel}>
        <div className={styles.sheetHeader}>
          <h2 className={styles.sheetTitle}>
            {mode === "create" ? "코호트 추가" : "코호트 수정"}
          </h2>
          <button
            className={styles.sheetCloseBtn}
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.sheetBody}>
          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>기본 정보</h3>

            <div className={styles.formField}>
              <label className={styles.formLabel}>코호트 이름 *</label>
              <input
                className={styles.formInput}
                value={form.name}
                onChange={(e) => onUpdateField("name", e.target.value)}
                placeholder="예: 웹개발 3기"
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>트랙 (과목)</label>
              <input
                className={styles.formInput}
                value={form.subject}
                onChange={(e) => onUpdateField("subject", e.target.value)}
                placeholder="예: 풀스택 웹개발"
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>담당 멘토</label>
              <input
                className={styles.formInput}
                value={form.instructor}
                onChange={(e) => onUpdateField("instructor", e.target.value)}
                placeholder="예: 김태호 멘토"
              />
            </div>
          </div>

          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>일정 및 정원</h3>

            <div className={styles.formField}>
              <label className={styles.formLabel}>스케줄</label>
              <input
                className={styles.formInput}
                value={form.schedule}
                onChange={(e) => onUpdateField("schedule", e.target.value)}
                placeholder="예: 월~금 09:00-18:00"
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div className={styles.formField} style={{ flex: 1 }}>
                <label className={styles.formLabel}>정원</label>
                <input
                  className={styles.formInput}
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => onUpdateField("capacity", e.target.value)}
                />
              </div>

              <div className={styles.formField} style={{ flex: 1 }}>
                <label className={styles.formLabel}>년도</label>
                <input
                  className={styles.formInput}
                  type="number"
                  value={form.year}
                  onChange={(e) => onUpdateField("year", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.sheetFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>
            취소
          </button>
          <button
            className={styles.submitBtn}
            onClick={onSubmit}
            disabled={!form.name.trim()}
          >
            {mode === "create" ? "추가" : "저장"}
          </button>
        </div>
      </div>
    </>
  );
}
