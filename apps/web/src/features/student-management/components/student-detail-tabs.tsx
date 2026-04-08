"use client";

import { DETAIL_TABS } from "../constants";
import type { DetailTab } from "../types";
import styles from "../student-detail.module.css";

interface StudentDetailTabsProps {
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}

export function StudentDetailTabs({
  activeTab,
  onTabChange,
}: StudentDetailTabsProps) {
  return (
    <div className={styles.tabBar}>
      {DETAIL_TABS.map((t) => (
        <button
          key={t.id}
          className={`${styles.tab}${activeTab === t.id ? ` ${styles.tabActive}` : ""}`}
          onClick={() => onTabChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
