"use client";

import { useState } from "react";
import { useStudentManagement } from "../student-management-provider";
import type { StudentStatus } from "../types";

interface FormErrors {
  name?: string;
  grade?: string;
}

export function useStudentForm({
  mode,
  studentId,
}: {
  mode: "create" | "edit";
  studentId?: string;
}) {
  const { students, classes, addStudent, updateStudent, closeSheet } =
    useStudentManagement();

  const existing =
    mode === "edit" && studentId
      ? students.find((s) => s.id === studentId)
      : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [school, setSchool] = useState(existing?.school ?? "");
  const [grade, setGrade] = useState(existing?.grade ?? "");
  const [status, setStatus] = useState<StudentStatus>(
    existing?.status ?? "enrolled",
  );
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [classIds, setClassIds] = useState<string[]>(existing?.classIds ?? []);
  const [guardianName, setGuardianName] = useState(
    existing?.guardians[0]?.name ?? "",
  );
  const [guardianPhone, setGuardianPhone] = useState(
    existing?.guardians[0]?.phone ?? "",
  );
  const [guardianRelation, setGuardianRelation] = useState(
    existing?.guardians[0]?.relation ?? "부모",
  );

  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): boolean {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "이름은 필수입니다.";
    if (!grade.trim()) next.grade = "기수는 필수입니다.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    const guardians = guardianName.trim()
      ? [
          {
            id: existing?.guardians[0]?.id ?? crypto.randomUUID(),
            name: guardianName.trim(),
            phone: guardianPhone.trim(),
            relation: guardianRelation,
          },
        ]
      : (existing?.guardians ?? []);

    if (mode === "create") {
      addStudent({
        id: crypto.randomUUID(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        school: school.trim() || undefined,
        grade,
        status,
        registeredAt: new Date().toISOString().slice(0, 10),
        tags,
        classIds,
        guardians,
        memos: [],
        counselingHistory: [],
        courseHistory: [],
      });
    } else if (mode === "edit" && studentId) {
      updateStudent(studentId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        school: school.trim() || undefined,
        grade,
        status,
        tags,
        classIds,
        guardians,
      });
    }

    closeSheet();
  }

  return {
    formData: {
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
    },
    setters: {
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
    },
    errors,
    handleSubmit,
    isEdit: mode === "edit",
    classes,
  };
}
