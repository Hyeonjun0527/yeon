"use client";

import { useState } from "react";
import { useStudentManagement } from "../student-management-provider";
import type { Memo } from "../types";

interface UseStudentMemosParams {
  studentId: string;
}

export function useStudentMemos({ studentId }: UseStudentMemosParams) {
  const { students, updateStudent } = useStudentManagement();
  const [newMemoText, setNewMemoText] = useState("");

  const student = students.find((s) => s.id === studentId);

  function addMemo() {
    if (!student || !newMemoText.trim()) return;

    const memo: Memo = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      text: newMemoText.trim(),
      author: "멘토",
    };

    updateStudent(studentId, {
      memos: [...student.memos, memo],
    });
    setNewMemoText("");
  }

  return {
    memos: student?.memos ?? [],
    newMemoText,
    setNewMemoText,
    addMemo,
  };
}
