"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CardDeckDto,
  CreateCardDeckBody,
} from "@yeon/api-contract/card-decks";

import { CARD_DECKS_QUERY_KEY } from "./use-deck-list";

async function postCardDeck(body: CreateCardDeckBody): Promise<CardDeckDto> {
  const res = await fetch("/api/v1/card-decks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const fallback = "덱을 생성하지 못했습니다.";
    const text = await res.text().catch(() => "");
    try {
      const parsed = text ? (JSON.parse(text) as { message?: string }) : null;
      throw new Error(parsed?.message || fallback);
    } catch {
      throw new Error(fallback);
    }
  }
  const data = (await res.json()) as { deck: CardDeckDto };
  return data.deck;
}

export function useCreateDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postCardDeck,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CARD_DECKS_QUERY_KEY });
    },
  });
}
