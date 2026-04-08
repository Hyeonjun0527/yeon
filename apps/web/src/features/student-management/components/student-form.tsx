"use client";

import { useStudentForm } from "../hooks/use-student-form";
import { useStudentManagement } from "../student-management-provider";
import { ALL_TAGS } from "../mock-data";
import { STUDENT_STATUS_META } from "../constants";
import type { StudentStatus } from "../types";
import styles from "../student-detail.module.css";

const GRADES = ["1기", "2기", "3기", "4기", "5기"];
const GUARDIAN_RELATIONS = ["부모", "형제", "기타"];

export function StudentForm() {
  const { sheetMode, sheetStudentId, closeSheet } = useStudentManagement();

  const mode = sheetMode as "create" | "edit";
  const { formData, setters, errors, handleSubmit, classes } = useStudentForm({
    mode,
    studentId: sheetStudentId ?? undefined,
  });

  const {
    name, phone, email, school, grade, status,
    tags, classIds, guardianName, guardianPhone, guardianRelation,
  } = formData;

  const {
    setName, setPhone, setEmail, setSchool, setGrade, setStatus,
    setTags, setClassIds, setGuardianName, setGuardianPhone, setGuardianRelation,
  } = setters;

  function toggleTag(tag: string) {
    setTags(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);
  }

  function toggleClass(id: string) {
    setClassIds(classIds.includes(id) ? classIds.filter((c) => c !== id) : [...classIds, id]);
  }

  return (
    <>
      <div className={styles.sheetBody}>
        {/* 기본 정보 */}
        <div className={styles.formSection}>
          <p className={styles.formSectionTitle}>기본 정보</p>

          <div className={styles.formField}>
            <label className={styles.formLabel}>이름 *</label>
            <input
              className={`${styles.formInput}${errors.name ? ` ${styles.formInputError}` : ""}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="학생 이름"
            />
            {errors.name && <p className={styles.formError}>{errors.name}</p>}
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>기수 *</label>
            <select
              className={`${styles.formSelect}${errors.grade ? ` ${styles.formInputError}` : ""}`}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="">기수 선택</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            {errors.grade && <p className={styles.formError}>{errors.grade}</p>}
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>트랙</label>
            <select
              className={styles.formSelect}
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            >
              <option value="">트랙 선택</option>
              {[...new Set(classes.map((c) => c.subject))].map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>연락처</label>
            <input
              className={styles.formInput}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>이메일</label>
            <input
              className={styles.formInput}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
            />
          </div>
        </div>

        {/* 보호자 정보 */}
        <div className={styles.formSection}>
          <p className={styles.formSectionTitle}>보호자 정보</p>

          <div className={styles.formField}>
            <label className={styles.formLabel}>이름</label>
            <input
              className={styles.formInput}
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="보호자 이름"
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>연락처</label>
            <input
              className={styles.formInput}
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>관계</label>
            <select
              className={styles.formSelect}
              value={guardianRelation}
              onChange={(e) => setGuardianRelation(e.target.value)}
            >
              {GUARDIAN_RELATIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 분류 */}
        <div className={styles.formSection}>
          <p className={styles.formSectionTitle}>분류</p>

          <div className={styles.formField}>
            <label className={styles.formLabel}>태그</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={styles.tag}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "12px",
                    border: tags.includes(tag) ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                    background: tags.includes(tag) ? "#eff6ff" : "#f8fafc",
                    color: tags.includes(tag) ? "#2563eb" : "#475569",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>상태</label>
            <select
              className={styles.formSelect}
              value={status}
              onChange={(e) => setStatus(e.target.value as StudentStatus)}
            >
              {(Object.keys(STUDENT_STATUS_META) as StudentStatus[]).map((key) => (
                <option key={key} value={key}>
                  {STUDENT_STATUS_META[key].label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>코호트 배정</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
              {classes.map((cls) => (
                <label
                  key={cls.id}
                  style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#334155", cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={classIds.includes(cls.id)}
                    onChange={() => toggleClass(cls.id)}
                  />
                  {cls.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.sheetFooter}>
        <button type="button" className={styles.cancelBtn} onClick={closeSheet}>
          취소
        </button>
        <button type="button" className={styles.submitBtn} onClick={handleSubmit}>
          저장
        </button>
      </div>
    </>
  );
}
