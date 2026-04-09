"use client";

import { ClassCard } from "./class-card";
import type { ClassRoom, Student } from "../types";
import styles from "../student-detail.module.css";

interface ClassListProps {
  classes: ClassRoom[];
  expandedClassId: string | null;
  onToggleExpand: (classId: string) => void;
  getClassStudents: (classId: string) => Student[];
  onEdit: (classId: string) => void;
  onDelete: (classId: string) => void;
}

export function ClassList({
  classes,
  expandedClassId,
  onToggleExpand,
  getClassStudents,
  onEdit,
  onDelete,
}: ClassListProps) {
  return (
    <div className={styles.classGrid}>
      {classes.map((classRoom) => {
        const students = getClassStudents(classRoom.id);
        return (
          <ClassCard
            key={classRoom.id}
            classRoom={classRoom}
            studentCount={students.length}
            students={students}
            isExpanded={expandedClassId === classRoom.id}
            onToggle={() => onToggleExpand(classRoom.id)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}
