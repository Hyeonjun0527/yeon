"use client";

import * as React from "react";

import { DETAIL_TABS } from "../constants";

const TAB_LONG_PRESS_DELAY_MS = 420;

export interface StudentDetailTabItem {
  id: string;
  label: string;
  isEditable?: boolean;
}

interface StudentDetailTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  /** 동적 탭 목록. 미제공 시 기본 DETAIL_TABS 사용 */
  tabs?: StudentDetailTabItem[];
  /** 제공 시 탭 끝에 새 탭 추가 버튼 표시 */
  onRequestAddTab?: () => void;
  /** 제공 시 커스텀 탭 우클릭/롱프레스 메뉴 활성화 */
  onRequestTabMenu?: (
    tabId: string,
    position: { x: number; y: number },
  ) => void;
}

export function StudentDetailTabs({
  activeTab,
  onTabChange,
  tabs,
  onRequestAddTab,
  onRequestTabMenu,
}: StudentDetailTabsProps) {
  const tabList: StudentDetailTabItem[] = tabs ?? DETAIL_TABS;
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const suppressClickTabIdRef = React.useRef<string | null>(null);

  const clearLongPress = React.useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => clearLongPress, [clearLongPress]);

  function handleTabClick(tabId: string) {
    if (suppressClickTabIdRef.current === tabId) {
      suppressClickTabIdRef.current = null;
      return;
    }

    onTabChange(tabId);
  }

  function startLongPress(
    tab: StudentDetailTabItem,
    event: React.TouchEvent<HTMLButtonElement>,
  ) {
    if (!tab.isEditable || !onRequestTabMenu) {
      return;
    }

    clearLongPress();
    const currentTarget = event.currentTarget;
    longPressTimerRef.current = setTimeout(() => {
      const rect = currentTarget.getBoundingClientRect();
      suppressClickTabIdRef.current = tab.id;
      onRequestTabMenu(tab.id, {
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
      clearLongPress();
    }, TAB_LONG_PRESS_DELAY_MS);
  }

  return (
    <div className="scrollbar-subtle flex items-stretch gap-0 border-b border-border mb-6 md:overflow-x-visible overflow-x-auto">
      {tabList.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            className={`py-3 px-5 text-sm font-medium border-none bg-transparent cursor-pointer border-b-2 transition-[color,border-color] duration-150 md:whitespace-normal whitespace-nowrap md:px-5 px-[14px]${
              isActive
                ? " text-accent border-accent font-semibold"
                : " text-text-dim border-transparent hover:text-text-secondary"
            }`}
            onClick={() => handleTabClick(tab.id)}
            onContextMenu={(event) => {
              if (!tab.isEditable || !onRequestTabMenu) {
                return;
              }

              event.preventDefault();
              onRequestTabMenu(tab.id, {
                x: event.clientX,
                y: event.clientY,
              });
            }}
            onTouchStart={(event) => startLongPress(tab, event)}
            onTouchEnd={clearLongPress}
            onTouchMove={clearLongPress}
            onTouchCancel={clearLongPress}
          >
            {tab.label}
          </button>
        );
      })}

      {onRequestAddTab && (
        <button
          type="button"
          className="py-3 px-4 text-sm border-none bg-transparent cursor-pointer border-b-2 border-transparent text-text-dim hover:text-text-secondary transition-colors flex-shrink-0 flex items-center"
          onClick={onRequestAddTab}
          title="새 탭 추가"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1v10M1 6h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
