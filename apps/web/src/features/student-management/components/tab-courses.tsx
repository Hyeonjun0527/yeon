"use client";

import type { CourseHistoryItem } from "../types";
import styles from "../student-detail.module.css";

const COURSE_STATUS_META: Record<
  CourseHistoryItem["status"],
  { label: string; color: string }
> = {
  active: { label: "수강중", color: "#16a34a" },
  completed: { label: "수료", color: "#2563eb" },
  dropped: { label: "중도포기", color: "#6b7280" },
};

interface TabCoursesProps {
  history: CourseHistoryItem[];
}

export function TabCourses({ history }: TabCoursesProps) {
  if (history.length === 0) {
    return (
      <div style={{ color: "#94a3b8", fontSize: 14, padding: "24px 0" }}>
        수강 이력이 없습니다.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {history.map((course) => {
        const meta = COURSE_STATUS_META[course.status];
        return (
          <div key={course.id} className={styles.courseItem}>
            <div>
              <div className={styles.courseItemName}>{course.className}</div>
              <div className={styles.courseItemMeta}>
                {course.period}
                {course.instructor && ` · 멘토: ${course.instructor}`}
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>
              {meta.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
