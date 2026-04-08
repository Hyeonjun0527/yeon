"use client";

import styles from "../student-list.module.css";
import type { Student, ViewMode } from "../types";
import { StudentCard } from "./student-card";
import { StudentTable } from "./student-table";

export interface StudentListViewProps {
  students: Student[];
  viewMode: ViewMode;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export function StudentListView({
  students,
  viewMode,
  selectedIds,
  onToggleSelect,
}: StudentListViewProps) {
  if (viewMode === "table") {
    return (
      <StudentTable
        students={students}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
      />
    );
  }

  return (
    <div className={styles.cardGrid}>
      {students.map((student) => (
        <StudentCard
          key={student.id}
          student={student}
          isSelected={selectedIds.has(student.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
