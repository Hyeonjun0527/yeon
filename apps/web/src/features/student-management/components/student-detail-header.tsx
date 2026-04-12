"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Phone } from "lucide-react";
import { useStudentManagement } from "../student-management-provider";
import type { Student } from "../types";
import { Avatar } from "./avatar";
import { StatusBadge } from "./status-badge";
import { useAppRoute } from "@/lib/app-route-context";

interface StudentDetailHeaderProps {
  student: Student;
}

export function StudentDetailHeader({ student }: StudentDetailHeaderProps) {
  const { openSheet, selectedSpaceId } = useStudentManagement();
  const { resolveAppHref } = useAppRoute();
  const backHref = selectedSpaceId
    ? `${resolveAppHref("/home/student-management")}?spaceId=${selectedSpaceId}`
    : resolveAppHref("/home/student-management");

  return (
    <div>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-text-dim no-underline text-sm mb-5 transition-colors duration-150 hover:text-text-secondary"
      >
        <ArrowLeft size={16} />
        수강생 목록으로
      </Link>

      <div className="flex items-start gap-5 p-6 bg-surface-2 border border-border rounded mb-6 md:flex-row flex-col md:items-start items-center md:text-left text-center">
        <Avatar name={student.name} size={56} />

        <div className="flex-1">
          <div className="text-[22px] font-bold text-text mb-1">
            {student.name}
          </div>

          <div className="text-sm text-text-secondary flex items-center gap-2 flex-wrap mb-2">
            <span>{student.grade}기수</span>
            {student.school && (
              <>
                <span>·</span>
                <span>{student.school}</span>
              </>
            )}
            {student.phone && (
              <>
                <span>·</span>
                <Phone size={13} />
                <span>{student.phone}</span>
              </>
            )}
            <span>·</span>
            <StatusBadge status={student.status} />
          </div>

          {student.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
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
        </div>

        <div className="flex gap-2 md:w-auto w-full md:justify-start justify-center">
          <button
            className="flex items-center gap-1.5 py-2 px-4 border border-border rounded-lg bg-surface-3 text-text-secondary text-sm font-medium cursor-pointer transition-[border-color,background] duration-150 hover:border-accent-border hover:bg-accent-dim hover:text-accent"
            onClick={() => openSheet("edit", student.id)}
          >
            <Pencil size={14} />
            수정
          </button>
        </div>
      </div>
    </div>
  );
}
