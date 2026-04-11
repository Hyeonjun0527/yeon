"use client";

import { useStudentForm } from "../hooks/use-student-form";
import { useStudentManagement } from "../student-management-provider";
import { ALL_TAGS } from "../mock-data";
import { STUDENT_STATUS_META } from "../constants";
import type { StudentStatus } from "../types";

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
    name,
    phone,
    email,
    school,
    grade,
    status,
    tags,
    classIds,
    guardianName,
    guardianPhone,
    guardianRelation,
  } = formData;

  const {
    setName,
    setPhone,
    setEmail,
    setSchool,
    setGrade,
    setStatus,
    setTags,
    setClassIds,
    setGuardianName,
    setGuardianPhone,
    setGuardianRelation,
  } = setters;

  function toggleTag(tag: string) {
    setTags(
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
    );
  }

  function toggleClass(id: string) {
    setClassIds(
      classIds.includes(id)
        ? classIds.filter((c) => c !== id)
        : [...classIds, id],
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6">
        {/* 기본 정보 */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-text-secondary mb-3">
            기본 정보
          </p>

          <div className="mb-3">
            <label className="block text-[13px] font-medium text-text-dim mb-1">
              이름 *
            </label>
            <input
              className={`w-full py-2 px-3 border rounded-sm text-sm outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border${errors.name ? " border-red" : " border-border"}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="수강생 이름"
            />
            {errors.name && (
              <p className="text-xs text-red mt-0.5">{errors.name}</p>
            )}
          </div>

          <div className="mb-3">
            <label className="block text-[13px] font-medium text-text-dim mb-1">
              기수 *
            </label>
            <select
              className={`w-full py-2 px-3 border rounded-sm text-sm bg-surface-2 text-text cursor-pointer outline-none${errors.grade ? " border-red" : " border-border"}`}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="">기수 선택</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {errors.grade && (
              <p className="text-xs text-red mt-0.5">{errors.grade}</p>
            )}
          </div>

          <div className="mb-3">
            <label className="block text-[13px] font-medium text-text-dim mb-1">
              트랙
            </label>
            <select
              className="w-full py-2 px-3 border border-border rounded-sm text-sm bg-surface-2 text-text cursor-pointer outline-none"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            >
              <option value="">트랙 선택</option>
              {[...new Set(classes.map((c) => c.subject))].map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-[13px] font-medium text-text-dim mb-1">
              연락처
            </label>
            <input
              className="w-full py-2 px-3 border border-border rounded-sm text-sm outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>

          <div className="mb-3">
            <label className="block text-[13px] font-medium text-text-dim mb-1">
              이메일
            </label>
            <input
              className="w-full py-2 px-3 border border-border rounded-sm text-sm outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
            />
          </div>
        </div>

        {/* 비상연락처 — 성인 수강생 대상이므로 보호자 개념 없음 */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-text-secondary mb-3">
            비상연락처
          </p>

          <div className="mb-3">
            <label className="block text-[13px] font-medium text-text-dim mb-1">
              이름
            </label>
            <input
              className="w-full py-2 px-3 border border-border rounded-sm text-sm outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="비상연락처 이름"
            />
          </div>

          <div className="mb-3">
            <label className="block text-[13px] font-medium text-text-dim mb-1">
              연락처
            </label>
            <input
              className="w-full py-2 px-3 border border-border rounded-sm text-sm outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>

          <div className="mb-3">
            <label className="block text-[13px] font-medium text-text-dim mb-1">
              관계
            </label>
            <select
              className="w-full py-2 px-3 border border-border rounded-sm text-sm bg-surface-2 text-text cursor-pointer outline-none"
              value={guardianRelation}
              onChange={(e) => setGuardianRelation(e.target.value)}
            >
              {GUARDIAN_RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 분류 */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-text-secondary mb-3">분류</p>

          <div className="mb-3">
            <label className="block text-[13px] font-medium text-text-dim mb-1">
              태그
            </label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                marginTop: "4px",
              }}
            >
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "12px",
                    border: tags.includes(tag)
                      ? "1.5px solid #2563eb"
                      : "1px solid #e2e8f0",
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

          <div className="mb-3">
            <label className="block text-[13px] font-medium text-text-dim mb-1">
              상태
            </label>
            <select
              className="w-full py-2 px-3 border border-border rounded-sm text-sm bg-surface-2 text-text cursor-pointer outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value as StudentStatus)}
            >
              {(Object.keys(STUDENT_STATUS_META) as StudentStatus[]).map(
                (key) => (
                  <option key={key} value={key}>
                    {STUDENT_STATUS_META[key].label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-[13px] font-medium text-text-dim mb-1">
              코호트 배정
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginTop: "4px",
              }}
            >
              {classes.map((cls) => (
                <label
                  key={cls.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    color: "#334155",
                    cursor: "pointer",
                  }}
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

      <div className="py-4 px-6 border-t border-border flex justify-end gap-2">
        <button
          type="button"
          className="py-2 px-4 border border-border rounded-lg bg-surface-2 text-text-secondary text-sm cursor-pointer transition-[background] duration-150 hover:bg-surface-3"
          onClick={closeSheet}
        >
          취소
        </button>
        <button
          type="button"
          className="py-2 px-5 bg-accent text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-opacity duration-150 hover:opacity-90"
          onClick={handleSubmit}
        >
          저장
        </button>
      </div>
    </>
  );
}
