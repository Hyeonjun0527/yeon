"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ensureStudentBoardSystemTab,
  SYNTHETIC_STUDENT_BOARD_TAB_ID,
} from "@/lib/member-system-tabs";

export interface DynamicTab {
  id: string;
  name: string;
  tabType: "system" | "custom";
  systemKey: string | null;
  isVisible: boolean;
  displayOrder: number;
}

function toVisibleTabs(data: DynamicTab[] | undefined) {
  return data ? data : [];
}

export function memberTabsQueryKey(spaceId: string | null) {
  return ["member-tabs", spaceId] as const;
}

export function useDynamicMemberTabs(spaceId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = memberTabsQueryKey(spaceId);

  const { data, isPending } = useQuery({
    queryKey,
    enabled: !!spaceId,
    queryFn: async () => {
      const res = await fetch(`/api/v1/spaces/${spaceId}/member-tabs`);
      if (!res.ok) {
        throw new Error("탭 목록을 불러오지 못했습니다.");
      }

      const data = (await res.json()) as { tabs: DynamicTab[] };
      return ensureStudentBoardSystemTab(
        data.tabs.filter((t) => t.isVisible),
        () => ({
          id: SYNTHETIC_STUDENT_BOARD_TAB_ID,
          name: "출석·과제",
          tabType: "system",
          systemKey: "student_board",
          isVisible: true,
          displayOrder: 1,
        }),
      );
    },
  });

  const refetch = useCallback(async () => {
    if (!spaceId) return;

    await queryClient.invalidateQueries({ queryKey, exact: true });
  }, [queryClient, queryKey, spaceId]);

  return {
    tabs: toVisibleTabs(data),
    loading: !!spaceId && isPending,
    refetch,
  };
}
