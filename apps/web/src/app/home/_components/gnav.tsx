"use client";

import { useState } from "react";
import Link from "next/link";
import { SettingsIcon, LogOutIcon, RecordIcon, StudentsIcon } from "./icons";
import { useHomeSidebarLayout } from "./home-sidebar-layout-context";
import { useClickOutside } from "../_hooks";
import { useLogout } from "@/lib/use-logout";
import { useAppRoute } from "@/lib/app-route-context";

type GnavProps = {
  activeMenu: "records" | "students";
};

export function Gnav({ activeMenu }: GnavProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { logout, isLoggingOut } = useLogout();
  const { resolveAppHref } = useAppRoute();
  const {
    sidebarCollapsed,
    toggleSidebarCollapsed,
    studentSidebarCollapsed,
    toggleStudentSidebarCollapsed,
    recordsSidebarToggleVisible,
    studentSidebarToggleVisible,
  } = useHomeSidebarLayout();
  const menuRef = useClickOutside<HTMLDivElement>(
    () => setShowMenu(false),
    showMenu,
  );
  const isStudentsMenu = activeMenu === "students";
  const isCurrentSidebarCollapsed = isStudentsMenu
    ? studentSidebarCollapsed
    : sidebarCollapsed;
  const canToggleCurrentSidebar = isStudentsMenu
    ? studentSidebarToggleVisible
    : recordsSidebarToggleVisible;
  const handleToggleSidebar = isStudentsMenu
    ? toggleStudentSidebarCollapsed
    : toggleSidebarCollapsed;

  return (
    <div className="hidden w-14 border-r border-border bg-bg py-4 md:flex md:flex-col md:items-center md:gap-1">
      {canToggleCurrentSidebar ? (
        <button
          type="button"
          className={`mb-1 flex h-9 w-9 items-center justify-center rounded-lg border transition-colors duration-150 ${
            isCurrentSidebarCollapsed
              ? "border-border bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text"
              : "border-transparent bg-transparent text-text-dim hover:bg-surface-3 hover:text-text-secondary"
          }`}
          onClick={handleToggleSidebar}
          title={isCurrentSidebarCollapsed ? "목록 펼치기" : "목록 접기"}
          aria-label={isCurrentSidebarCollapsed ? "목록 펼치기" : "목록 접기"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-150 ${
              isCurrentSidebarCollapsed ? "" : "rotate-180"
            }`}
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      ) : null}
      <div className="mt-2">
        <Link
          href={resolveAppHref("/home")}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-base cursor-pointer transition-all duration-150 no-underline ${
            activeMenu === "records"
              ? "bg-accent-dim text-accent"
              : "text-text-dim hover:bg-surface-3 hover:text-text-secondary"
          }`}
          title="상담 기록"
        >
          <RecordIcon size={16} />
        </Link>
      </div>
      <Link
        href={resolveAppHref("/home/student-management")}
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-base cursor-pointer transition-all duration-150 no-underline ${
          activeMenu === "students"
            ? "bg-accent-dim text-accent"
            : "text-text-dim hover:bg-surface-3 hover:text-text-secondary"
        }`}
        title="수강생 관리"
      >
        <StudentsIcon size={16} />
      </Link>

      <div className="flex-1" />

      <div ref={menuRef} className="relative">
        <button
          onClick={() => setShowMenu((p) => !p)}
          className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-cyan text-[11px] text-white font-semibold flex items-center justify-center cursor-pointer border-none"
          title="프로필"
        >
          최
        </button>
        {showMenu && (
          <div
            className="absolute bg-surface-3 border border-border-light rounded-sm py-1 min-w-[140px] z-50 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
            style={{
              bottom: "calc(100% + 8px)",
              top: "auto",
              left: "calc(100% + 8px)",
              right: "auto",
            }}
          >
            <button className="flex items-center gap-2 w-full px-3 py-2 bg-none border-none text-text text-xs font-[inherit] cursor-pointer text-left hover:bg-surface-4">
              <SettingsIcon size={14} />
              설정(추후기능)
            </button>
            <button
              type="button"
              className="flex items-center gap-2 w-full px-3 py-2 bg-none border-none text-red text-xs font-[inherit] cursor-pointer text-left hover:bg-surface-4 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                setShowMenu(false);
                void logout();
              }}
              disabled={isLoggingOut}
            >
              <LogOutIcon size={14} />
              {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
