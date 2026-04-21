"use client";

import { useQuery } from "@tanstack/react-query";
import type { CardDeckDetailResponse } from "@yeon/api-contract/card-decks";

export const CARD_DECK_DETAIL_QUERY_KEY = (deckId: string) =>
  ["card-decks", deckId] as const;

async function fetchCardDeckDetail(
  deckId: string,
): Promise<CardDeckDetailResponse> {
  const res = await fetch(`/api/v1/card-decks/${deckId}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("덱을 불러오지 못했습니다.");
  }
  return (await res.json()) as CardDeckDetailResponse;
}

export function useDeckDetail(deckId: string) {
  return useQuery({
    queryKey: CARD_DECK_DETAIL_QUERY_KEY(deckId),
    queryFn: () => fetchCardDeckDetail(deckId),
    enabled: deckId.length > 0,
  });
}
