"use client";

import Link from "next/link";
import type { UseQueryResult } from "@tanstack/react-query";
import type {
  CardDeckDetailResponse,
  CardDeckDto,
  CardDeckItemDto,
} from "@yeon/api-contract/card-decks";

import { PlayCard, PlayControls } from "./components";
import { useDeckDetail, useDeckPlayState } from "./hooks";

type DeckPlayViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty"; deck: CardDeckDto }
  | {
      kind: "ready";
      deck: CardDeckDto;
      items: CardDeckItemDto[];
    };

function toViewState(
  query: UseQueryResult<CardDeckDetailResponse>,
): DeckPlayViewState {
  if (query.isPending) {
    return { kind: "loading" };
  }
  if (query.isError || !query.data) {
    return { kind: "error", message: "덱을 불러오지 못했습니다." };
  }
  const { deck, items } = query.data;
  if (items.length === 0) {
    return { kind: "empty", deck };
  }
  return { kind: "ready", deck, items };
}

interface DeckPlayScreenProps {
  deckId: string;
}

export function DeckPlayScreen({ deckId }: DeckPlayScreenProps) {
  const detailQuery = useDeckDetail(deckId);
  const state = toViewState(detailQuery);

  return (
    <div className="min-h-screen bg-white text-[#111]">
      <header className="border-b border-[#e5e5e5] px-6 py-3 md:px-12">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <Link
            href={`/card-service/decks/${deckId}`}
            className="text-[14px] text-[#666] no-underline hover:text-[#111]"
          >
            ← 덱으로
          </Link>
          <span className="text-[14px] font-semibold text-[#111]">
            YEON 카드 · 실행
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col items-center px-6 py-12 md:px-12">
        {state.kind === "loading" ? (
          <p className="text-[14px] text-[#888]">불러오는 중...</p>
        ) : null}

        {state.kind === "error" ? (
          <p className="text-[14px] text-red-600">{state.message}</p>
        ) : null}

        {state.kind === "empty" ? (
          <EmptyPlayScreen deck={state.deck} deckId={deckId} />
        ) : null}

        {state.kind === "ready" ? (
          <ReadyPlayBody deckTitle={state.deck.title} items={state.items} />
        ) : null}
      </main>
    </div>
  );
}

function EmptyPlayScreen({
  deck,
  deckId,
}: {
  deck: CardDeckDto;
  deckId: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <h2 className="text-[18px] font-semibold text-[#111]">{deck.title}</h2>
      <p className="mt-3 text-[14px] text-[#666]">
        아직 카드가 없습니다. 덱에 카드를 먼저 추가해주세요.
      </p>
      <Link
        href={`/card-service/decks/${deckId}`}
        className="mt-6 rounded-xl bg-[#111] px-5 py-3 text-[14px] font-semibold text-white no-underline hover:bg-[#333]"
      >
        덱으로 돌아가기
      </Link>
    </div>
  );
}

function ReadyPlayBody({
  deckTitle,
  items,
}: {
  deckTitle: string;
  items: CardDeckItemDto[];
}) {
  const play = useDeckPlayState(items);

  if (!play.currentItem) {
    return null;
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex w-full max-w-[720px] items-center justify-between">
        <h2 className="text-[16px] font-semibold text-[#111]">{deckTitle}</h2>
        <button
          type="button"
          onClick={play.handleToggleShuffle}
          className="rounded-xl border border-[#e5e5e5] px-4 py-2 text-[13px] text-[#111] hover:border-[#111]"
        >
          {play.isShuffled ? "섞기 해제" : "섞기"}
        </button>
      </div>

      <PlayCard
        frontText={play.currentItem.frontText}
        backText={play.currentItem.backText}
        isFlipped={play.isFlipped}
        onFlip={play.handleFlip}
      />

      <PlayControls
        currentIndex={play.currentIndex}
        totalCount={play.items.length}
        onPrev={play.handlePrev}
        onNext={play.handleNext}
      />

      <p className="text-[12px] text-[#888]">
        카드를 클릭하거나 Space·Enter를 눌러 뒤집을 수 있어요.
      </p>
    </div>
  );
}
