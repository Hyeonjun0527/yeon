"use client";

import { useLayoutEffect, useRef } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [newMemoText]);

  return (
    <div>
      <div className="mb-3">
        <div className="flex min-w-0 items-end rounded-lg border border-border bg-surface-2 px-3 py-2 transition-colors focus-within:border-accent-border">
          <textarea
            ref={textareaRef}
            className="w-full resize-none overflow-hidden border-none bg-transparent p-0 text-[13px] leading-[1.45] text-text outline-none placeholder:text-text-dim"
            placeholder="메모를 입력하세요..."
            value={newMemoText}
            onChange={(e) => setNewMemoText(e.target.value)}
            rows={1}
          />
        </div>
        <div className="mt-2 flex justify-end">
          <button
            className="h-9 rounded-lg border-none bg-accent px-3.5 text-[13px] font-semibold text-white cursor-pointer whitespace-nowrap transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
            onClick={addMemo}
            disabled={!newMemoText.trim() || isSaving}
          >
            {isSaving ? "저장 중..." : "추가"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-2 text-[12px] text-error">{error}</div>
      ) : null}

      {loading ? (
        <div className="py-1.5 text-[13px] text-text-dim">
          메모를 불러오는 중...
        </div>
      ) : null}

      {!loading && !error && memos.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {[...memos].reverse().map((memo) => (
            <div
              key={memo.id}
              className="rounded-md border border-border bg-surface-2 px-3 py-2"
            >
              <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-dim">
                <span className="font-mono tabular-nums text-text-dim">
                  {memo.date}
                </span>
                {memo.author && (
                  <span className="text-[11px] text-text-secondary">
                    {memo.author}
                  </span>
                )}
              </div>
              <div className="whitespace-pre-wrap text-[13px] leading-[1.5] text-text-secondary">
                {memo.text}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
