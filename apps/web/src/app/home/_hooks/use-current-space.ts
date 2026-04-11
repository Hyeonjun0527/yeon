"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  const [currentSpaceId, setCurrentSpaceIdState] = useState<string | null>(
    null,
  );

  const { data, isLoading: loading } = useQuery({
    queryKey: ["spaces"],
    queryFn: async () => {
      const res = await fetch("/api/v1/spaces");
      if (!res.ok) throw new Error("스페이스 조회 실패");
      return res.json() as Promise<{ spaces: Space[] }>;
    },
    staleTime: 30_000,
  });

  const spaces = data ? data.spaces : [];

  // 초기 로드 시 localStorage에서 복원
  useEffect(() => {
    if (spaces.length === 0 || currentSpaceId !== null) return;
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const match = saved ? spaces.find((s) => s.id === saved) : null;
    const initial = match ?? spaces[0] ?? null;
    if (initial) {
      setCurrentSpaceIdState(initial.id);
    }
  }, [spaces, currentSpaceId]);

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
        if (prev !== spaceId) {
          return prev;
        }

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
