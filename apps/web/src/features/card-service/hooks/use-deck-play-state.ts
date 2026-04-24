"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CardDeckItemDto } from "@yeon/api-contract/card-decks";

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (index < 0) return 0;
  if (index >= length) return length - 1;
  return index;
}

function parseIndexFromParam(param: string | null): number {
  const parsed = Number.parseInt(param ?? "", 10);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

function shuffleInPlace<T>(source: readonly T[]): T[] {
  const out = source.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function useDeckPlayState(items: CardDeckItemDto[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isShuffled, setShuffled] = useState(false);
  const [shuffledItems, setShuffledItems] = useState<CardDeckItemDto[]>(items);

  // items prop이 바뀌면 섞인 상태 초기화
  const itemsSignatureRef = useRef<string>(items.map((i) => i.id).join(","));
  useEffect(() => {
    const nextSignature = items.map((i) => i.id).join(",");
    if (nextSignature === itemsSignatureRef.current) {
      return;
    }
    itemsSignatureRef.current = nextSignature;
    setShuffled(false);
    setShuffledItems(items);
  }, [items]);

  const visibleItems = isShuffled ? shuffledItems : items;

  const rawIndex = parseIndexFromParam(searchParams.get("i"));
  const currentIndex = clampIndex(rawIndex, visibleItems.length);
  const [isFlipped, setFlipped] = useState(false);

  // 인덱스가 바뀌면 카드 뒷면 상태 리셋
  const prevIndexRef = useRef(currentIndex);
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      prevIndexRef.current = currentIndex;
      setFlipped(false);
    }
  }, [currentIndex]);

  const updateIndex = useCallback(
    (nextIndex: number) => {
      const bounded = clampIndex(nextIndex, visibleItems.length);
      const nextParams = new URLSearchParams(searchParams.toString());
      if (bounded === 0) {
        nextParams.delete("i");
      } else {
        nextParams.set("i", String(bounded));
      }
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams, visibleItems.length],
  );

  const handleFlip = useCallback(() => {
    setFlipped((prev) => !prev);
  }, []);

  const handlePrev = useCallback(() => {
    if (currentIndex <= 0) return;
    updateIndex(currentIndex - 1);
  }, [currentIndex, updateIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex >= visibleItems.length - 1) return;
    updateIndex(currentIndex + 1);
  }, [currentIndex, updateIndex, visibleItems.length]);

  const handleToggleShuffle = useCallback(() => {
    setShuffled((prev) => {
      const next = !prev;
      if (next) {
        setShuffledItems(shuffleInPlace(items));
      } else {
        setShuffledItems(items);
      }
      return next;
    });
    updateIndex(0);
  }, [items, updateIndex]);

  const currentItem = visibleItems[currentIndex] ?? null;

  return useMemo(
    () => ({
      items: visibleItems,
      currentIndex,
      currentItem,
      isFlipped,
      isShuffled,
      handleFlip,
      handlePrev,
      handleNext,
      handleToggleShuffle,
    }),
    [
      visibleItems,
      currentIndex,
      currentItem,
      isFlipped,
      isShuffled,
      handleFlip,
      handlePrev,
      handleNext,
      handleToggleShuffle,
    ],
  );
}
