"use client";

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
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))] md:[grid-template-columns:repeat(auto-fill,minmax(260px,1fr))] max-md:grid-cols-1">
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
