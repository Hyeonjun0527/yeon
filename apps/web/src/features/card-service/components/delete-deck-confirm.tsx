"use client";

import { useState, type FormEvent } from "react";

import { useDeleteDeck } from "../hooks";

interface DeleteDeckConfirmProps {
  deckId: string;
  deckTitle: string;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteDeckConfirm({
  deckId,
  deckTitle,
  onClose,
  onDeleted,
}: DeleteDeckConfirmProps) {
  const [typed, setTyped] = useState("");
  const { mutate, isPending, error } = useDeleteDeck();

  const canSubmit = typed === deckTitle && !isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    mutate(deckId, {
      onSuccess: () => {
        onDeleted();
      },
    });
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
        <h2 className="text-[18px] font-semibold text-[#111]">덱 삭제</h2>
        <p className="mt-3 text-[14px] text-[#666]">
          이 작업은 되돌릴 수 없습니다. 덱과 카드가 모두 삭제됩니다.
        </p>
        <p className="mt-3 text-[14px] text-[#666]">
          계속하려면 덱 제목{" "}
          <span className="font-semibold text-[#111]">{deckTitle}</span>을(를)
          아래에 그대로 입력해주세요.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            className="rounded-lg border border-[#e5e5e5] px-3 py-2 text-[14px] text-[#111] outline-none focus:border-[#111]"
          />
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
              className="rounded-xl bg-red-600 px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? "삭제 중..." : "영구 삭제"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
