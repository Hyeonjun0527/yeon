"use client";

import type { CounselingHistoryItem } from "../types";

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
    <div className="flex flex-col gap-2">
      {history.map((item) => {
        const meta = COUNSELING_STATUS_STYLE[item.status];
        return (
          <div
            key={item.id}
            className="flex items-center gap-3 py-3 px-4 bg-surface-2 border border-border rounded-lg text-sm transition-[border-color] duration-150 hover:border-border-light"
          >
            <span className="text-[11px] text-text-dim whitespace-nowrap font-mono">{item.date}</span>
            <div style={{ flex: 1 }}>
              <div className="font-medium text-text-secondary">{item.title}</div>
              {item.summary && (
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
                  {item.summary}
                </div>
              )}
            </div>
            <span className="text-xs py-0.5 px-2 rounded-[10px]">{item.type}</span>
            <span
              className="text-xs py-0.5 px-2 rounded-[10px]"
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
