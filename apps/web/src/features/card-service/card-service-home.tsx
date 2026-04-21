"use client";

import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { CardDeckDto } from "@yeon/api-contract/card-decks";

import { CreateDeckDialog, DeckList, EmptyDecksScreen } from "./components";
import { useDeckList } from "./hooks";
import type { CardServiceHomeViewState } from "./types";

function toViewState(
  query: UseQueryResult<CardDeckDto[]>,
): CardServiceHomeViewState {
  if (query.isPending) {
    return { kind: "loading" };
  }
  if (query.isError) {
    return { kind: "error", message: "덱 목록을 불러오지 못했습니다." };
  }
  if (!query.data || query.data.length === 0) {
    return { kind: "empty" };
  }
  return { kind: "ready", decks: query.data };
}

export function CardServiceHome() {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const decksQuery = useDeckList();
  const state = toViewState(decksQuery);

  return (
    <div className="min-h-screen bg-white text-[#111]">
      <header className="border-b border-[#e5e5e5] px-6 py-3 md:px-12">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <span className="text-[14px] font-semibold text-[#111]">
            YEON 카드
          </span>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-xl bg-[#111] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#333]"
          >
            + 새 덱
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-12 md:px-12">
        <h1 className="text-[22px] font-semibold text-[#111]">내 덱</h1>
        <div className="mt-6">
          {state.kind === "loading" ? (
            <p className="text-[14px] text-[#888]">불러오는 중...</p>
          ) : null}
          {state.kind === "error" ? (
            <p className="text-[14px] text-red-600">{state.message}</p>
          ) : null}
          {state.kind === "empty" ? (
            <EmptyDecksScreen onCreate={() => setCreateOpen(true)} />
          ) : null}
          {state.kind === "ready" ? <DeckList decks={state.decks} /> : null}
        </div>
      </main>

      {isCreateOpen ? (
        <CreateDeckDialog onClose={() => setCreateOpen(false)} />
      ) : null}
    </div>
  );
}
