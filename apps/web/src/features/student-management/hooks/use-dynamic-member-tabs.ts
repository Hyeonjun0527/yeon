"use client";

import { useCallback, useEffect, useState } from "react";

export interface DynamicTab {
  id: string;
  name: string;
  tabType: "system" | "custom";
  systemKey: string | null;
  isVisible: boolean;
  displayOrder: number;
}

export function useDynamicMemberTabs(spaceId: string | null) {
  const [tabs, setTabs] = useState<DynamicTab[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!spaceId) { setTabs([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/spaces/${spaceId}/member-tabs`);
      if (!res.ok) return;
      const data = (await res.json()) as { tabs: DynamicTab[] };
      setTabs(data.tabs.filter((t) => t.isVisible));
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => { load(); }, [load]);

  return { tabs, loading, refetch: load };
}
