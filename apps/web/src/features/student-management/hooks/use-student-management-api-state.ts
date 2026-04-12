"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";

import type { Member, Space } from "../types";
import { createPatchedHref } from "@/lib/route-state/search-params";
import { useAppRoute } from "@/lib/app-route-context";

function isStudentDetailPath(pathname: string) {
  const prefix = "/home/student-management/";

  if (!pathname.startsWith(prefix)) {
    return false;
  }

  const rest = pathname.slice(prefix.length);

  return !!rest && !rest.includes("/") && rest !== "check-board";
}

export function useStudentManagementApiState() {
  const router = useRouter();
  const pathname = usePathname();
  const { normalizeAppPathname } = useAppRoute();
  const queryClient = useQueryClient();
  const getCurrentSearchParams = useCallback(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const {
    data: spacesData,
    isPending: spacesLoading,
    error: spacesQueryError,
  } = useQuery({
    queryKey: ["spaces"],
    queryFn: async () => {
      const res = await fetch("/api/v1/spaces");
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "스페이스 목록을 불러오지 못했습니다.");
      }
      return res.json() as Promise<{ spaces: Space[] }>;
    },
  });

  const spaces = spacesData ? spacesData.spaces : [];
  const spacesError =
    spacesQueryError instanceof Error
      ? spacesQueryError.message
      : spacesQueryError
        ? "스페이스 목록을 불러오지 못했습니다."
        : null;

  const [userSelectedSpaceId, setUserSelectedSpaceId] = useState<string | null>(
    null,
  );
  const spaceIdFromQuery = getCurrentSearchParams().get("spaceId");
  const normalizedPathname = normalizeAppPathname(pathname);
  const shouldDeferDefaultSpaceSelection =
    isStudentDetailPath(normalizedPathname) && !spaceIdFromQuery;

  useEffect(() => {
    if (!shouldDeferDefaultSpaceSelection) {
      return;
    }

    setUserSelectedSpaceId(null);
  }, [shouldDeferDefaultSpaceSelection]);

  useEffect(() => {
    if (spaces.length === 0) return;

    const matchedFromQuery = spaceIdFromQuery
      ? (spaces.find((space) => space.id === spaceIdFromQuery) ?? null)
      : null;
    const nextSpaceId =
      matchedFromQuery?.id ??
      (shouldDeferDefaultSpaceSelection ? null : (spaces[0]?.id ?? null));

    setUserSelectedSpaceId((prev) =>
      prev === nextSpaceId ? prev : nextSpaceId,
    );

    if (!matchedFromQuery && nextSpaceId) {
      router.replace(
        createPatchedHref(pathname, getCurrentSearchParams(), {
          spaceId: nextSpaceId,
        }),
      );
    }
  }, [
    getCurrentSearchParams,
    pathname,
    router,
    shouldDeferDefaultSpaceSelection,
    spaceIdFromQuery,
    spaces,
  ]);

  const selectedSpaceId = shouldDeferDefaultSpaceSelection
    ? null
    : (userSelectedSpaceId ?? spaces[0]?.id ?? null);
  const setSelectedSpaceId = useCallback(
    (id: string | null) => {
      setUserSelectedSpaceId(id);
      router.replace(
        createPatchedHref(pathname, getCurrentSearchParams(), { spaceId: id }),
      );
    },
    [getCurrentSearchParams, pathname, router],
  );

  const {
    data: membersData,
    isPending: membersPending,
    error: membersQueryError,
  } = useQuery({
    queryKey: ["members", selectedSpaceId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/spaces/${selectedSpaceId}/members`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "수강생 목록을 불러오지 못했습니다.");
      }
      return res.json() as Promise<{ members: Member[] }>;
    },
    enabled: !!selectedSpaceId,
  });

  const members = membersData ? membersData.members : [];
  const membersLoading = !!selectedSpaceId && membersPending;
  const membersError =
    membersQueryError instanceof Error
      ? membersQueryError.message
      : membersQueryError
        ? "수강생 목록을 불러오지 못했습니다."
        : null;

  const refetchSpaces = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["spaces"] });
  }, [queryClient]);

  const refetchMembers = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["members", selectedSpaceId],
    });
  }, [queryClient, selectedSpaceId]);

  const patchMemberInCaches = useCallback(
    (memberId: string, patch: Partial<Member>) => {
      queryClient.setQueriesData<{ members: Member[] }>(
        { queryKey: ["members"] },
        (current) => {
          if (!current) return current;

          return {
            ...current,
            members: current.members.map((member) =>
              member.id === memberId ? { ...member, ...patch } : member,
            ),
          };
        },
      );

      queryClient.setQueryData<{ member: Member } | undefined>(
        ["member", memberId],
        (current) => {
          if (!current) return current;
          return {
            ...current,
            member: { ...current.member, ...patch },
          };
        },
      );
    },
    [queryClient],
  );

  return {
    spaces,
    spacesLoading,
    spacesError,
    selectedSpaceId,
    setSelectedSpaceId,
    refetchSpaces,
    members,
    membersLoading,
    membersError,
    refetchMembers,
    patchMemberInCaches,
  };
}
