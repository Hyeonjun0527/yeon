"use client";

import { useContext, useMemo, type ReactNode } from "react";

import { StudentManagementContext } from "./student-management-context";
import { useLegacyStudentManagementState } from "./hooks/use-legacy-student-management-state";
import { useStudentManagementApiState } from "./hooks/use-student-management-api-state";
import { useStudentManagementUiState } from "./hooks/use-student-management-ui-state";

export function StudentManagementProvider({
  children,
}: {
  children: ReactNode;
}) {
  const legacyState = useLegacyStudentManagementState();
  const apiState = useStudentManagementApiState();
  const uiState = useStudentManagementUiState();

  const value = useMemo(
    () => ({
      ...legacyState,
      ...apiState,
      ...uiState,
    }),
    [apiState, legacyState, uiState],
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
