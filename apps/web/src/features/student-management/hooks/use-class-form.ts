"use client";

import { useCallback, useState } from "react";
import { useStudentManagement } from "../student-management-provider";
import type { ClassRoom } from "../types";

type ClassSheetMode = "create" | "edit" | null;

interface ClassFormData {
  name: string;
  subject: string;
  instructor: string;
  schedule: string;
  capacity: string;
  year: string;
}

const EMPTY_FORM: ClassFormData = {
  name: "",
  subject: "",
  instructor: "",
  schedule: "",
  capacity: "15",
  year: String(new Date().getFullYear()),
};

export function useClassForm() {
  const { classes, addClass, updateClass, removeClass } =
    useStudentManagement();

  const [sheetMode, setSheetMode] = useState<ClassSheetMode>(null);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [form, setForm] = useState<ClassFormData>(EMPTY_FORM);

  const openCreate = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingClassId(null);
    setSheetMode("create");
  }, []);

  const openEdit = useCallback(
    (classId: string) => {
      const target = classes.find((c) => c.id === classId);
      if (!target) return;
      setForm({
        name: target.name,
        subject: target.subject,
        instructor: target.instructor ?? "",
        schedule: target.schedule ?? "",
        capacity: String(target.capacity),
        year: String(target.year),
      });
      setEditingClassId(classId);
      setSheetMode("edit");
    },
    [classes],
  );

  const closeSheet = useCallback(() => {
    setSheetMode(null);
    setEditingClassId(null);
    setForm(EMPTY_FORM);
  }, []);

  const updateField = useCallback(
    (field: keyof ClassFormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) return;

    if (sheetMode === "create") {
      const newClass: ClassRoom = {
        id: `c-${Date.now()}`,
        name: form.name.trim(),
        subject: form.subject.trim(),
        instructor: form.instructor.trim() || undefined,
        schedule: form.schedule.trim() || undefined,
        capacity: Number(form.capacity) || 15,
        year: Number(form.year) || new Date().getFullYear(),
        studentIds: [],
      };
      addClass(newClass);
    } else if (sheetMode === "edit" && editingClassId) {
      updateClass(editingClassId, {
        name: form.name.trim(),
        subject: form.subject.trim(),
        instructor: form.instructor.trim() || undefined,
        schedule: form.schedule.trim() || undefined,
        capacity: Number(form.capacity) || 15,
        year: Number(form.year) || new Date().getFullYear(),
      });
    }

    closeSheet();
  }, [form, sheetMode, editingClassId, addClass, updateClass, closeSheet]);

  const handleDelete = useCallback(
    (classId: string) => {
      removeClass(classId);
      if (editingClassId === classId) closeSheet();
    },
    [removeClass, editingClassId, closeSheet],
  );

  return {
    sheetMode,
    editingClassId,
    form,
    openCreate,
    openEdit,
    closeSheet,
    updateField,
    handleSubmit,
    handleDelete,
  };
}
