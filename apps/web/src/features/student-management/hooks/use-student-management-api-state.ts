"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { Member, Space } from "../types";

export function useStudentManagementApiState() {
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

  const [userSelectedSpaceId, setUserSelectedSpaceId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const spaceIdFromQuery = searchParams.get("spaceId");
    if (!spaceIdFromQuery) return;
    setUserSelectedSpaceId((prev) =>
      prev === spaceIdFromQuery ? prev : spaceIdFromQuery,
    );
  }, []);

  const selectedSpaceId = userSelectedSpaceId ?? spaces[0]?.id ?? null;
  const setSelectedSpaceId = useCallback((id: string | null) => {
    setUserSelectedSpaceId(id);
  }, []);

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
  };
}
