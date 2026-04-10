"use client";

import { Avatar } from "./avatar";
import type { Student } from "../types";

interface ClassStudentPanelProps {
  classId: string;
  assignedStudents: Student[];
  unassignedStudents: Student[];
  selectedStudentIds: Set<string>;
  onToggleStudent: (studentId: string) => void;
  onAssign: (classId: string) => void;
  onRemove: (studentId: string, classId: string) => void;
  showAssignModal: boolean;
  onToggleAssignModal: (show: boolean) => void;
}

export function ClassStudentPanel({
  classId,
  assignedStudents,
  unassignedStudents,
  selectedStudentIds,
  onToggleStudent,
  onAssign,
  onRemove,
  showAssignModal,
  onToggleAssignModal,
}: ClassStudentPanelProps) {
  return (
    <div
      className="mt-4 p-4 bg-surface-3 rounded-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-text-secondary">
          배정된 수강생 ({assignedStudents.length}명)
        </span>
        <button
          className="py-1.5 px-[14px] bg-accent text-white border-none rounded-sm text-[13px] font-medium cursor-pointer transition-opacity duration-150 hover:opacity-90"
          onClick={() => onToggleAssignModal(!showAssignModal)}
        >
          수강생 배정
        </button>
      </div>

      {assignedStudents.length === 0 ? (
        <p style={{ fontSize: 13, color: "#94a3b8", padding: "8px 0" }}>
          배정된 수강생이 없습니다
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {assignedStudents.map((student) => (
            <div
              key={student.id}
              className="flex items-center gap-[10px] py-2 px-3 bg-surface-2 rounded-sm text-sm text-text-secondary"
            >
              <Avatar name={student.name} size={28} />
              <span style={{ flex: 1, fontWeight: 500 }}>{student.name}</span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                {student.grade}기수
              </span>
              <button
                className="py-1 px-2.5 border border-red-dim bg-red-dim text-red rounded-sm text-xs cursor-pointer ml-auto transition-opacity duration-150 hover:opacity-80"
                onClick={() => onRemove(student.id, classId)}
              >
                제거
              </button>
            </div>
          ))}
        </div>
      )}

      {showAssignModal && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#475569",
              marginBottom: 8,
            }}
          >
            미배정 수강생 ({unassignedStudents.length}명)
          </div>

          {unassignedStudents.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94a3b8" }}>
              배정할 수강생이 없습니다
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                {unassignedStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-[10px] py-2 px-3 bg-surface-2 rounded-sm text-sm text-text-secondary cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.has(student.id)}
                      onChange={() => onToggleStudent(student.id)}
                      style={{ accentColor: "#2563eb" }}
                    />
                    <Avatar name={student.name} size={28} />
                    <span style={{ flex: 1, fontWeight: 500 }}>
                      {student.name}
                    </span>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>
                      {student.grade}기수
                    </span>
                  </label>
                ))}
              </div>

              <button
                className="py-1.5 px-[14px] bg-accent text-white border-none rounded-sm text-[13px] font-medium cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 w-full"
                style={{ marginTop: 10 }}
                disabled={selectedStudentIds.size === 0}
                onClick={() => onAssign(classId)}
              >
                배정하기 ({selectedStudentIds.size}명)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
