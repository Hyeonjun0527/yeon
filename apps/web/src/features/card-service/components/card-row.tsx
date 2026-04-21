"use client";

import { useState } from "react";
import type { CardDeckItemDto } from "@yeon/api-contract/card-decks";

import { useDeleteCard, useUpdateCard } from "../hooks";

interface CardRowProps {
  deckId: string;
  item: CardDeckItemDto;
}

export function CardRow({ deckId, item }: CardRowProps) {
  const [isEditing, setEditing] = useState(false);
  const [frontText, setFrontText] = useState(item.frontText);
  const [backText, setBackText] = useState(item.backText);
  const updateMutation = useUpdateCard(deckId);
  const deleteMutation = useDeleteCard(deckId);
  const isSaving = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const canSave =
    frontText.trim().length > 0 && backText.trim().length > 0 && !isSaving;

  const handleSave = () => {
    if (!canSave) return;
    updateMutation.mutate(
      {
        itemId: item.id,
        body: {
          frontText: frontText.trim(),
          backText: backText.trim(),
        },
      },
      {
        onSuccess: () => {
          setEditing(false);
        },
      },
    );
  };

  const handleCancel = () => {
    setFrontText(item.frontText);
    setBackText(item.backText);
    setEditing(false);
  };

  const handleDelete = () => {
    if (!window.confirm("이 카드를 삭제할까요?")) {
      return;
    }
    deleteMutation.mutate(item.id);
  };

  if (isEditing) {
    return (
      <div className="rounded-xl border border-[#111] p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <textarea
            value={frontText}
            onChange={(e) => setFrontText(e.target.value)}
            maxLength={2000}
            rows={3}
            className="flex-1 resize-none rounded-lg border border-[#e5e5e5] px-3 py-2 text-[14px] text-[#111] outline-none focus:border-[#111]"
          />
          <textarea
            value={backText}
            onChange={(e) => setBackText(e.target.value)}
            maxLength={2000}
            rows={3}
            className="flex-1 resize-none rounded-lg border border-[#e5e5e5] px-3 py-2 text-[14px] text-[#111] outline-none focus:border-[#111]"
          />
        </div>
        {updateMutation.error ? (
          <p className="mt-2 text-[13px] text-red-600">
            {updateMutation.error.message}
          </p>
        ) : null}
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-[#e5e5e5] px-3 py-1.5 text-[13px] text-[#111] hover:bg-[#fafafa]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl bg-[#111] px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e5e5e5] p-4 transition-colors hover:border-[#111]">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="flex-1">
          <p className="text-[12px] font-semibold uppercase text-[#888]">
            앞면
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[14px] text-[#111]">
            {item.frontText}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-[12px] font-semibold uppercase text-[#888]">
            뒷면
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[14px] text-[#111]">
            {item.backText}
          </p>
        </div>
      </div>
      {deleteMutation.error ? (
        <p className="mt-2 text-[13px] text-red-600">
          {deleteMutation.error.message}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-xl border border-[#e5e5e5] px-3 py-1.5 text-[13px] text-[#111] hover:bg-[#fafafa]"
        >
          편집
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-xl border border-[#e5e5e5] px-3 py-1.5 text-[13px] text-red-600 hover:bg-[#fff5f5] disabled:opacity-50"
        >
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
    </div>
  );
}
