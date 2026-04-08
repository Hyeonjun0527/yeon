"use client";

import { STUDENT_STATUS_META } from "../constants";
import type { StudentStatus } from "../types";

interface StatusBadgeProps {
  status: StudentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const meta = STUDENT_STATUS_META[status];

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "2px 10px",
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 600,
        color: meta.color,
        background: meta.bgColor,
      }}
    >
      {meta.label}
    </span>
  );
}
