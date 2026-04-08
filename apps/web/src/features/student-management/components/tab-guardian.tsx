"use client";

import type { Guardian } from "../types";
import { Avatar } from "./avatar";
import styles from "../student-detail.module.css";

interface TabGuardianProps {
  guardians: Guardian[];
}

export function TabGuardian({ guardians }: TabGuardianProps) {
  if (guardians.length === 0) {
    return (
      <div style={{ color: "#94a3b8", fontSize: 14, padding: "24px 0" }}>
        등록된 보호자가 없습니다.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {guardians.map((guardian) => (
        <div key={guardian.id} className={styles.guardianCard}>
          <Avatar name={guardian.name} size={40} />
          <div>
            <div className={styles.guardianName}>{guardian.name}</div>
            <div className={styles.guardianMeta}>
              {guardian.relation} · {guardian.phone}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
