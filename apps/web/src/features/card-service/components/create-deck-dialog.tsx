"use client";

import { useState, type FormEvent } from "react";

import { useCreateDeck } from "../hooks";

interface CreateDeckDialogProps {
  onClose: () => void;
}

export function CreateDeckDialog({ onClose }: CreateDeckDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { mutate, isPending, error } = useCreateDeck();

  const trimmedTitle = title.trim();
  const canSubmit = trimmedTitle.length > 0 && !isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    mutate(
      {
        title: trimmedTitle,
        description: description.trim() || null,
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[18px] font-semibold text-[#111]">새 덱 만들기</h2>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-[13px] text-[#666]">제목</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              autoFocus
              className="rounded-lg border border-[#e5e5e5] px-3 py-2 text-[14px] text-[#111] outline-none focus:border-[#111]"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[13px] text-[#666]">설명 (선택)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              className="resize-none rounded-lg border border-[#e5e5e5] px-3 py-2 text-[14px] text-[#111] outline-none focus:border-[#111]"
            />
          </label>
          {error ? (
            <p className="text-[13px] text-red-600">{error.message}</p>
          ) : null}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#e5e5e5] px-4 py-2 text-[14px] text-[#111] hover:bg-[#fafafa]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-[#111] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-50"
            >
              {isPending ? "생성 중..." : "만들기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
