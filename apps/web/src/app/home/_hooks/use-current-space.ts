"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { resolveApiHrefForCurrentPath } from "@/lib/app-route-paths";

const STORAGE_KEY = "yeon_current_space_id";

export interface Space {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
}

export function useCurrentSpace() {
  const queryClient = useQueryClient();

  // URL spaceId는 마운트 시 1회만 읽는다 — useSearchParams 대신 window.location.search 직접 사용
  // useSearchParams()는 replaceState마다 transition re-render를 유발해 빠른 클릭 시 레이스 발생
  const initialSpaceIdRef = useRef<string | null>(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("spaceId")
      : null,
  );
  const initializedRef = useRef(false);

  const [currentSpaceId, setCurrentSpaceIdState] = useState<string | null>(
    null,
  );

  const { data, isLoading: loading } = useQuery({
    queryKey: ["spaces"],
    queryFn: async () => {
      const res = await fetch(resolveApiHrefForCurrentPath("/api/v1/spaces"));
      if (!res.ok) throw new Error("스페이스 조회 실패");
      return res.json() as Promise<{ spaces: Space[] }>;
    },
    staleTime: 30_000,
  });

  const spaces = data ? data.spaces : [];

  // 초기화 + 유효성 검증 (단방향: URL/localStorage → state, 1회만)
  useEffect(() => {
    if (spaces.length === 0) {
      setCurrentSpaceIdState(null);
      return;
    }

    // 이미 초기화되었고 현재 spaceId가 유효하면 아무것도 하지 않는다
    if (
      initializedRef.current &&
      currentSpaceId &&
      spaces.some((s) => s.id === currentSpaceId)
    ) {
      return;
    }

    // 첫 초기화: URL → localStorage → 첫 번째 스페이스
    if (!initializedRef.current) {
      initializedRef.current = true;

      const fromUrl = initialSpaceIdRef.current;
      const matchedFromUrl = fromUrl
        ? (spaces.find((s) => s.id === fromUrl) ?? null)
        : null;
      if (matchedFromUrl) {
        setCurrentSpaceIdState(matchedFromUrl.id);
        return;
      }
    }

    // fallback: localStorage → 첫 번째 스페이스
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const matchedFromStorage = saved
      ? (spaces.find((s) => s.id === saved) ?? null)
      : null;
    setCurrentSpaceIdState(matchedFromStorage?.id ?? spaces[0]?.id ?? null);
  }, [currentSpaceId, spaces]);

  // localStorage 동기화
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (currentSpaceId) {
      localStorage.setItem(STORAGE_KEY, currentSpaceId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentSpaceId]);

  const setCurrentSpaceId = useCallback((id: string) => {
    setCurrentSpaceIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const addSpace = useCallback(
    (space: Space) => {
      queryClient.setQueryData<{ spaces: Space[] }>(["spaces"], (old) => ({
        spaces: [...(old ? old.spaces : []), space],
      }));
      setCurrentSpaceIdState(space.id);
      if (typeof window !== "undefined")
        localStorage.setItem(STORAGE_KEY, space.id);
    },
    [queryClient],
  );

  const removeSpace = useCallback(
    (spaceId: string) => {
      queryClient.setQueryData<{ spaces: Space[] }>(["spaces"], (old) => {
        const currentSpaces = old ? old.spaces : [];
        const nextSpaces = currentSpaces.filter(
          (space) => space.id !== spaceId,
        );
        return { spaces: nextSpaces };
      });

      setCurrentSpaceIdState((prev) => {
        if (prev !== spaceId) return prev;

        const cachedSpaces = queryClient.getQueryData<{ spaces: Space[] }>([
          "spaces",
        ]);
        const nextSpaces = (cachedSpaces ? cachedSpaces.spaces : []).filter(
          (space) => space.id !== spaceId,
        );
        const next = nextSpaces[0]?.id ?? null;

        if (typeof window !== "undefined") {
          if (next) {
            localStorage.setItem(STORAGE_KEY, next);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }

        return next;
      });
    },
    [queryClient],
  );

  const currentSpace = spaces.find((s) => s.id === currentSpaceId) ?? null;

  return {
    spaces,
    currentSpaceId,
    currentSpace,
    setCurrentSpaceId,
    addSpace,
    removeSpace,
    loading,
  };
}
