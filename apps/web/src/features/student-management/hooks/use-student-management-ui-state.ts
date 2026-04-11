"use client";

import { useCallback, useState } from "react";

import type { SheetMode } from "../types";

export function useStudentManagementUiState() {
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetStudentId, setSheetStudentId] = useState<string | null>(null);
  const [importMode, setImportMode] = useState(false);

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

  const enterImportMode = useCallback(() => {
    setImportMode(true);
  }, []);

  const exitImportMode = useCallback(() => {
    setImportMode(false);
  }, []);

  return {
    sheetMode,
    sheetStudentId,
    openSheet,
    closeSheet,
    importMode,
    enterImportMode,
    exitImportMode,
  };
}
