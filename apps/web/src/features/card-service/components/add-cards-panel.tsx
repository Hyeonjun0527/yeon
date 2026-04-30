"use client";

import { useState } from "react";

import { AddCardForm } from "./add-card-form";
import { BulkAddCardsForm } from "./bulk-add-cards-form";

const ADD_CARD_MODES = {
  manual: "manual",
  bulk: "bulk",
} as const;

type AddCardMode = (typeof ADD_CARD_MODES)[keyof typeof ADD_CARD_MODES];

interface AddCardsPanelProps {
  deckId: string;
}

export function AddCardsPanel({ deckId }: AddCardsPanelProps) {
  const [mode, setMode] = useState<AddCardMode>(ADD_CARD_MODES.manual);

  return (
    <section className="rounded-xl border border-[#e5e5e5] p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-[#111]">
            새 카드 추가
          </h3>
          <p className="mt-1 text-[13px] text-[#666]">
            한 장씩 직접 입력하거나 AI가 만든 형식을 붙여넣어 여러 장을 한 번에
            추가할 수 있습니다.
          </p>
        </div>
        <div className="flex rounded-xl bg-[#f3f3f3] p-1 text-[13px] font-semibold">
          <button
            type="button"
            onClick={() => setMode(ADD_CARD_MODES.manual)}
            className={`rounded-lg px-3 py-2 transition-colors ${
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
            className={`rounded-lg px-3 py-2 transition-colors ${
              mode === ADD_CARD_MODES.bulk
                ? "bg-white text-[#111] shadow-sm"
                : "text-[#666] hover:text-[#111]"
            }`}
          >
            AI 형식 붙여넣기
          </button>
        </div>
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
