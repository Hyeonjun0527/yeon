"use client";

import { Avatar } from "./avatar";
import type { Student } from "../types";
import styles from "../student-detail.module.css";

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
    <div className={styles.studentPanel} onClick={(e) => e.stopPropagation()}>
      <div className={styles.studentPanelHeader}>
        <span className={styles.studentPanelTitle}>
          배정된 학생 ({assignedStudents.length}명)
        </span>
        <button
          className={styles.assignBtn}
          onClick={() => onToggleAssignModal(!showAssignModal)}
        >
          학생 배정
        </button>
      </div>

      {assignedStudents.length === 0 ? (
        <p style={{ fontSize: 13, color: "#94a3b8", padding: "8px 0" }}>
          배정된 학생이 없습니다
        </p>
      ) : (
        <div className={styles.studentPanelList}>
          {assignedStudents.map((student) => (
            <div key={student.id} className={styles.studentPanelItem}>
              <Avatar name={student.name} size={28} />
              <span style={{ flex: 1, fontWeight: 500 }}>{student.name}</span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                {student.grade}기수
              </span>
              <button
                className={styles.removeBtn}
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
            미배정 학생 ({unassignedStudents.length}명)
          </div>

          {unassignedStudents.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94a3b8" }}>
              배정할 학생이 없습니다
            </p>
          ) : (
            <>
              <div className={styles.studentPanelList}>
                {unassignedStudents.map((student) => (
                  <label
                    key={student.id}
                    className={styles.studentPanelItem}
                    style={{ cursor: "pointer" }}
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
                className={styles.assignBtn}
                style={{ marginTop: 10, width: "100%" }}
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
