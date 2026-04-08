import { useState, useCallback } from "react";

export function useReportEditor() {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState("");

  const startEdit = useCallback((index: number, content: string) => {
    setEditingIndex(index);
    setEditBuffer(content);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditBuffer("");
  }, []);

  return {
    editingIndex,
    editBuffer,
    setEditBuffer,
    startEdit,
    cancelEdit,
  } as const;
}
