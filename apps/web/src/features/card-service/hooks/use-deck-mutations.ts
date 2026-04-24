"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CardDeckDto,
  UpdateCardDeckBody,
} from "@yeon/api-contract/card-decks";

import {
  deleteGuestDeck,
  updateGuestDeck,
} from "@/lib/guest-card-service-store";

import { useIsAuthenticated } from "../auth-context";
import {
  cardServiceFetchJson,
  cardServiceFetchVoid,
} from "./card-service-fetch";
import { cardDeckDetailQueryKey } from "./use-deck-detail";
import { cardDecksQueryKey } from "./use-deck-list";

export function useUpdateDeck(deckId: string) {
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  return useMutation({
    mutationFn: async (body: UpdateCardDeckBody) => {
      if (isAuthenticated) {
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
      }
      return updateGuestDeck(deckId, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: cardDecksQueryKey(isAuthenticated),
      });
      void queryClient.invalidateQueries({
        queryKey: cardDeckDetailQueryKey(isAuthenticated, deckId),
      });
    },
  });
}

export function useDeleteDeck() {
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  return useMutation({
    mutationFn: async (deckId: string) => {
      if (isAuthenticated) {
        await cardServiceFetchVoid(
          `/api/v1/card-decks/${deckId}`,
          { method: "DELETE" },
          "덱을 삭제하지 못했습니다.",
        );
        return;
      }
      await deleteGuestDeck(deckId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: cardDecksQueryKey(isAuthenticated),
      });
    },
  });
}
