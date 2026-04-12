"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";

import { createPatchedHref } from "@/lib/route-state/search-params";

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
  const router = useRouter();
  const pathname = usePathname();
  const getCurrentSearchParams = useCallback(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
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
  const spaceIdFromQuery = getCurrentSearchParams().get("spaceId");

  useEffect(() => {
    if (spaces.length === 0) return;

    const matchedFromQuery = spaceIdFromQuery
      ? (spaces.find((space) => space.id === spaceIdFromQuery) ?? null)
      : null;
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const matchedFromStorage = saved
      ? (spaces.find((space) => space.id === saved) ?? null)
      : null;
    const initial = matchedFromQuery ?? matchedFromStorage ?? spaces[0] ?? null;

    setCurrentSpaceIdState((prev) =>
      prev === initial?.id ? prev : (initial?.id ?? null),
    );

    if (!matchedFromQuery && initial?.id) {
      router.replace(
        createPatchedHref(pathname, getCurrentSearchParams(), {
          spaceId: initial.id,
        }),
      );
    }
  }, [getCurrentSearchParams, pathname, router, spaceIdFromQuery, spaces]);

  const setCurrentSpaceId = useCallback(
    (id: string) => {
      setCurrentSpaceIdState(id);
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
      router.replace(
        createPatchedHref(pathname, getCurrentSearchParams(), { spaceId: id }),
      );
    },
    [getCurrentSearchParams, pathname, router],
  );

  const addSpace = useCallback(
    (space: Space) => {
      queryClient.setQueryData<{ spaces: Space[] }>(["spaces"], (old) => ({
        spaces: [...(old ? old.spaces : []), space],
      }));
      setCurrentSpaceIdState(space.id);
      if (typeof window !== "undefined")
        localStorage.setItem(STORAGE_KEY, space.id);
      router.replace(
        createPatchedHref(pathname, getCurrentSearchParams(), {
          spaceId: space.id,
        }),
      );
    },
    [getCurrentSearchParams, pathname, queryClient, router],
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

        router.replace(
          createPatchedHref(pathname, getCurrentSearchParams(), {
            spaceId: next,
          }),
        );

        return next;
      });
    },
    [getCurrentSearchParams, pathname, queryClient, router],
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
