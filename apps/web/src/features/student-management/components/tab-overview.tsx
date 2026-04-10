"use client";

import type { Student } from "../types";

interface TabOverviewProps {
  student: Student;
}

export function TabOverview({ student }: TabOverviewProps) {
  const recentCounseling = student.counselingHistory.slice(0, 3);
  const activeCourses = student.courseHistory.filter(
    (c) => c.status === "active",
  );

  return (
    <div>
      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))] gap-3 mb-6">
        <div className="p-4 bg-surface-2 border border-border rounded">
          <div className="text-xs text-text-dim mb-1">총 상담</div>
          <div className="text-[22px] font-bold text-text font-mono tracking-[-0.5px]">
            {student.counselingHistory.length}건
          </div>
        </div>
        <div className="p-4 bg-surface-2 border border-border rounded">
          <div className="text-xs text-text-dim mb-1">수강 코호트</div>
          <div className="text-[22px] font-bold text-text font-mono tracking-[-0.5px]">
            {student.courseHistory.length}개
          </div>
        </div>
        <div className="p-4 bg-surface-2 border border-border rounded">
          <div className="text-xs text-text-dim mb-1">메모</div>
          <div className="text-[22px] font-bold text-text font-mono tracking-[-0.5px]">{student.memos.length}건</div>
        </div>
        <div className="p-4 bg-surface-2 border border-border rounded">
          <div className="text-xs text-text-dim mb-1">등록일</div>
          <div className="text-[22px] font-bold text-text font-mono tracking-[-0.5px]" style={{ fontSize: 16 }}>
            {student.registeredAt}
          </div>
        </div>
      </div>

      {recentCounseling.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="text-base font-semibold text-text mb-3">최근 상담</div>
          <div className="flex flex-col gap-2">
            {recentCounseling.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-3 px-4 bg-surface-2 border border-border rounded-lg text-sm transition-[border-color] duration-150 hover:border-border-light"
              >
                <span className="text-[11px] text-text-dim whitespace-nowrap font-mono">{item.date}</span>
                <span className="flex-1 font-medium text-text-secondary">{item.title}</span>
                <span className="text-xs py-0.5 px-2 rounded-[10px]">{item.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCourses.length > 0 && (
        <div>
          <div className="text-base font-semibold text-text mb-3">수강 중인 코호트</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeCourses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between py-3 px-4 bg-surface-2 border border-border rounded-lg text-sm transition-[border-color] duration-150 hover:border-border-light"
              >
                <div>
                  <div className="font-medium text-text-secondary">{course.className}</div>
                  <div className="text-[13px] text-text-dim">{course.period}</div>
                </div>
                {course.instructor && (
                  <span className="text-[13px] text-text-dim">
                    멘토: {course.instructor}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
