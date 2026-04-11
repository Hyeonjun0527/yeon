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
  /** 제공 시 탭 끝에 새 탭 추가 버튼 표시 */
  onRequestAddTab?: () => void;
}

export function StudentDetailTabs({
  activeTab,
  onTabChange,
  tabs,
  onRequestAddTab,
}: StudentDetailTabsProps) {
  const tabList: TabItem[] = tabs ?? DETAIL_TABS;

  return (
    <div className="flex items-stretch gap-0 border-b border-border mb-6 md:overflow-x-visible overflow-x-auto">
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

      {onRequestAddTab && (
        <button
          className="py-3 px-4 text-sm border-none bg-transparent cursor-pointer border-b-2 border-transparent text-text-dim hover:text-text-secondary transition-colors flex-shrink-0 flex items-center"
          onClick={onRequestAddTab}
          title="새 탭 추가"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
