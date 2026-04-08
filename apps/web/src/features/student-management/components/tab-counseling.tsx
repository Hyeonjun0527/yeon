"use client";

import type { CounselingHistoryItem } from "../types";
import styles from "../student-detail.module.css";

const COUNSELING_STATUS_STYLE: Record<
  CounselingHistoryItem["status"],
  { color: string; bgColor: string; label: string }
> = {
  completed: { color: "#16a34a", bgColor: "#dcfce7", label: "완료" },
  in_progress: { color: "#2563eb", bgColor: "#dbeafe", label: "진행중" },
  pending: { color: "#6b7280", bgColor: "#f3f4f6", label: "예정" },
};

interface TabCounselingProps {
  history: CounselingHistoryItem[];
}

export function TabCounseling({ history }: TabCounselingProps) {
  if (history.length === 0) {
    return (
      <div style={{ color: "#94a3b8", fontSize: 14, padding: "24px 0" }}>
        상담 이력이 없습니다.
      </div>
    );
  }

  return (
    <div className={styles.counselingList}>
      {history.map((item) => {
        const meta = COUNSELING_STATUS_STYLE[item.status];
        return (
          <div key={item.id} className={styles.counselingItem}>
            <span className={styles.counselingDate}>{item.date}</span>
            <div style={{ flex: 1 }}>
              <div className={styles.counselingTitle}>{item.title}</div>
              {item.summary && (
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
                  {item.summary}
                </div>
              )}
            </div>
            <span className={styles.counselingStatus}>{item.type}</span>
            <span
              className={styles.counselingStatus}
              style={{ color: meta.color, background: meta.bgColor }}
            >
              {meta.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
