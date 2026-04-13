"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePublicCheckSessionBody,
  PublicCheckLocationSearchResponse,
  StudentBoardResponse,
  UpdatePublicCheckSessionBody,
  UpdateStudentBoardBody,
} from "@yeon/api-contract";

export function useSpaceStudentBoard(spaceId: string | null) {
  const queryClient = useQueryClient();

  const boardQuery = useQuery({
    queryKey: ["student-board", spaceId],
    enabled: !!spaceId,
    queryFn: async () => {
      const response = await fetch(`/api/v1/spaces/${spaceId}/student-board`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message || "학생 보드를 불러오지 못했습니다.");
      }

      return (await response.json()) as StudentBoardResponse;
    },
  });

  const invalidateBoard = () =>
    queryClient.invalidateQueries({ queryKey: ["student-board", spaceId] });

  const updateMemberBoard = useMutation({
    mutationFn: async (params: {
      memberId: string;
      body: UpdateStudentBoardBody;
    }) => {
      const response = await fetch(
        `/api/v1/spaces/${spaceId}/student-board/${params.memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params.body),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          payload?.message || "학생 보드 상태를 저장하지 못했습니다.",
        );
      }

      return (await response.json()) as StudentBoardResponse;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["student-board", spaceId], data);
    },
  });

  const createSession = useMutation({
    mutationFn: async (body: CreatePublicCheckSessionBody) => {
      const response = await fetch(`/api/v1/spaces/${spaceId}/student-board`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          payload?.message || "체크인 세션을 생성하지 못했습니다.",
        );
      }

      return (await response.json()) as { session: unknown };
    },
    onSuccess: invalidateBoard,
  });

  const updateSession = useMutation({
    mutationFn: async (params: {
      sessionId: string;
      body: UpdatePublicCheckSessionBody;
    }) => {
      const response = await fetch(
        `/api/v1/spaces/${spaceId}/public-check-sessions/${params.sessionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params.body),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          payload?.message || "체크인 세션을 수정하지 못했습니다.",
        );
      }

      return response.json();
    },
    onSuccess: invalidateBoard,
  });

  return {
    data: boardQuery.data,
    loading: boardQuery.isPending,
    error:
      boardQuery.error instanceof Error
        ? boardQuery.error.message
        : boardQuery.error
          ? "학생 보드를 불러오지 못했습니다."
          : null,
    updateMemberBoard,
    createSession,
    updateSession,
  };
}

export function usePublicCheckLocationSearch(
  spaceId: string | null,
  query: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["public-check-location-search", spaceId, query],
    enabled: enabled && !!spaceId && query.trim().length >= 2,
    retry: false,
    queryFn: async () => {
      const params = new URLSearchParams({ query });
      const response = await fetch(
        `/api/v1/spaces/${spaceId}/public-check-locations?${params.toString()}`,
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          payload?.message || "위치 검색 결과를 불러오지 못했습니다.",
        );
      }

      return (await response.json()) as PublicCheckLocationSearchResponse;
    },
  });
}
