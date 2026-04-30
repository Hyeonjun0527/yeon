"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CardDeckItemDto,
  CreateCardDeckItemBody,
  CreateCardDeckItemsBody,
  UpdateCardDeckItemBody,
} from "@yeon/api-contract/card-decks";

import {
  addGuestCard,
  addGuestCards,
  deleteGuestCard,
  updateGuestCard,
} from "@/lib/guest-card-service-store";

import { useIsAuthenticated } from "../auth-context";
import {
  cardServiceFetchJson,
  cardServiceFetchVoid,
} from "./card-service-fetch";
import { cardDeckDetailQueryKey } from "./use-deck-detail";
import { cardDecksQueryKey } from "./use-deck-list";

function invalidateDeckAndList(
  queryClient: ReturnType<typeof useQueryClient>,
  isAuthenticated: boolean,
  deckId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: cardDeckDetailQueryKey(isAuthenticated, deckId),
  });
  void queryClient.invalidateQueries({
    queryKey: cardDecksQueryKey(isAuthenticated),
  });
}

export function useAddCard(deckId: string) {
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  return useMutation({
    mutationFn: async (body: CreateCardDeckItemBody) => {
      if (isAuthenticated) {
        const data = await cardServiceFetchJson<{ item: CardDeckItemDto }>(
          `/api/v1/card-decks/${deckId}/items`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          },
          "카드를 추가하지 못했습니다.",
        );
        return data.item;
      }
      return addGuestCard(deckId, body);
    },
    onSuccess: () =>
      invalidateDeckAndList(queryClient, isAuthenticated, deckId),
  });
}

export function useAddCards(deckId: string) {
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  return useMutation({
    mutationFn: async (body: CreateCardDeckItemsBody) => {
      if (isAuthenticated) {
        const data = await cardServiceFetchJson<{ items: CardDeckItemDto[] }>(
          `/api/v1/card-decks/${deckId}/items/bulk`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          },
          "카드를 일괄 추가하지 못했습니다.",
        );
        return data.items;
      }
      return addGuestCards(deckId, body);
    },
    onSuccess: () =>
      invalidateDeckAndList(queryClient, isAuthenticated, deckId),
  });
}

export function useUpdateCard(deckId: string) {
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  return useMutation({
    mutationFn: async (params: {
      itemId: string;
      body: UpdateCardDeckItemBody;
    }) => {
      if (isAuthenticated) {
        const data = await cardServiceFetchJson<{ item: CardDeckItemDto }>(
          `/api/v1/card-decks/${deckId}/items/${params.itemId}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(params.body),
          },
          "카드를 수정하지 못했습니다.",
        );
        return data.item;
      }
      return updateGuestCard(params.itemId, params.body);
    },
    onSuccess: () =>
      invalidateDeckAndList(queryClient, isAuthenticated, deckId),
  });
}

export function useDeleteCard(deckId: string) {
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  return useMutation({
    mutationFn: async (itemId: string) => {
      if (isAuthenticated) {
        await cardServiceFetchVoid(
          `/api/v1/card-decks/${deckId}/items/${itemId}`,
          { method: "DELETE" },
          "카드를 삭제하지 못했습니다.",
        );
        return;
      }
      await deleteGuestCard(itemId);
    },
    onSuccess: () =>
      invalidateDeckAndList(queryClient, isAuthenticated, deckId),
  });
}
