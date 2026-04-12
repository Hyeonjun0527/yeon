import { createContext } from "react";

import type { ClassRoom, Member, SheetMode, Space, Student } from "./types";

export interface StudentManagementContextValue {
  students: Student[];
  classes: ClassRoom[];
  selectedClassId: string | null;
  setSelectedClassId: (id: string | null) => void;
  addStudent: (student: Student) => void;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  removeStudent: (id: string) => void;
  addClass: (classRoom: ClassRoom) => void;
  updateClass: (id: string, patch: Partial<ClassRoom>) => void;
  removeClass: (id: string) => void;
  assignStudentsToClass: (studentIds: string[], classId: string) => void;
  removeStudentsFromClass: (studentIds: string[], classId: string) => void;
  spaces: Space[];
  spacesLoading: boolean;
  spacesError: string | null;
  selectedSpaceId: string | null;
  setSelectedSpaceId: (id: string | null) => void;
  refetchSpaces: () => void;
  members: Member[];
  membersLoading: boolean;
  membersError: string | null;
  refetchMembers: () => void;
  patchMemberInCaches: (memberId: string, patch: Partial<Member>) => void;
  sheetMode: SheetMode;
  sheetStudentId: string | null;
  openSheet: (mode: "create" | "edit", studentId?: string) => void;
  closeSheet: () => void;
  importMode: boolean;
  enterImportMode: () => void;
  exitImportMode: () => void;
}

export const StudentManagementContext =
  createContext<StudentManagementContextValue | null>(null);
