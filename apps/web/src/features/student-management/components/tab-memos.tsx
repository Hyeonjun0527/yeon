"use client";

import type { Memo } from "../types";

interface TabMemosProps {
  memos: Memo[];
  newMemoText: string;
  setNewMemoText: (text: string) => void;
  addMemo: () => void;
  loading?: boolean;
  error?: string | null;
  isSaving?: boolean;
}

export function TabMemos({
  memos,
  newMemoText,
  setNewMemoText,
  addMemo,
  loading = false,
  error = null,
  isSaving = false,
}: TabMemosProps) {
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <textarea
          className="flex-1 py-2.5 px-[14px] border border-border rounded-lg text-sm resize-none outline-none min-h-[40px] bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border"
          placeholder="메모를 입력하세요..."
          value={newMemoText}
          onChange={(e) => setNewMemoText(e.target.value)}
          rows={2}
        />
        <button
          className="py-2 px-4 bg-accent text-white border-none rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
          onClick={addMemo}
          disabled={!newMemoText.trim() || isSaving}
        >
          {isSaving ? "저장 중..." : "추가"}
        </button>
      </div>

      {error ? (
        <div className="mb-3 text-[13px] text-error">{error}</div>
      ) : null}

      {loading ? (
        <div className="text-[14px] text-text-dim py-2">
          메모를 불러오는 중...
        </div>
      ) : null}

      {!loading && !error && memos.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: 14, padding: "8px 0" }}>
          메모가 없습니다.
        </div>
      ) : !loading && !error ? (
        <div className="flex flex-col gap-2">
          {[...memos].reverse().map((memo) => (
            <div
              key={memo.id}
              className="py-3 px-4 bg-surface-2 border border-border rounded-lg"
            >
              <div className="flex justify-between mb-1">
                <span className="text-[11px] text-text-dim font-mono">
                  {memo.date}
                </span>
                {memo.author && (
                  <span className="text-xs text-text-secondary">
                    {memo.author}
                  </span>
                )}
              </div>
              <div className="text-sm text-text-secondary">{memo.text}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
