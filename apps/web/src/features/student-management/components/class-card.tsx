"use client";

import { Avatar } from "./avatar";
import type { ClassRoom, Student } from "../types";
import styles from "../student-detail.module.css";

interface ClassCardProps {
  classRoom: ClassRoom;
  studentCount: number;
  students: Student[];
  isExpanded: boolean;
  onToggle: () => void;
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
}: ClassCardProps) {
  const ratio =
    classRoom.capacity > 0 ? studentCount / classRoom.capacity : 0;
  const widthPct = `${Math.min(ratio * 100, 100).toFixed(1)}%`;
  const fillColor = getCapacityColor(ratio);
  const previewStudents = students.slice(0, 5);
  const moreCount = studentCount > 5 ? studentCount - 5 : 0;

  return (
    <div
      className={styles.classCard}
      onClick={onToggle}
      style={isExpanded ? { boxShadow: "0 4px 12px rgba(0,0,0,0.08)" } : undefined}
    >
      <div className={styles.classCardHeader}>
        <span className={styles.className}>{classRoom.name}</span>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{classRoom.year}년</span>
      </div>

      <div className={styles.classMeta}>
        {classRoom.subject && <span>트랙: {classRoom.subject}</span>}
        {classRoom.instructor && (
          <span style={{ marginLeft: 8 }}>멘토: {classRoom.instructor}</span>
        )}
        {classRoom.schedule && (
          <span style={{ marginLeft: 8 }}>{classRoom.schedule}</span>
        )}
      </div>

      <div className={styles.capacityBar}>
        <div
          className={styles.capacityFill}
          style={{ width: widthPct, backgroundColor: fillColor }}
        />
      </div>
      <div className={styles.capacityText}>
        {studentCount} / {classRoom.capacity}명
      </div>

      {previewStudents.length > 0 && (
        <div className={styles.avatarGroup}>
          {previewStudents.map((s) => (
            <div key={s.id} className={styles.avatarGroupItem}>
              <Avatar name={s.name} size={32} />
            </div>
          ))}
          {moreCount > 0 && (
            <div className={styles.avatarGroupMore}>+{moreCount}</div>
          )}
        </div>
      )}
    </div>
  );
}
