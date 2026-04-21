"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CardDeckItemDto,
  CreateCardDeckItemBody,
  UpdateCardDeckItemBody,
} from "@yeon/api-contract/card-decks";

import {
  cardServiceFetchJson,
  cardServiceFetchVoid,
} from "./card-service-fetch";
import { CARD_DECK_DETAIL_QUERY_KEY } from "./use-deck-detail";
import { CARD_DECKS_QUERY_KEY } from "./use-deck-list";

function invalidateDeckAndList(
  queryClient: ReturnType<typeof useQueryClient>,
  deckId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: CARD_DECK_DETAIL_QUERY_KEY(deckId),
  });
  void queryClient.invalidateQueries({ queryKey: CARD_DECKS_QUERY_KEY });
}

export function useAddCard(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateCardDeckItemBody) => {
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
    },
    onSuccess: () => invalidateDeckAndList(queryClient, deckId),
  });
}

export function useUpdateCard(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      itemId: string;
      body: UpdateCardDeckItemBody;
    }) => {
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
    },
    onSuccess: () => invalidateDeckAndList(queryClient, deckId),
  });
}

export function useDeleteCard(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      await cardServiceFetchVoid(
        `/api/v1/card-decks/${deckId}/items/${itemId}`,
        { method: "DELETE" },
        "카드를 삭제하지 못했습니다.",
      );
    },
    onSuccess: () => invalidateDeckAndList(queryClient, deckId),
  });
}
