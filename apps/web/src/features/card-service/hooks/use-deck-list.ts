"use client";

import { useQuery } from "@tanstack/react-query";
import type { CardDeckDto } from "@yeon/api-contract/card-decks";

import { listGuestDecks } from "@/lib/guest-card-service-store";

import { useIsAuthenticated } from "../auth-context";

export function cardDecksQueryKey(isAuthenticated: boolean) {
  return ["card-decks", isAuthenticated ? "server" : "guest"] as const;
}

async function fetchCardDecks(): Promise<CardDeckDto[]> {
  const res = await fetch("/api/v1/card-decks", { credentials: "include" });
  if (!res.ok) {
    throw new Error("덱 목록을 불러오지 못했습니다.");
  }
  const data = (await res.json()) as { decks: CardDeckDto[] };
  return data.decks;
}

export function useDeckList() {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: cardDecksQueryKey(isAuthenticated),
    queryFn: isAuthenticated ? fetchCardDecks : listGuestDecks,
  });
}
