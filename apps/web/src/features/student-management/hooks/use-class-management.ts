"use client";

import { useCallback, useState } from "react";
import { useStudentManagement } from "../student-management-provider";
import type { Student } from "../types";

export function useClassManagement() {
  const { students, classes, assignStudentsToClass, removeStudentsFromClass } =
    useStudentManagement();

  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [showAssignModal, setShowAssignModal] = useState(false);

  const getClassStudents = useCallback(
    (classId: string): Student[] => {
      const classRoom = classes.find((c) => c.id === classId);
      if (!classRoom) return [];
      return students.filter((s) => classRoom.studentIds.includes(s.id));
    },
    [classes, students],
  );

  const getUnassignedStudents = useCallback(
    (classId: string): Student[] => {
      const classRoom = classes.find((c) => c.id === classId);
      if (!classRoom) return students;
      return students.filter((s) => !classRoom.studentIds.includes(s.id));
    },
    [classes, students],
  );

  const toggleExpand = useCallback((classId: string) => {
    setExpandedClassId((prev) => (prev === classId ? null : classId));
    setSelectedStudentIds(new Set());
    setShowAssignModal(false);
  }, []);

  const toggleStudentSelect = useCallback((studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }, []);

  const handleAssign = useCallback(
    (classId: string) => {
      if (selectedStudentIds.size === 0) return;
      assignStudentsToClass(Array.from(selectedStudentIds), classId);
      setSelectedStudentIds(new Set());
      setShowAssignModal(false);
    },
    [selectedStudentIds, assignStudentsToClass],
  );

  const handleRemove = useCallback(
    (studentId: string, classId: string) => {
      removeStudentsFromClass([studentId], classId);
    },
    [removeStudentsFromClass],
  );

  return {
    classes,
    expandedClassId,
    toggleExpand,
    getClassStudents,
    getUnassignedStudents,
    selectedStudentIds,
    toggleStudentSelect,
    handleAssign,
    handleRemove,
    showAssignModal,
    setShowAssignModal,
  };
}
