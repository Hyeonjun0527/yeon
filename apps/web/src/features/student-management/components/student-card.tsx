"use client";

import Link from "next/link";
import type { Student } from "../types";
import { Avatar } from "./avatar";
import { StatusBadge } from "./status-badge";
import { useAppRoute } from "@/lib/app-route-context";

export interface StudentCardProps {
  student: Student;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

export function StudentCard({
  student,
  isSelected,
  onToggleSelect,
}: StudentCardProps) {
  const { resolveAppHref } = useAppRoute();

  return (
    <div
      className="bg-surface-2 border border-border rounded p-5 cursor-pointer transition-all duration-150 relative hover:border-border-light hover:bg-surface-3"
      data-tutorial="member-card"
    >
      <input
        type="checkbox"
        className="absolute top-3 right-3 w-[18px] h-[18px] accent-accent cursor-pointer"
        checked={isSelected}
        onChange={() => onToggleSelect(student.id)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`${student.name} 선택`}
      />

      <Link
        href={resolveAppHref(
          `/counseling-service/student-management/${student.id}`,
        )}
        style={{ display: "block", textDecoration: "none", color: "inherit" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={student.name} size={40} />
          <div>
            <div className="text-[15px] font-semibold text-text">
              {student.name}
            </div>
            <div className="text-xs text-text-dim mt-0.5">
              {student.grade} · {student.school ?? ""}
            </div>
          </div>
          <StatusBadge status={student.status} />
        </div>

        {student.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {student.tags.map((tag) => (
              <span
                key={tag}
                className="py-0.5 px-2 rounded-[10px] text-[11px] font-medium bg-surface-3 text-text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-4 pt-3 border-t border-border">
          <div>
            <div className="text-[11px] text-text-dim">상담</div>
            <div className="text-sm font-semibold text-text">
              {student.counselingHistory.length}건
            </div>
          </div>
          <div>
            <div className="text-[11px] text-text-dim">메모</div>
            <div className="text-sm font-semibold text-text">
              {student.memos.length}건
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
