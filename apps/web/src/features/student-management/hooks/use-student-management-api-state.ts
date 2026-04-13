"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

function getStudentDetailMemberId(pathname: string) {
  const prefix = "/home/student-management/";

  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const rest = pathname.slice(prefix.length);

  if (!rest || rest.includes("/") || rest === "check-board") {
    return null;
  }

  return rest;
}

export function useStudentManagementApiState() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { normalizeAppPathname } = useAppRoute();
  const queryClient = useQueryClient();

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

  const normalizedPathname = normalizeAppPathname(pathname);
  const currentSearchParams = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );
  const spaceIdFromQuery = currentSearchParams.get("spaceId");
  const detailMemberId = getStudentDetailMemberId(normalizedPathname);
  const cachedDetailMemberSpaceId = useMemo(() => {
    if (!detailMemberId) {
      return null;
    }

    const cachedMember = queryClient.getQueryData<{ member: Member }>([
      "member",
      detailMemberId,
    ]);

    if (cachedMember?.member.spaceId) {
      return cachedMember.member.spaceId;
    }

    const cachedMemberLists = queryClient.getQueriesData<{ members: Member[] }>(
      {
        queryKey: ["members"],
      },
    );

    for (const [, payload] of cachedMemberLists) {
      const matchedMember = payload?.members.find(
        (member) => member.id === detailMemberId,
      );

      if (matchedMember?.spaceId) {
        return matchedMember.spaceId;
      }
    }

    return null;
  }, [detailMemberId, queryClient]);
  const shouldDeferDefaultSpaceSelection =
    isStudentDetailPath(normalizedPathname) &&
    !spaceIdFromQuery &&
    !cachedDetailMemberSpaceId;
  const matchedSpaceFromQuery = useMemo(
    () =>
      spaceIdFromQuery
        ? (spaces.find((space) => space.id === spaceIdFromQuery) ?? null)
        : null,
    [spaceIdFromQuery, spaces],
  );

  const matchedCachedDetailSpace = useMemo(
    () =>
      cachedDetailMemberSpaceId
        ? (spaces.find((space) => space.id === cachedDetailMemberSpaceId) ??
          null)
        : null,
    [cachedDetailMemberSpaceId, spaces],
  );

  const replaceSearchState = useCallback(
    (patch: Record<string, string | null>) => {
      const nextUrl = createPatchedHref(pathname, currentSearchParams, patch);
      router.replace(nextUrl);
    },
    [currentSearchParams, pathname, router],
  );

  useEffect(() => {
    if (spaces.length === 0) return;

    if (shouldDeferDefaultSpaceSelection) {
      return;
    }

    if (matchedSpaceFromQuery || matchedCachedDetailSpace || spaceIdFromQuery) {
      return;
    }

    const nextSpaceId = spaces[0]?.id ?? null;
    if (!nextSpaceId) {
      return;
    }

    replaceSearchState({ spaceId: nextSpaceId });
  }, [
    matchedCachedDetailSpace,
    matchedSpaceFromQuery,
    replaceSearchState,
    spaceIdFromQuery,
    shouldDeferDefaultSpaceSelection,
    spaces,
  ]);

  const selectedSpaceId = shouldDeferDefaultSpaceSelection
    ? null
    : (matchedSpaceFromQuery?.id ??
      matchedCachedDetailSpace?.id ??
      (spaceIdFromQuery ? null : (spaces[0]?.id ?? null)));
  const setSelectedSpaceId = useCallback(
    (id: string | null) => {
      replaceSearchState({ spaceId: id });
    },
    [replaceSearchState],
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
    void queryClient.invalidateQueries({ queryKey: ["members"] });
  }, [queryClient]);

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
