"use client";

import type { CourseHistoryItem } from "../types";

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
          <div
            key={course.id}
            className="flex items-center justify-between py-3 px-4 bg-surface-2 border border-border rounded-lg text-sm transition-[border-color] duration-150 hover:border-border-light"
          >
            <div>
              <div className="font-medium text-text-secondary">
                {course.className}
              </div>
              <div className="text-[13px] text-text-dim">
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
