"use client";

import { useQuery } from "@tanstack/react-query";
import type { CardDeckDetailResponse } from "@yeon/api-contract/card-decks";

import { getGuestDeckDetail } from "@/lib/guest-card-service-store";

import { useIsAuthenticated } from "../auth-context";

export function cardDeckDetailQueryKey(
  isAuthenticated: boolean,
  deckId: string,
) {
  return ["card-decks", isAuthenticated ? "server" : "guest", deckId] as const;
}

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

async function fetchGuestDeckDetail(
  deckId: string,
): Promise<CardDeckDetailResponse> {
  const result = await getGuestDeckDetail(deckId);
  if (!result) {
    throw new Error("덱을 찾을 수 없습니다.");
  }
  return result;
}

export function useDeckDetail(deckId: string) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: cardDeckDetailQueryKey(isAuthenticated, deckId),
    queryFn: () =>
      isAuthenticated ? fetchCardDeckDetail(deckId) : fetchGuestDeckDetail(deckId),
    enabled: deckId.length > 0,
  });
}
