"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Avatar } from "./avatar";
import type { ClassRoom, Student } from "../types";

interface ClassCardProps {
  classRoom: ClassRoom;
  studentCount: number;
  students: Student[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (classId: string) => void;
  onDelete: (classId: string) => void;
}

function getCapacityColor(ratio: number): string {
  if (ratio > 0.9) return "#ef4444";
  if (ratio > 0.6) return "#f59e0b";
  return "#22c55e";
}

export function ClassCard({
  classRoom,
  studentCount,
  students,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: ClassCardProps) {
  const ratio = classRoom.capacity > 0 ? studentCount / classRoom.capacity : 0;
  const widthPct = `${Math.min(ratio * 100, 100).toFixed(1)}%`;
  const fillColor = getCapacityColor(ratio);
  const previewStudents = students.slice(0, 5);
  const moreCount = studentCount > 5 ? studentCount - 5 : 0;

  return (
    <div
      className="bg-surface-2 border border-border rounded p-5 cursor-pointer transition-all duration-150 hover:border-border-light hover:bg-surface-3"
      onClick={onToggle}
      style={
        isExpanded ? { boxShadow: "0 4px 12px rgba(0,0,0,0.08)" } : undefined
      }
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-semibold text-text">
          {classRoom.name}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
            {classRoom.year}년
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(classRoom.id);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-dim)",
              padding: 4,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              transition: "color 0.15s",
            }}
            title="수정"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`"${classRoom.name}" 코호트를 삭제하시겠습니까?`)) {
                onDelete(classRoom.id);
              }
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-dim)",
              padding: 4,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              transition: "color 0.15s",
            }}
            title="삭제"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="text-[13px] text-text-secondary mb-3">
        {classRoom.subject && <span>트랙: {classRoom.subject}</span>}
        {classRoom.instructor && (
          <span style={{ marginLeft: 8 }}>멘토: {classRoom.instructor}</span>
        )}
        {classRoom.schedule && (
          <span style={{ marginLeft: 8 }}>{classRoom.schedule}</span>
        )}
      </div>

      <div className="h-[6px] bg-surface-4 rounded-[3px] overflow-hidden mb-2">
        <div
          className="h-full rounded-[3px] transition-[width] duration-300"
          style={{ width: widthPct, backgroundColor: fillColor }}
        />
      </div>
      <div className="text-xs text-text-dim">
        {studentCount} / {classRoom.capacity}명
      </div>

      {previewStudents.length > 0 && (
        <div className="flex mt-3">
          {previewStudents.map((s) => (
            <div key={s.id} className="-ml-1.5 first:ml-0">
              <Avatar name={s.name} size={32} />
            </div>
          ))}
          {moreCount > 0 && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-3 text-[11px] text-text-secondary font-semibold -ml-1.5 border-2 border-surface-2">
              +{moreCount}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
