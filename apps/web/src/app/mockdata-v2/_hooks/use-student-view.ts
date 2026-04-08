import { useState, useCallback, useMemo } from "react";
import { STUDENTS } from "../../mockdata/app/_data/mock-data";
import type { Student, StudentMemo } from "../../mockdata/app/_data/mock-data";

export type StudentStatusFilter = "all" | "active" | "graduated" | "leave";
export type StudentTab = "overview" | "counseling" | "memos";

export function useStudentView() {
  const [selectedId, setSelectedId] = useState<string | null>(STUDENTS[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>("all");
  const [activeTab, setActiveTab] = useState<StudentTab>("overview");
  const [memoInput, setMemoInput] = useState("");

  const filtered = useMemo(() => {
    let result = STUDENTS;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.tags.some((t) => t.label.toLowerCase().includes(q)) ||
          s.grade.includes(q),
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((s) => {
        if (statusFilter === "active") return s.counseling > 0;
        if (statusFilter === "graduated") return s.grade === "4기";
        if (statusFilter === "leave") return s.counseling === 0;
        return true;
      });
    }

    return result;
  }, [search, statusFilter]);

  const selected: Student | null = useMemo(
    () => STUDENTS.find((s) => s.id === selectedId) ?? null,
    [selectedId],
  );

  const selectStudent = useCallback(
    (id: string) => {
      setSelectedId(id);
      setActiveTab("overview");
      setMemoInput("");
    },
    [],
  );

  const addMemo = useCallback(() => {
    if (!memoInput.trim() || !selected) return;
    const newMemo: StudentMemo = {
      id: `memo-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
      text: memoInput.trim(),
    };
    selected.memos.unshift(newMemo);
    setMemoInput("");
  }, [memoInput, selected]);

  return {
    students: filtered,
    allStudents: STUDENTS,
    selectedId,
    selected,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    activeTab,
    setActiveTab,
    selectStudent,
    memoInput,
    setMemoInput,
    addMemo,
  } as const;
}
