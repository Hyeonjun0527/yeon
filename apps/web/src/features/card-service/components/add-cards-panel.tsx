"use client";

import { useEffect, useState } from "react";
import type { CardDeckItemDto } from "@yeon/api-contract/card-decks";

import { useUpdateCard } from "../hooks";
import { AddCardForm } from "./add-card-form";
import { BulkAddCardsForm } from "./bulk-add-cards-form";

const ADD_CARD_MODES = {
  manual: "manual",
  bulk: "bulk",
} as const;

type AddCardMode = (typeof ADD_CARD_MODES)[keyof typeof ADD_CARD_MODES];

interface AddCardsPanelProps {
  deckId: string;
  editingItem?: CardDeckItemDto | null;
  onCancelEdit?: () => void;
  onSavedEdit?: () => void;
  surface?: "panel" | "sheet";
}

export function AddCardsPanel({
  deckId,
  editingItem,
  onCancelEdit,
  onSavedEdit,
  surface = "panel",
}: AddCardsPanelProps) {
  const [mode, setMode] = useState<AddCardMode>(() =>
    surface === "sheet" ? ADD_CARD_MODES.manual : ADD_CARD_MODES.bulk,
  );

  if (editingItem) {
    return (
      <EditCardPanel
        deckId={deckId}
        item={editingItem}
        onCancel={onCancelEdit}
        onSaved={onSavedEdit}
        surface={surface}
      />
    );
  }

  const isSheet = surface === "sheet";

  return (
    <section
      className={
        isSheet
          ? "bg-white text-[#111]"
          : "rounded-xl border border-[#e5e5e5] bg-white p-5 text-[#111]"
      }
    >
      <div>
        <h3 className="text-[18px] font-semibold text-[#111]">새 카드 추가</h3>
        <p className="mt-2 text-[13px] leading-5 text-[#666]">
          새로운 카드를 직접 입력하거나 AI 형식으로 붙여넣어 추가하세요.
        </p>
      </div>

      <div className="mt-5 flex rounded-xl bg-[#f3f3f3] p-1 text-[13px] font-semibold">
        <button
          type="button"
          onClick={() => setMode(ADD_CARD_MODES.manual)}
          className={`flex-1 rounded-lg px-3 py-2 transition-colors ${
            mode === ADD_CARD_MODES.manual
              ? "bg-white text-[#111] shadow-sm"
              : "text-[#666] hover:text-[#111]"
          }`}
        >
          직접 입력
        </button>
        <button
          type="button"
          onClick={() => setMode(ADD_CARD_MODES.bulk)}
          className={`flex-1 rounded-lg px-3 py-2 transition-colors ${
            mode === ADD_CARD_MODES.bulk
              ? "bg-white text-[#111] shadow-sm"
              : "text-[#666] hover:text-[#111]"
          }`}
        >
          AI 형식 붙여넣기
        </button>
      </div>

      <div className="mt-5">
        {mode === ADD_CARD_MODES.manual ? (
          <AddCardForm deckId={deckId} />
        ) : (
          <BulkAddCardsForm deckId={deckId} />
        )}
      </div>
    </section>
  );
}

interface EditCardPanelProps {
  deckId: string;
  item: CardDeckItemDto;
  onCancel?: () => void;
  onSaved?: () => void;
  surface?: "panel" | "sheet";
}

function EditCardPanel({
  deckId,
  item,
  onCancel,
  onSaved,
  surface = "panel",
}: EditCardPanelProps) {
  const [frontText, setFrontText] = useState(item.frontText);
  const [backText, setBackText] = useState(item.backText);
  const updateMutation = useUpdateCard(deckId);
  const isSaving = updateMutation.isPending;
  const canSave =
    frontText.trim().length > 0 && backText.trim().length > 0 && !isSaving;

  useEffect(() => {
    setFrontText(item.frontText);
    setBackText(item.backText);
  }, [item.backText, item.frontText, item.id]);

  function handleSave() {
    if (!canSave) {
      return;
    }

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
          onSaved?.();
        },
      },
    );
  }

  const isSheet = surface === "sheet";

  return (
    <section
      className={
        isSheet
          ? "bg-white text-[#111]"
          : "rounded-xl border border-[#111] bg-white p-5 text-[#111]"
      }
    >
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#888]">
          선택한 카드
        </p>
        <h3 className="mt-1 text-[18px] font-semibold text-[#111]">
          카드 편집
        </h3>
        <p className="mt-2 text-[13px] leading-5 text-[#666]">
          왼쪽 카드 목록에서 선택한 카드를 수정합니다.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-[#111]">질문</span>
          <textarea
            value={frontText}
            onChange={(event) => setFrontText(event.target.value)}
            maxLength={2000}
            rows={5}
            className="min-h-[130px] resize-y rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-[14px] leading-6 text-[#111] outline-none focus:border-[#111]"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-[#111]">답변</span>
          <textarea
            value={backText}
            onChange={(event) => setBackText(event.target.value)}
            maxLength={2000}
            rows={7}
            className="min-h-[180px] resize-y rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-[14px] leading-6 text-[#111] outline-none focus:border-[#111]"
          />
        </label>
        {updateMutation.error ? (
          <p className="text-[13px] text-red-600">
            {updateMutation.error.message}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#e5e5e5] px-4 py-2 text-[13px] font-semibold text-[#111] transition-colors hover:border-[#111] hover:bg-[#fafafa]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl bg-[#111] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "수정 저장"}
          </button>
        </div>
      </div>
    </section>
  );
}
