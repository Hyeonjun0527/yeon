"use client";

import { DETAIL_TABS } from "../constants";

interface TabItem {
  id: string;
  label: string;
}

interface StudentDetailTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  /** 동적 탭 목록. 미제공 시 기본 DETAIL_TABS 사용 */
  tabs?: TabItem[];
}

export function StudentDetailTabs({
  activeTab,
  onTabChange,
  tabs,
}: StudentDetailTabsProps) {
  const tabList: TabItem[] = tabs ?? DETAIL_TABS;

  return (
    <div className="flex gap-0 border-b border-border mb-6 md:overflow-x-visible overflow-x-auto">
      {tabList.map((t) => (
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
