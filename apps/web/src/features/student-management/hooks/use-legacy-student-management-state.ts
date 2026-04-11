"use client";

import { useCallback, useState } from "react";

import { MOCK_CLASSES, MOCK_STUDENTS } from "../mock-data";
import type { ClassRoom, Student } from "../types";

export function useLegacyStudentManagementState() {
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [classes, setClasses] = useState<ClassRoom[]>(MOCK_CLASSES);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const addStudent = useCallback((student: Student) => {
    setStudents((prev) => [...prev, student]);
  }, []);

  const updateStudent = useCallback((id: string, patch: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === id ? { ...student, ...patch } : student,
      ),
    );
  }, []);

  const removeStudent = useCallback((id: string) => {
    setStudents((prev) => prev.filter((student) => student.id !== id));
  }, []);

  const addClass = useCallback((classRoom: ClassRoom) => {
    setClasses((prev) => [...prev, classRoom]);
  }, []);

  const updateClass = useCallback((id: string, patch: Partial<ClassRoom>) => {
    setClasses((prev) =>
      prev.map((classRoom) =>
        classRoom.id === id ? { ...classRoom, ...patch } : classRoom,
      ),
    );
  }, []);

  const removeClass = useCallback((id: string) => {
    setClasses((prev) => prev.filter((classRoom) => classRoom.id !== id));
    setStudents((prev) =>
      prev.map((student) => ({
        ...student,
        classIds: student.classIds.filter((classId) => classId !== id),
      })),
    );
  }, []);

  const assignStudentsToClass = useCallback(
    (studentIds: string[], classId: string) => {
      setStudents((prev) =>
        prev.map((student) =>
          studentIds.includes(student.id) && !student.classIds.includes(classId)
            ? { ...student, classIds: [...student.classIds, classId] }
            : student,
        ),
      );
    },
    [],
  );

  const removeStudentsFromClass = useCallback(
    (studentIds: string[], classId: string) => {
      setStudents((prev) =>
        prev.map((student) =>
          studentIds.includes(student.id)
            ? {
                ...student,
                classIds: student.classIds.filter(
                  (currentClassId) => currentClassId !== classId,
                ),
              }
            : student,
        ),
      );
    },
    [],
  );

  return {
    students,
    classes,
    selectedClassId,
    setSelectedClassId,
    addStudent,
    updateStudent,
    removeStudent,
    addClass,
    updateClass,
    removeClass,
    assignStudentsToClass,
    removeStudentsFromClass,
  };
}
