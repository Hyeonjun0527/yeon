"use client";

import { useState } from "react";
import { Users, Plus, Pencil, Trash2, GraduationCap } from "lucide-react";
import { StudentManagementProvider } from "@/features/student-management";
import { useStudentManagement } from "@/features/student-management/student-management-provider";
import { useClassForm } from "@/features/student-management/hooks/use-class-form";
import { ClassSheet } from "@/features/student-management/components/class-sheet";
import styles from "./student-management-layout.module.css";

function SidebarContent({ children }: { children: React.ReactNode }) {
  const { classes, students, selectedClassId, setSelectedClassId } =
    useStudentManagement();
  const classForm = useClassForm();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const getStudentCount = (classId: string) =>
    classes.find((c) => c.id === classId)?.studentIds.length ?? 0;

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar}>
        <div className={styles.logo}>
          <GraduationCap size={20} style={{ color: "var(--accent)" }} />
          <span className={styles.logoText}>수강생 관리</span>
        </div>

        {/* 전체 수강생 */}
        <button
          className={`${styles.navItem} ${selectedClassId === null ? styles.navItemActive : ""}`}
          onClick={() => setSelectedClassId(null)}
        >
          <Users size={16} />
          <span style={{ flex: 1 }}>전체 수강생</span>
          <span className={styles.navCount}>{students.length}</span>
        </button>

        {/* 코호트 목록 */}
        <div className={styles.sectionLabel}>코호트</div>
        <div className={styles.cohortList}>
          {classes.map((cls) => (
            <button
              key={cls.id}
              className={`${styles.navItem} ${selectedClassId === cls.id ? styles.navItemActive : ""}`}
              onClick={() => setSelectedClassId(cls.id)}
              onMouseEnter={() => setHoveredId(cls.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span
                className={styles.cohortDot}
                style={{
                  backgroundColor:
                    cls.studentIds.length >= cls.capacity
                      ? "var(--red)"
                      : cls.studentIds.length > cls.capacity * 0.6
                        ? "var(--amber)"
                        : "var(--green)",
                }}
              />
              <span className={styles.cohortName}>{cls.name}</span>
              {hoveredId === cls.id ? (
                <span className={styles.navActions}>
                  <span
                    role="button"
                    tabIndex={0}
                    className={styles.navActionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      classForm.openEdit(cls.id);
                    }}
                    title="수정"
                  >
                    <Pencil size={12} />
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    className={styles.navActionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`"${cls.name}" 코호트를 삭제하시겠습니까?`)) {
                        classForm.handleDelete(cls.id);
                      }
                    }}
                    title="삭제"
                  >
                    <Trash2 size={12} />
                  </span>
                </span>
              ) : (
                <span className={styles.navCount}>
                  {getStudentCount(cls.id)}
                </span>
              )}
            </button>
          ))}
        </div>

        <button className={styles.addCohortBtn} onClick={classForm.openCreate}>
          <Plus size={14} />
          코호트 추가
        </button>

        <ClassSheet
          mode={classForm.sheetMode}
          form={classForm.form}
          onUpdateField={classForm.updateField}
          onSubmit={classForm.handleSubmit}
          onClose={classForm.closeSheet}
        />
      </nav>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

export default function StudentManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudentManagementProvider>
      <SidebarContent>{children}</SidebarContent>
    </StudentManagementProvider>
  );
}
