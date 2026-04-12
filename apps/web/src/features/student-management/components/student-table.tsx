"use client";

import Link from "next/link";
import type { Student } from "../types";
import { Avatar } from "./avatar";
import { StatusBadge } from "./status-badge";
import { useAppRoute } from "@/lib/app-route-context";

export interface StudentTableProps {
  students: Student[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export function StudentTable({
  students,
  selectedIds,
  onToggleSelect,
}: StudentTableProps) {
  const { resolveAppHref } = useAppRoute();

  return (
    <table className="w-full border-collapse bg-surface rounded overflow-hidden border border-border">
      <thead>
        <tr>
          <th className="py-3 px-4 text-left text-xs font-semibold text-text-dim bg-surface-2 border-b border-border w-10" />
          <th className="py-3 px-4 text-left text-xs font-semibold text-text-dim bg-surface-2 border-b border-border">
            이름
          </th>
          <th className="py-3 px-4 text-left text-xs font-semibold text-text-dim bg-surface-2 border-b border-border">
            기수
          </th>
          <th className="py-3 px-4 text-left text-xs font-semibold text-text-dim bg-surface-2 border-b border-border">
            트랙
          </th>
          <th className="py-3 px-4 text-left text-xs font-semibold text-text-dim bg-surface-2 border-b border-border">
            상태
          </th>
          <th className="py-3 px-4 text-left text-xs font-semibold text-text-dim bg-surface-2 border-b border-border">
            상담 수
          </th>
          <th className="py-3 px-4 text-left text-xs font-semibold text-text-dim bg-surface-2 border-b border-border">
            등록일
          </th>
        </tr>
      </thead>
      <tbody>
        {students.map((student) => (
          <tr key={student.id} className="hover:[&>td]:bg-surface-2">
            <td className="py-3 px-4 text-sm text-text-secondary border-b border-border">
              <input
                type="checkbox"
                checked={selectedIds.has(student.id)}
                onChange={() => onToggleSelect(student.id)}
                aria-label={`${student.name} 선택`}
                style={{ accentColor: "#2563eb", cursor: "pointer" }}
              />
            </td>
            <td className="py-3 px-4 text-sm text-text-secondary border-b border-border">
              <Link
                href={resolveAppHref(`/home/student-management/${student.id}`)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="flex items-center gap-[10px]">
                  <Avatar name={student.name} size={32} />
                  <span style={{ fontWeight: 500 }}>{student.name}</span>
                </div>
              </Link>
            </td>
            <td className="py-3 px-4 text-sm text-text-secondary border-b border-border">
              {student.grade}
            </td>
            <td className="py-3 px-4 text-sm text-text-secondary border-b border-border">
              {student.school ?? "-"}
            </td>
            <td className="py-3 px-4 text-sm text-text-secondary border-b border-border">
              <StatusBadge status={student.status} />
            </td>
            <td className="py-3 px-4 text-sm text-text-secondary border-b border-border">
              {student.counselingHistory.length}건
            </td>
            <td className="py-3 px-4 text-sm text-text-secondary border-b border-border">
              {student.registeredAt}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
