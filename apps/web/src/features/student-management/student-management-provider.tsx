"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MOCK_CLASSES, MOCK_STUDENTS } from "./mock-data";
import type { ClassRoom, SheetMode, Student } from "./types";

interface StudentManagementContextValue {
  students: Student[];
  classes: ClassRoom[];
  addStudent: (student: Student) => void;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  removeStudent: (id: string) => void;
  assignStudentsToClass: (studentIds: string[], classId: string) => void;
  removeStudentsFromClass: (studentIds: string[], classId: string) => void;
  sheetMode: SheetMode;
  sheetStudentId: string | null;
  openSheet: (mode: "create" | "edit", studentId?: string) => void;
  closeSheet: () => void;
}

const StudentManagementContext =
  createContext<StudentManagementContextValue | null>(null);

export function StudentManagementProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [classes, setClasses] = useState<ClassRoom[]>(MOCK_CLASSES);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetStudentId, setSheetStudentId] = useState<string | null>(null);

  const addStudent = useCallback((student: Student) => {
    setStudents((prev) => [...prev, student]);
  }, []);

  const updateStudent = useCallback((id: string, patch: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  }, []);

  const removeStudent = useCallback((id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setClasses((prev) =>
      prev.map((c) => ({
        ...c,
        studentIds: c.studentIds.filter((sid) => sid !== id),
      })),
    );
  }, []);

  const assignStudentsToClass = useCallback(
    (studentIds: string[], classId: string) => {
      setStudents((prev) =>
        prev.map((s) =>
          studentIds.includes(s.id) && !s.classIds.includes(classId)
            ? { ...s, classIds: [...s.classIds, classId] }
            : s,
        ),
      );
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId
            ? {
                ...c,
                studentIds: [...new Set([...c.studentIds, ...studentIds])],
              }
            : c,
        ),
      );
    },
    [],
  );

  const removeStudentsFromClass = useCallback(
    (studentIds: string[], classId: string) => {
      setStudents((prev) =>
        prev.map((s) =>
          studentIds.includes(s.id)
            ? { ...s, classIds: s.classIds.filter((cid) => cid !== classId) }
            : s,
        ),
      );
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId
            ? {
                ...c,
                studentIds: c.studentIds.filter(
                  (sid) => !studentIds.includes(sid),
                ),
              }
            : c,
        ),
      );
    },
    [],
  );

  const openSheet = useCallback(
    (mode: "create" | "edit", studentId?: string) => {
      setSheetMode(mode);
      setSheetStudentId(studentId ?? null);
    },
    [],
  );

  const closeSheet = useCallback(() => {
    setSheetMode(null);
    setSheetStudentId(null);
  }, []);

  const value = useMemo(
    () => ({
      students,
      classes,
      addStudent,
      updateStudent,
      removeStudent,
      assignStudentsToClass,
      removeStudentsFromClass,
      sheetMode,
      sheetStudentId,
      openSheet,
      closeSheet,
    }),
    [
      students,
      classes,
      addStudent,
      updateStudent,
      removeStudent,
      assignStudentsToClass,
      removeStudentsFromClass,
      sheetMode,
      sheetStudentId,
      openSheet,
      closeSheet,
    ],
  );

  return (
    <StudentManagementContext.Provider value={value}>
      {children}
    </StudentManagementContext.Provider>
  );
}

export function useStudentManagement() {
  const ctx = useContext(StudentManagementContext);
  if (!ctx) {
    throw new Error(
      "useStudentManagement must be used within StudentManagementProvider",
    );
  }
  return ctx;
}
