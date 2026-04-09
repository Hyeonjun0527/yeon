"use client";

import Link from "next/link";
import styles from "../student-list.module.css";
import type { Student } from "../types";
import { Avatar } from "./avatar";
import { StatusBadge } from "./status-badge";

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
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th style={{ width: 40 }} />
          <th>이름</th>
          <th>기수</th>
          <th>트랙</th>
          <th>상태</th>
          <th>상담 수</th>
          <th>등록일</th>
        </tr>
      </thead>
      <tbody>
        {students.map((student) => (
          <tr key={student.id}>
            <td>
              <input
                type="checkbox"
                checked={selectedIds.has(student.id)}
                onChange={() => onToggleSelect(student.id)}
                aria-label={`${student.name} 선택`}
                style={{ accentColor: "#2563eb", cursor: "pointer" }}
              />
            </td>
            <td>
              <Link
                href={`/home/student-management/${student.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className={styles.tableNameCell}>
                  <Avatar name={student.name} size={32} />
                  <span style={{ fontWeight: 500 }}>{student.name}</span>
                </div>
              </Link>
            </td>
            <td>{student.grade}</td>
            <td>{student.school ?? "-"}</td>
            <td>
              <StatusBadge status={student.status} />
            </td>
            <td>{student.counselingHistory.length}건</td>
            <td>{student.registeredAt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
