"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Phone } from "lucide-react";
import { useStudentManagement } from "../student-management-provider";
import type { Student } from "../types";
import { Avatar } from "./avatar";
import { StatusBadge } from "./status-badge";
import styles from "../student-detail.module.css";

interface StudentDetailHeaderProps {
  student: Student;
}

export function StudentDetailHeader({ student }: StudentDetailHeaderProps) {
  const { openSheet } = useStudentManagement();

  return (
    <div>
      <Link href="/home/student-management" className={styles.backLink}>
        <ArrowLeft size={16} />
        학생 목록으로
      </Link>

      <div className={styles.profileHeader}>
        <Avatar name={student.name} size={56} />

        <div className={styles.profileInfo}>
          <div className={styles.profileName}>{student.name}</div>

          <div className={styles.profileMeta}>
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
            <div className={styles.profileTags}>
              {student.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.profileActions}>
          <button
            className={styles.editBtn}
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
