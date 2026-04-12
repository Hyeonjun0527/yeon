"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

export function useDynamicMemberTabs(spaceId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["member-tabs", spaceId] as const;

  const { data, isPending } = useQuery({
    queryKey,
    enabled: !!spaceId,
    queryFn: async () => {
      const res = await fetch(`/api/v1/spaces/${spaceId}/member-tabs`);
      if (!res.ok) {
        throw new Error("탭 목록을 불러오지 못했습니다.");
      }

      const data = (await res.json()) as { tabs: DynamicTab[] };
      return data.tabs.filter((t) => t.isVisible);
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
