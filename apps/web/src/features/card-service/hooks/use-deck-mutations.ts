"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CardDeckDto,
  UpdateCardDeckBody,
} from "@yeon/api-contract/card-decks";

import {
  cardServiceFetchJson,
  cardServiceFetchVoid,
} from "./card-service-fetch";
import { CARD_DECK_DETAIL_QUERY_KEY } from "./use-deck-detail";
import { CARD_DECKS_QUERY_KEY } from "./use-deck-list";

export function useUpdateDeck(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateCardDeckBody) => {
      const data = await cardServiceFetchJson<{ deck: CardDeckDto }>(
        `/api/v1/card-decks/${deckId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
        "덱을 수정하지 못했습니다.",
      );
      return data.deck;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CARD_DECKS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: CARD_DECK_DETAIL_QUERY_KEY(deckId),
      });
    },
  });
}

export function useDeleteDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deckId: string) => {
      await cardServiceFetchVoid(
        `/api/v1/card-decks/${deckId}`,
        { method: "DELETE" },
        "덱을 삭제하지 못했습니다.",
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CARD_DECKS_QUERY_KEY });
    },
  });
}
