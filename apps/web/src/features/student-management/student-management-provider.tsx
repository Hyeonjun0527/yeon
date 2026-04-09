"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MOCK_CLASSES, MOCK_STUDENTS } from "./mock-data";
import type {
  ClassRoom,
  Member,
  SheetMode,
  Space,
  Student,
} from "./types";

interface StudentManagementContextValue {
  /* ── 레거시 (mock 기반 로컬 상태) ── */
  students: Student[];
  classes: ClassRoom[];
  addStudent: (student: Student) => void;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  removeStudent: (id: string) => void;
  assignStudentsToClass: (studentIds: string[], classId: string) => void;
  removeStudentsFromClass: (studentIds: string[], classId: string) => void;
  /* ── API 기반 상태 ── */
  spaces: Space[];
  spacesLoading: boolean;
  spacesError: string | null;
  selectedSpaceId: string | null;
  setSelectedSpaceId: (id: string | null) => void;
  members: Member[];
  membersLoading: boolean;
  membersError: string | null;
  refetchMembers: () => void;
  /* ── Sheet UI 상태 ── */
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
  /* ── 레거시 로컬 상태 ── */
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [classes] = useState<ClassRoom[]>(MOCK_CLASSES);

  /* ── API 상태: spaces ── */
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  /* ── API 상태: members ── */
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersFetchKey, setMembersFetchKey] = useState(0);

  /* ── Sheet UI 상태 ── */
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetStudentId, setSheetStudentId] = useState<string | null>(null);

  /* ── spaces fetch ── */
  useEffect(() => {
    let cancelled = false;
    setSpacesLoading(true);
    setSpacesError(null);

    fetch("/api/v1/spaces")
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "스페이스 목록을 불러오지 못했습니다.");
        }
        return res.json() as Promise<{ spaces: Space[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setSpaces(data.spaces);
        if (data.spaces.length > 0 && selectedSpaceId === null) {
          setSelectedSpaceId(data.spaces[0].id);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "스페이스 목록을 불러오지 못했습니다.";
        setSpacesError(message);
      })
      .finally(() => {
        if (!cancelled) setSpacesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ── members fetch (selectedSpaceId 변경 시 재조회) ── */
  useEffect(() => {
    if (!selectedSpaceId) {
      setMembers([]);
      return;
    }

    let cancelled = false;
    setMembersLoading(true);
    setMembersError(null);

    fetch(`/api/v1/spaces/${selectedSpaceId}/members`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "수강생 목록을 불러오지 못했습니다.");
        }
        return res.json() as Promise<{ members: Member[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setMembers(data.members);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "수강생 목록을 불러오지 못했습니다.";
        setMembersError(message);
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSpaceId, membersFetchKey]);

  const refetchMembers = useCallback(() => {
    setMembersFetchKey((k) => k + 1);
  }, []);

  /* ── 레거시 Student 조작 ── */
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
      spaces,
      spacesLoading,
      spacesError,
      selectedSpaceId,
      setSelectedSpaceId,
      members,
      membersLoading,
      membersError,
      refetchMembers,
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
      spaces,
      spacesLoading,
      spacesError,
      selectedSpaceId,
      members,
      membersLoading,
      membersError,
      refetchMembers,
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
