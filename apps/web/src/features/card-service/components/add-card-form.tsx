"use client";

import { useState, type FormEvent } from "react";

import { useAddCard } from "../hooks";

interface AddCardFormProps {
  deckId: string;
}

export function AddCardForm({ deckId }: AddCardFormProps) {
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const { mutate, isPending, error } = useAddCard(deckId);

  const canSubmit =
    frontText.trim().length > 0 && backText.trim().length > 0 && !isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    mutate(
      {
        frontText: frontText.trim(),
        backText: backText.trim(),
      },
      {
        onSuccess: () => {
          setFrontText("");
          setBackText("");
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[#e5e5e5] p-5"
    >
      <h3 className="text-[14px] font-semibold text-[#111]">새 카드 추가</h3>
      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <label className="flex flex-1 flex-col gap-2">
          <span className="text-[13px] text-[#666]">앞면 (질문)</span>
          <textarea
            value={frontText}
            onChange={(e) => setFrontText(e.target.value)}
            maxLength={2000}
            rows={3}
            className="resize-none rounded-lg border border-[#e5e5e5] px-3 py-2 text-[14px] text-[#111] outline-none focus:border-[#111]"
          />
        </label>
        <label className="flex flex-1 flex-col gap-2">
          <span className="text-[13px] text-[#666]">뒷면 (답변)</span>
          <textarea
            value={backText}
            onChange={(e) => setBackText(e.target.value)}
            maxLength={2000}
            rows={3}
            className="resize-none rounded-lg border border-[#e5e5e5] px-3 py-2 text-[14px] text-[#111] outline-none focus:border-[#111]"
          />
        </label>
      </div>
      {error ? (
        <p className="mt-3 text-[13px] text-red-600">{error.message}</p>
      ) : null}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-[#111] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-50"
        >
          {isPending ? "추가 중..." : "카드 추가"}
        </button>
      </div>
    </form>
  );
}
