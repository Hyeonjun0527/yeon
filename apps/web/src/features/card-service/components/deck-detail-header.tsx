"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { CardDeckDto } from "@yeon/api-contract/card-decks";

import { useUpdateDeck } from "../hooks";

interface DeckDetailHeaderProps {
  deck: CardDeckDto;
  onOpenDelete: () => void;
}

export function DeckDetailHeader({
  deck,
  onOpenDelete,
}: DeckDetailHeaderProps) {
  const [isEditing, setEditing] = useState(false);
  const [title, setTitle] = useState(deck.title);
  const [description, setDescription] = useState(deck.description ?? "");
  const updateMutation = useUpdateDeck(deck.id);
  const isSaving = updateMutation.isPending;

  const canSave = title.trim().length > 0 && !isSaving;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    updateMutation.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
      },
      {
        onSuccess: () => {
          setEditing(false);
        },
      },
    );
  };

  const handleCancel = () => {
    setTitle(deck.title);
    setDescription(deck.description ?? "");
    setEditing(false);
  };

  return (
    <section className="rounded-xl border border-[#e5e5e5] p-6">
      <div className="flex items-start justify-between gap-4">
        <Link
          href="/card-service"
          className="text-[13px] text-[#666] no-underline hover:text-[#111]"
        >
          ← 내 덱
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/card-service/decks/${deck.id}/play`}
            className="rounded-xl bg-[#111] px-4 py-2 text-[13px] font-semibold text-white no-underline transition-colors hover:bg-[#333]"
          >
            실행
          </Link>
          <button
            type="button"
            onClick={onOpenDelete}
            className="rounded-xl border border-[#e5e5e5] px-4 py-2 text-[13px] text-red-600 hover:bg-[#fff5f5]"
          >
            삭제
          </button>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            autoFocus
            className="rounded-lg border border-[#e5e5e5] px-3 py-2 text-[16px] font-semibold text-[#111] outline-none focus:border-[#111]"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="설명 (선택)"
            className="resize-none rounded-lg border border-[#e5e5e5] px-3 py-2 text-[14px] text-[#111] outline-none focus:border-[#111]"
          />
          {updateMutation.error ? (
            <p className="text-[13px] text-red-600">
              {updateMutation.error.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-[#e5e5e5] px-3 py-1.5 text-[13px] text-[#111] hover:bg-[#fafafa]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="rounded-xl bg-[#111] px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-4 block w-full rounded-lg text-left hover:bg-[#fafafa]"
        >
          <h1 className="text-[22px] font-semibold text-[#111]">
            {deck.title}
          </h1>
          {deck.description ? (
            <p className="mt-2 whitespace-pre-wrap text-[14px] text-[#666]">
              {deck.description}
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-[#aaa]">
              설명 없음 (클릭해서 추가)
            </p>
          )}
          <p className="mt-3 text-[12px] text-[#888]">
            카드 {deck.itemCount}장
          </p>
        </button>
      )}
    </section>
  );
}
