import { useState, useCallback } from "react";
import type { TaskPriority } from "../_lib/mock-tasks";

interface TaskFormData {
  description: string;
  studentId: string;
  studentName: string;
  dueDate: string;
  priority: TaskPriority;
}

const INITIAL: TaskFormData = {
  description: "",
  studentId: "",
  studentName: "",
  dueDate: "2026.04.16",
  priority: "medium",
};

export function useTaskForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<TaskFormData>(INITIAL);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setForm(INITIAL);
  }, []);

  const setField = useCallback(
    <K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return { isOpen, form, open, close, setField } as const;
}
