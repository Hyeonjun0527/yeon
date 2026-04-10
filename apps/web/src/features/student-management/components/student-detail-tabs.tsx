"use client";

import { DETAIL_TABS } from "../constants";
import type { DetailTab } from "../types";

interface StudentDetailTabsProps {
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}

export function StudentDetailTabs({
  activeTab,
  onTabChange,
}: StudentDetailTabsProps) {
  return (
    <div className="flex gap-0 border-b border-border mb-6 md:overflow-x-visible overflow-x-auto">
      {DETAIL_TABS.map((t) => (
        <button
          key={t.id}
          className={`py-3 px-5 text-sm font-medium border-none bg-transparent cursor-pointer border-b-2 transition-[color,border-color] duration-150 md:whitespace-normal whitespace-nowrap md:px-5 px-[14px]${
            activeTab === t.id
              ? " text-accent border-accent font-semibold"
              : " text-text-dim border-transparent hover:text-text-secondary"
          }`}
          onClick={() => onTabChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
