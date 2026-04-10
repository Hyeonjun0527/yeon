"use client";

import { useState } from "react";
import type { RecordItem } from "../_lib/types";
import { useClickOutside } from "../_hooks";

export interface SidebarProps {
  records: RecordItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStartRecording: () => void;
  onFileUpload: () => void;
}

export function Sidebar({
  records,
  selectedId,
  onSelect,
  onStartRecording,
  onFileUpload,
}: SidebarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setShowMenu(false), showMenu);

  return (
    <div className="w-60 border-r border-border flex flex-col bg-surface">
      {/* 헤더 */}
      <div className="px-4 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-[13px] font-semibold">상담 기록</h2>
        <div className="relative" ref={menuRef}>
          <button
            className="bg-accent text-white border-none px-3 py-[6px] rounded-sm text-[11px] font-medium cursor-pointer font-[inherit]"
            onClick={() => setShowMenu((p) => !p)}
          >
            + 새 녹음
          </button>
          {showMenu && (
            <div className="absolute top-[calc(100%+4px)] right-0 bg-surface-3 border border-border-light rounded-sm py-1 min-w-[140px] z-50 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
              <button
                className="flex items-center gap-2 w-full px-3 py-2 bg-none border-none text-text text-xs font-[inherit] cursor-pointer text-left hover:bg-surface-4"
                onClick={() => {
                  setShowMenu(false);
                  onStartRecording();
                }}
              >
                🎙 바로 녹음
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 bg-none border-none text-text text-xs font-[inherit] cursor-pointer text-left hover:bg-surface-4"
                onClick={() => {
                  setShowMenu(false);
                  onFileUpload();
                }}
              >
                📁 파일 업로드
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 검색 */}
      <input
        className="mx-3 my-2 bg-surface-3 border border-border rounded-sm py-[7px] px-[10px] text-text text-xs outline-none font-[inherit] w-[calc(100%-24px)] placeholder:text-text-dim"
        placeholder="수강생, 제목 검색..."
        readOnly
      />

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto py-1 px-2">
        {records.map((rec) => (
          <div
            key={rec.id}
            className={`px-3 py-[10px] rounded-lg cursor-pointer mb-0.5 transition-colors duration-100 ${
              rec.id === selectedId
                ? "bg-surface-3 border border-border-light"
                : "hover:bg-surface-3"
            }`}
            onClick={() => onSelect(rec.id)}
          >
            <div className="flex justify-between items-center gap-2">
              <span className="font-medium text-sm overflow-hidden whitespace-nowrap text-ellipsis min-w-0">
                {rec.title}
              </span>
              <span
                className={`inline-flex items-center gap-[3px] text-[10px] px-[6px] py-[1px] rounded flex-shrink-0 whitespace-nowrap ${
                  rec.status === "ready"
                    ? "bg-green-dim text-green"
                    : "bg-amber-dim text-amber"
                }`}
              >
                {rec.status === "ready" ? "✓ 완료" : "● 전사 중"}
              </span>
            </div>
            <div className="text-xs text-text-dim mt-1">
              {rec.meta || rec.duration}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
