"use client";

import { useState } from "react";
import { useStudentManagement } from "../student-management-provider";
import type { DetailTab } from "../types";

interface UseStudentDetailParams {
  studentId: string;
}

export function useStudentDetail({ studentId }: UseStudentDetailParams) {
  const { students } = useStudentManagement();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  const student = students.find((s) => s.id === studentId);

  return { student, activeTab, setActiveTab };
}
