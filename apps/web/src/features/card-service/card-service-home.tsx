"use client";

import { useCallback, useEffect, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { CardDeckDto } from "@yeon/api-contract/card-decks";

import { countGuestCardDecks } from "@/lib/guest-card-service-store";

import { useIsAuthenticated } from "./auth-context";
import {
  CardServiceSettingsDialog,
  CreateDeckDialog,
  DeckList,
  EmptyDecksScreen,
  MergeGuestDialog,
} from "./components";
import { useDeckList } from "./hooks";
import type { CardServiceHomeViewState } from "./types";

function toViewState(
  query: UseQueryResult<CardDeckDto[]>,
): CardServiceHomeViewState {
  if (query.isPending) {
    return { kind: "loading" };
  }
  if (query.isError) {
    return { kind: "error", message: "덱 목록을 불러오지 못했습니다." };
  }
  if (!query.data || query.data.length === 0) {
    return { kind: "empty" };
  }
  return { kind: "ready", decks: query.data };
}

export function CardServiceHome() {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [guestDeckCount, setGuestDeckCount] = useState<number | null>(null);
  const [isMergeDialogOpen, setMergeDialogOpen] = useState(false);
  const isAuthenticated = useIsAuthenticated();
  const decksQuery = useDeckList();
  const state = toViewState(decksQuery);

  const refreshGuestDeckCount = useCallback(async () => {
    try {
      const count = await countGuestCardDecks();
      return count;
    } catch (error) {
      console.error("guest 덱 개수를 확인하지 못했습니다.", error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setGuestDeckCount(null);
      setMergeDialogOpen(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const count = await refreshGuestDeckCount();
      if (cancelled) {
        return;
      }
      setGuestDeckCount(count);
      if (count !== null && count > 0) {
        setMergeDialogOpen(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, refreshGuestDeckCount]);

  async function handleMergeDialogClose() {
    setMergeDialogOpen(false);
    const count = await refreshGuestDeckCount();
    setGuestDeckCount(count);
  }

  const showManualMergeButton =
    isAuthenticated &&
    !isMergeDialogOpen &&
    guestDeckCount !== null &&
    guestDeckCount > 0;

  return (
    <div className="min-h-screen bg-white text-[#111]">
      <header className="border-b border-[#e5e5e5] px-6 py-3 md:px-12">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <span className="text-[14px] font-semibold text-[#111]">
            YEON 카드
          </span>
          <div className="flex items-center gap-2">
            {showManualMergeButton ? (
              <button
                type="button"
                onClick={() => setMergeDialogOpen(true)}
                className="rounded-xl border border-[rgba(17,19,24,0.12)] bg-[rgba(232,99,10,0.08)] px-3 py-2 text-[12px] font-semibold text-[#a3430a] transition-colors hover:bg-[rgba(232,99,10,0.16)]"
              >
                게스트 덱 {guestDeckCount}개 계정에 추가
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-xl bg-[#111] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#333]"
            >
              + 새 덱
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-xl border border-[#e5e5e5] px-4 py-2 text-[13px] font-semibold text-[#111] transition-colors hover:border-[#111] hover:bg-[#fafafa]"
            >
              설정
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-12 md:px-12">
        <h1 className="text-[22px] font-semibold text-[#111]">
          {isAuthenticated ? "내 덱" : "로그인 없이 만드는 덱"}
        </h1>
        {!isAuthenticated ? (
          <p className="mt-2 text-[13px] leading-[1.6] text-[#666]">
            지금 만든 덱은 이 기기에만 저장됩니다. 로그인하면 기기 간
            동기화되며, 로그인 직후 계정으로 옮길 수 있어요.
          </p>
        ) : null}
        <div className="mt-6">
          {state.kind === "loading" ? (
            <p className="text-[14px] text-[#888]">불러오는 중...</p>
          ) : null}
          {state.kind === "error" ? (
            <p className="text-[14px] text-red-600">{state.message}</p>
          ) : null}
          {state.kind === "empty" ? (
            <EmptyDecksScreen onCreate={() => setCreateOpen(true)} />
          ) : null}
          {state.kind === "ready" ? <DeckList decks={state.decks} /> : null}
        </div>
      </main>

      {isCreateOpen ? (
        <CreateDeckDialog onClose={() => setCreateOpen(false)} />
      ) : null}

      {isSettingsOpen ? (
        <CardServiceSettingsDialog onClose={() => setSettingsOpen(false)} />
      ) : null}

      {isMergeDialogOpen && guestDeckCount !== null && guestDeckCount > 0 ? (
        <MergeGuestDialog
          guestDeckCount={guestDeckCount}
          onClose={() => {
            void handleMergeDialogClose();
          }}
        />
      ) : null}
    </div>
  );
}
