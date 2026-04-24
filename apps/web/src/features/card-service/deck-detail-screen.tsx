"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { CardDeckDetailResponse } from "@yeon/api-contract/card-decks";

import {
  AddCardForm,
  CardRow,
  DeckDetailHeader,
  DeleteDeckConfirm,
} from "./components";
import { useDeckDetail } from "./hooks";
import type { DeckDetailViewState } from "./types";

function toViewState(
  query: UseQueryResult<CardDeckDetailResponse>,
): DeckDetailViewState {
  if (query.isPending) {
    return { kind: "loading" };
  }
  if (query.isError || !query.data) {
    return { kind: "error", message: "덱을 불러오지 못했습니다." };
  }
  const items = query.data.items;
  return {
    kind: "ready",
    deck: query.data.deck,
    items,
    isEmpty: items.length === 0,
  };
}

interface DeckDetailScreenProps {
  deckId: string;
}

export function DeckDetailScreen({ deckId }: DeckDetailScreenProps) {
  const router = useRouter();
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const detailQuery = useDeckDetail(deckId);
  const state = toViewState(detailQuery);

  return (
    <div className="min-h-screen bg-white text-[#111]">
      <header className="border-b border-[#e5e5e5] px-6 py-3 md:px-12">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <span className="text-[14px] font-semibold text-[#111]">
            YEON 카드
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 py-10 md:px-12">
        {state.kind === "loading" ? (
          <p className="text-[14px] text-[#888]">불러오는 중...</p>
        ) : null}

        {state.kind === "error" ? (
          <p className="text-[14px] text-red-600">{state.message}</p>
        ) : null}

        {state.kind === "ready" ? (
          <>
            <DeckDetailHeader
              deck={state.deck}
              onOpenDelete={() => setDeleteOpen(true)}
            />

            <AddCardForm deckId={state.deck.id} />

            <section className="flex flex-col gap-3">
              <h2 className="text-[16px] font-semibold text-[#111]">
                카드 {state.items.length}장
              </h2>
              {state.isEmpty ? (
                <p className="rounded-xl border border-dashed border-[#e5e5e5] p-8 text-center text-[14px] text-[#888]">
                  위 폼에서 첫 카드를 추가해주세요.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {state.items.map((item) => (
                    <li key={item.id}>
                      <CardRow deckId={state.deck.id} item={item} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {isDeleteOpen ? (
              <DeleteDeckConfirm
                deckId={state.deck.id}
                deckTitle={state.deck.title}
                onClose={() => setDeleteOpen(false)}
                onDeleted={() => {
                  router.push("/card-service");
                }}
              />
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
