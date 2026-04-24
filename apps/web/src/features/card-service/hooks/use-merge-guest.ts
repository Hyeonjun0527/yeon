"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type MergeGuestResponse,
  mergeGuestResponseSchema,
} from "@yeon/api-contract/card-deck-merge-guest";

import {
  clearGuestCardDecksByPublicIds,
  dumpGuestCardDecksForMerge,
} from "@/lib/guest-card-service-store";

import { cardDecksQueryKey } from "./use-deck-list";

const CLEAR_MAX_ATTEMPTS = 3;
const CLEAR_BACKOFF_MS = 100;

async function postMergeGuest(
  body: Awaited<ReturnType<typeof dumpGuestCardDecksForMerge>>["payload"],
): Promise<MergeGuestResponse> {
  const response = await fetch("/api/v1/card-decks/merge-guest", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    try {
      const parsed = text ? (JSON.parse(text) as { message?: string }) : null;
      throw new Error(
        parsed?.message || "덱 이관에 실패했습니다. 다시 시도해 주세요.",
      );
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("덱 이관에 실패했습니다. 다시 시도해 주세요.");
    }
  }

  const raw = (await response.json()) as unknown;
  return mergeGuestResponseSchema.parse(raw);
}

async function clearWithRetry(publicIds: string[]): Promise<void> {
  for (let attempt = 0; attempt < CLEAR_MAX_ATTEMPTS; attempt += 1) {
    try {
      await clearGuestCardDecksByPublicIds(publicIds);
      return;
    } catch (error) {
      if (attempt === CLEAR_MAX_ATTEMPTS - 1) {
        // 서버 merge 는 이미 완료됐으므로 로컬 정리 실패를 mutation 실패로 전환하지 않는다.
        console.error(
          "guest 덱 로컬 정리 최종 실패 — 새로고침 시 자동 재시도됩니다.",
          { error, attempts: CLEAR_MAX_ATTEMPTS },
        );
        return;
      }
      await new Promise<void>((resolve) =>
        setTimeout(resolve, CLEAR_BACKOFF_MS * (attempt + 1)),
      );
    }
  }
}

export function useMergeGuestDecks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<MergeGuestResponse> => {
      const { payload, deckPublicIds } = await dumpGuestCardDecksForMerge();
      const result = await postMergeGuest(payload);
      // dump 시점 snapshot 의 publicId 만 제거 — 이관 중 다른 탭이 만든 덱은 보존.
      await clearWithRetry(deckPublicIds);
      return result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: cardDecksQueryKey(true),
      });
      void queryClient.invalidateQueries({
        queryKey: cardDecksQueryKey(false),
      });
    },
  });
}
