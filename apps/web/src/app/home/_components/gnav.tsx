"use client";

import { useState } from "react";
import Link from "next/link";
import { SettingsIcon, LogOutIcon, RecordIcon, StudentsIcon } from "./icons";
import { useClickOutside } from "../_hooks";

type GnavProps = {
  activeMenu: "records" | "students";
};

export function Gnav({ activeMenu }: GnavProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(
    () => setShowMenu(false),
    showMenu,
  );

  return (
    <div className="hidden w-14 border-r border-border bg-bg py-4 md:flex md:flex-col md:items-center md:gap-1">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-base cursor-pointer text-text-dim mb-1"
        title="홈"
      >
        <span className="font-[Outfit,sans-serif] font-bold text-[13px] tracking-[-0.5px] bg-gradient-to-br from-accent to-cyan bg-clip-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]">
          Y
        </span>
      </div>
      <div className="mt-2">
        <Link
          href="/home"
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
        href="/home/student-management"
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
              설정
            </button>
            <form action="/api/auth/logout" method="post" className="m-0">
              <button
                type="submit"
                className="flex items-center gap-2 w-full px-3 py-2 bg-none border-none text-red text-xs font-[inherit] cursor-pointer text-left hover:bg-surface-4"
                onClick={() => {
                  setShowMenu(false);
                }}
              >
                <LogOutIcon size={14} />
                로그아웃
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
