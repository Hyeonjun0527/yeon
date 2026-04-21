"use client";

import { useQuery } from "@tanstack/react-query";
import type { CardDeckDto } from "@yeon/api-contract/card-decks";

export const CARD_DECKS_QUERY_KEY = ["card-decks"] as const;

async function fetchCardDecks(): Promise<CardDeckDto[]> {
  const res = await fetch("/api/v1/card-decks", { credentials: "include" });
  if (!res.ok) {
    throw new Error("덱 목록을 불러오지 못했습니다.");
  }
  const data = (await res.json()) as { decks: CardDeckDto[] };
  return data.decks;
}

export function useDeckList() {
  return useQuery({
    queryKey: CARD_DECKS_QUERY_KEY,
    queryFn: fetchCardDecks,
  });
}
