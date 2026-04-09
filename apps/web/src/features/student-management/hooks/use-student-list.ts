"use client";

import { useState } from "react";
import { useStudentManagement } from "../student-management-provider";
import type { StudentStatus, ViewMode } from "../types";
import { filterStudents, sortStudents } from "../utils";

export function useStudentList() {
  const { students, classes, selectedClassId } = useStudentManagement();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "all">(
    "all",
  );
  const [classFilter, setClassFilter] = useState<string | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [sortKey, setSortKey] = useState<"name" | "registeredAt" | "status">(
    "registeredAt",
  );

  /* 사이드바 코호트 선택이 있으면 우선 적용, 없으면 헤더 필터 사용 */
  const effectiveClassFilter = selectedClassId ?? classFilter;

  const filtered = filterStudents(students, {
    search,
    status: statusFilter,
    classId: effectiveClassFilter,
    tag: tagFilter,
  });

  const filteredStudents = sortStudents(filtered, sortKey);

  return {
    filteredStudents,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    classFilter,
    setClassFilter,
    tagFilter,
    setTagFilter,
    viewMode,
    setViewMode,
    sortKey,
    setSortKey,
    classes,
  };
}
