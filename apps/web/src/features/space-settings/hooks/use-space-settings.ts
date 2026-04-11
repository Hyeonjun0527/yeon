"use client";

import { useCallback, useEffect, useState } from "react";

import type { FieldType, SpaceField, SpaceTab } from "../types";

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `API 오류 (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function useSpaceSettings(
  spaceId: string | null,
  initialTabId?: string,
) {
  const [tabs, setTabs] = useState<SpaceTab[]>([]);
  const [tabsLoading, setTabsLoading] = useState(false);

  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [fields, setFields] = useState<SpaceField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadTabs = useCallback(async () => {
    if (!spaceId) return;
    setTabsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ tabs: SpaceTab[] }>(
        `/api/v1/spaces/${spaceId}/member-tabs`,
      );
      setTabs(data.tabs);
      if (!selectedTabId && data.tabs.length > 0) {
        const preselect =
          initialTabId && data.tabs.find((t) => t.id === initialTabId);
        setSelectedTabId(preselect ? initialTabId! : data.tabs[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "탭을 불러오지 못했습니다.");
    } finally {
      setTabsLoading(false);
    }
  }, [spaceId, selectedTabId, initialTabId]);

  const loadFields = useCallback(
    async (tabId: string) => {
      if (!spaceId) return;
      setFieldsLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ fields: SpaceField[] }>(
          `/api/v1/spaces/${spaceId}/member-tabs/${tabId}/fields`,
        );
        setFields(data.fields);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "필드를 불러오지 못했습니다.",
        );
      } finally {
        setFieldsLoading(false);
      }
    },
    [spaceId],
  );

  useEffect(() => {
    if (selectedTabId) loadFields(selectedTabId);
    else setFields([]);
  }, [selectedTabId, loadFields]);

  useEffect(() => {
    loadTabs();
  }, [loadTabs]);

  const createTab = useCallback(
    async (name: string) => {
      if (!spaceId) return;
      setError(null);
      try {
        const data = await apiFetch<{ tab: SpaceTab }>(
          `/api/v1/spaces/${spaceId}/member-tabs`,
          { method: "POST", body: JSON.stringify({ name }) },
        );
        setTabs((prev) => [...prev, data.tab]);
        setSelectedTabId(data.tab.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "탭을 생성하지 못했습니다.");
      }
    },
    [spaceId],
  );

  const renameTab = useCallback(
    async (tabId: string, name: string) => {
      if (!spaceId) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const prev = tabs;
      setTabs((t) =>
        t.map((tab) => (tab.id === tabId ? { ...tab, name: trimmed } : tab)),
      );
      setError(null);
      try {
        await apiFetch(`/api/v1/spaces/${spaceId}/member-tabs/${tabId}`, {
          method: "PATCH",
          body: JSON.stringify({ name: trimmed }),
        });
      } catch (e) {
        setTabs(prev);
        setError(
          e instanceof Error ? e.message : "탭 이름을 변경하지 못했습니다.",
        );
      }
    },
    [spaceId, tabs],
  );

  const resetToDefaults = useCallback(async () => {
    if (!spaceId) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/spaces/${spaceId}/member-tabs/reset`, {
        method: "POST",
      });
      setSelectedTabId(null);
      setFields([]);
      await loadTabs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "초기화에 실패했습니다.");
    }
  }, [spaceId, loadTabs]);

  const toggleTabVisibility = useCallback(
    async (tabId: string) => {
      if (!spaceId) return;
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;
      setError(null);
      const newVisible = !tab.isVisible;
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, isVisible: newVisible } : t)),
      );
      try {
        await apiFetch(`/api/v1/spaces/${spaceId}/member-tabs/${tabId}`, {
          method: "PATCH",
          body: JSON.stringify({ isVisible: newVisible }),
        });
      } catch (e) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId ? { ...t, isVisible: !newVisible } : t,
          ),
        );
        setError(e instanceof Error ? e.message : "탭을 수정하지 못했습니다.");
      }
    },
    [spaceId, tabs],
  );

  const deleteTab = useCallback(
    async (tabId: string) => {
      if (!spaceId) return;
      setError(null);
      const prev = tabs;
      setTabs((t) => t.filter((tab) => tab.id !== tabId));
      if (selectedTabId === tabId) {
        const remaining = prev.filter((t) => t.id !== tabId);
        setSelectedTabId(remaining[0]?.id ?? null);
      }
      try {
        await apiFetch(`/api/v1/spaces/${spaceId}/member-tabs/${tabId}`, {
          method: "DELETE",
        });
      } catch (e) {
        setTabs(prev);
        setError(e instanceof Error ? e.message : "탭을 삭제하지 못했습니다.");
      }
    },
    [spaceId, tabs, selectedTabId],
  );

  const reorderTabs = useCallback(
    async (fromIdx: number, toIdx: number) => {
      if (!spaceId) return;
      const reordered = [...tabs];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      setTabs(reordered);
      setError(null);
      try {
        await apiFetch(`/api/v1/spaces/${spaceId}/member-tabs/reorder`, {
          method: "PATCH",
          body: JSON.stringify({ order: reordered.map((t) => t.id) }),
        });
      } catch (e) {
        setTabs(tabs);
        setError(
          e instanceof Error ? e.message : "탭 순서를 변경하지 못했습니다.",
        );
      }
    },
    [spaceId, tabs],
  );

  const createField = useCallback(
    async (tabId: string, name: string, fieldType: FieldType) => {
      if (!spaceId) return;
      setError(null);
      try {
        const data = await apiFetch<{ field: SpaceField }>(
          `/api/v1/spaces/${spaceId}/member-tabs/${tabId}/fields`,
          { method: "POST", body: JSON.stringify({ name, fieldType }) },
        );
        setFields((prev) => [...prev, data.field]);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "필드를 생성하지 못했습니다.",
        );
      }
    },
    [spaceId],
  );

  const deleteField = useCallback(
    async (fieldId: string) => {
      if (!spaceId) return;
      setError(null);
      const prev = fields;
      setFields((f) => f.filter((field) => field.id !== fieldId));
      try {
        await apiFetch(`/api/v1/spaces/${spaceId}/member-fields/${fieldId}`, {
          method: "DELETE",
        });
      } catch (e) {
        setFields(prev);
        setError(
          e instanceof Error ? e.message : "필드를 삭제하지 못했습니다.",
        );
      }
    },
    [spaceId, fields],
  );

  const reorderFields = useCallback(
    async (tabId: string, fromIdx: number, toIdx: number) => {
      if (!spaceId) return;
      const reordered = [...fields];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      setFields(reordered);
      setError(null);
      try {
        await apiFetch(
          `/api/v1/spaces/${spaceId}/member-tabs/${tabId}/fields/reorder`,
          {
            method: "PATCH",
            body: JSON.stringify({ order: reordered.map((f) => f.id) }),
          },
        );
      } catch (e) {
        setFields(fields);
        setError(
          e instanceof Error ? e.message : "필드 순서를 변경하지 못했습니다.",
        );
      }
    },
    [spaceId, fields],
  );

  return {
    tabs,
    tabsLoading,
    selectedTabId,
    setSelectedTabId,
    fields,
    fieldsLoading,
    error,
    createTab,
    renameTab,
    toggleTabVisibility,
    deleteTab,
    reorderTabs,
    resetToDefaults,
    createField,
    deleteField,
    reorderFields,
  };
}
