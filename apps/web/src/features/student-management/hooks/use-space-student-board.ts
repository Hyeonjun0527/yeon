"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePublicCheckSessionBody,
  MemberStudentBoardResponse,
  PublicCheckLocationSearchResponse,
  StudentBoardHistoryPeriod,
  StudentBoardResponse,
  UpdatePublicCheckSessionBody,
  UpdateStudentBoardBody,
} from "@yeon/api-contract";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidLike(value: string | null | undefined) {
  return !!value && UUID_PATTERN.test(value);
}

export function useSpaceStudentBoard(
  spaceId: string | null,
  historyPeriod: StudentBoardHistoryPeriod,
) {
  const queryClient = useQueryClient();
  const enabled = isUuidLike(spaceId);

  const boardQuery = useQuery({
    queryKey: ["student-board", spaceId, historyPeriod],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams({ historyPeriod });
      const response = await fetch(
        `/api/v1/spaces/${spaceId}/student-board?${params.toString()}`,
      );
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
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["student-board", spaceId] }),
      queryClient.invalidateQueries({
        queryKey: ["member-student-board", spaceId],
      }),
    ]);

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
    onSuccess: () => invalidateBoard(),
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
    loading: enabled ? boardQuery.isPending : false,
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

export function useMemberStudentBoard(
  spaceId: string | null,
  memberId: string | null,
  period: StudentBoardHistoryPeriod,
) {
  const enabled = isUuidLike(spaceId) && isUuidLike(memberId);

  return useQuery({
    queryKey: ["member-student-board", spaceId, memberId, period],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      const response = await fetch(
        `/api/v1/spaces/${spaceId}/members/${memberId}/board-history?${params.toString()}`,
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          payload?.message || "학생 출석·과제 이력을 불러오지 못했습니다.",
        );
      }

      return (await response.json()) as MemberStudentBoardResponse;
    },
  });
}

export function usePublicCheckLocationSearch(
  spaceId: string | null,
  query: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["public-check-location-search", spaceId, query],
    enabled: enabled && isUuidLike(spaceId) && query.trim().length >= 2,
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
