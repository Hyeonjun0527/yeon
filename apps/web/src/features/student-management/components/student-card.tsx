"use client";

import Link from "next/link";
import styles from "../student-list.module.css";
import type { Student } from "../types";
import { Avatar } from "./avatar";
import { StatusBadge } from "./status-badge";

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
  return (
    <div className={styles.card}>
      <input
        type="checkbox"
        className={styles.cardCheckbox}
        checked={isSelected}
        onChange={() => onToggleSelect(student.id)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`${student.name} 선택`}
      />

      <Link
        href={`/home/student-management/${student.id}`}
        style={{ display: "block", textDecoration: "none", color: "inherit" }}
      >
        <div className={styles.cardHeader}>
          <Avatar name={student.name} size={40} />
          <div>
            <div className={styles.cardName}>{student.name}</div>
            <div className={styles.cardSub}>
              {student.grade} · {student.school ?? ""}
            </div>
          </div>
          <StatusBadge status={student.status} />
        </div>

        {student.tags.length > 0 && (
          <div className={styles.cardTags}>
            {student.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className={styles.cardStats}>
          <div>
            <div className={styles.statLabel}>상담</div>
            <div className={styles.statValue}>
              {student.counselingHistory.length}건
            </div>
          </div>
          <div>
            <div className={styles.statLabel}>메모</div>
            <div className={styles.statValue}>{student.memos.length}건</div>
          </div>
        </div>
      </Link>
    </div>
  );
}
