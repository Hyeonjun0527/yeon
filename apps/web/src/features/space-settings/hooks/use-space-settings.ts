"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ensureStudentBoardSystemTab,
  SYNTHETIC_STUDENT_BOARD_TAB_ID,
} from "@/lib/member-system-tabs";
import { isProtectedMemberTab } from "@/lib/member-tab-policy";
import {
  applySpaceTemplate,
  createSpaceField,
  createSpaceTab,
  deleteSpaceField,
  deleteSpaceTab,
  deleteSpaceTemplate,
  duplicateSpaceTemplate,
  fetchSpaceFields,
  fetchSpaceTabs,
  fetchSpaceTemplates,
  patchSpaceTab,
  reorderSpaceFields,
  reorderSpaceTabs,
  resetSpaceTabs,
  snapshotSpaceTemplate,
  updateSpaceField,
  updateSpaceTemplate,
} from "../space-settings-api";
import { moveItem, resolveInitialSelectedTabId } from "../space-settings-utils";
import type {
  FieldType,
  SpaceField,
  SpaceTab,
  SpaceTemplateSummary,
} from "../types";

export function useSpaceSettings(
  spaceId: string | null,
  initialTabId?: string,
) {
  const [tabs, setTabs] = useState<SpaceTab[]>([]);
  const [tabsLoading, setTabsLoading] = useState(false);

  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [fields, setFields] = useState<SpaceField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [templates, setTemplates] = useState<SpaceTemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadTabs = useCallback(async () => {
    if (!spaceId) return;
    setTabsLoading(true);
    setError(null);
    try {
      const data = await fetchSpaceTabs(spaceId);
      const nextTabs = ensureStudentBoardSystemTab(data.tabs, () => ({
        id: SYNTHETIC_STUDENT_BOARD_TAB_ID,
        spaceId,
        tabType: "system",
        systemKey: "student_board",
        name: "출석·과제",
        isVisible: true,
        displayOrder: 1,
      }));
      setTabs(nextTabs);
      setSelectedTabId((prev) =>
        resolveInitialSelectedTabId(nextTabs, prev, initialTabId),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "탭을 불러오지 못했습니다.");
    } finally {
      setTabsLoading(false);
    }
  }, [spaceId, initialTabId]);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const data = await fetchSpaceTemplates();
      setTemplates(data.templates);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "템플릿 목록을 불러오지 못했습니다.",
      );
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const loadFields = useCallback(
    async (tabId: string) => {
      if (!spaceId) return;
      if (tabId === SYNTHETIC_STUDENT_BOARD_TAB_ID) {
        setFields([]);
        setFieldsLoading(false);
        return;
      }
      setFieldsLoading(true);
      setError(null);
      try {
        const data = await fetchSpaceFields(spaceId, tabId);
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

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const createTab = useCallback(
    async (name: string) => {
      if (!spaceId) return;
      setError(null);
      try {
        const data = await createSpaceTab(spaceId, name);
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
      const targetTab = tabs.find((tab) => tab.id === tabId);
      if (targetTab && isProtectedMemberTab(targetTab)) {
        setError("기본 탭은 수정할 수 없습니다.");
        return;
      }
      const prev = tabs;
      setTabs((t) =>
        t.map((tab) => (tab.id === tabId ? { ...tab, name: trimmed } : tab)),
      );
      setError(null);
      try {
        await patchSpaceTab(spaceId, tabId, { name: trimmed });
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
      await resetSpaceTabs(spaceId);
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
      if (isProtectedMemberTab(tab)) {
        setError("기본 탭은 수정할 수 없습니다.");
        return;
      }
      setError(null);
      const newVisible = !tab.isVisible;
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, isVisible: newVisible } : t)),
      );
      try {
        await patchSpaceTab(spaceId, tabId, { isVisible: newVisible });
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
      const targetTab = tabs.find((tab) => tab.id === tabId);
      if (targetTab && isProtectedMemberTab(targetTab)) {
        setError("기본 탭은 삭제할 수 없습니다.");
        return;
      }
      setError(null);
      const prev = tabs;
      setTabs((t) => t.filter((tab) => tab.id !== tabId));
      if (selectedTabId === tabId) {
        const remaining = prev.filter((t) => t.id !== tabId);
        setSelectedTabId(remaining[0]?.id ?? null);
      }
      try {
        await deleteSpaceTab(spaceId, tabId);
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
      const reordered = moveItem(tabs, fromIdx, toIdx);
      setTabs(reordered);
      setError(null);
      try {
        await reorderSpaceTabs(
          spaceId,
          reordered.map((tab) => tab.id),
        );
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
      if (tabId === SYNTHETIC_STUDENT_BOARD_TAB_ID) {
        setError("출석·과제 탭은 필드를 직접 추가할 수 없습니다.");
        return;
      }
      setError(null);
      try {
        const data = await createSpaceField(spaceId, tabId, name, fieldType);
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
        await deleteSpaceField(spaceId, fieldId);
      } catch (e) {
        setFields(prev);
        setError(
          e instanceof Error ? e.message : "필드를 삭제하지 못했습니다.",
        );
      }
    },
    [spaceId, fields],
  );

  const updateField = useCallback(
    async (
      fieldId: string,
      input: {
        name?: string;
        fieldType?: FieldType;
        isRequired?: boolean;
        options?: { value: string; color: string }[] | null;
        displayOrder?: number;
        tabId?: string;
      },
    ) => {
      if (!spaceId) return null;
      setError(null);
      const previous = fields;
      setFields((current) =>
        current.map((field) =>
          field.id === fieldId ? { ...field, ...input } : field,
        ),
      );
      try {
        const data = await updateSpaceField(spaceId, fieldId, input);
        setFields((current) =>
          current.map((field) => (field.id === fieldId ? data.field : field)),
        );
        return data.field;
      } catch (e) {
        setFields(previous);
        setError(
          e instanceof Error ? e.message : "필드를 수정하지 못했습니다.",
        );
        return null;
      }
    },
    [spaceId, fields],
  );

  const reorderFields = useCallback(
    async (tabId: string, fromIdx: number, toIdx: number) => {
      if (!spaceId) return;
      const reordered = moveItem(fields, fromIdx, toIdx);
      setFields(reordered);
      setError(null);
      try {
        await reorderSpaceFields(
          spaceId,
          tabId,
          reordered.map((field) => field.id),
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

  const updateTemplate = useCallback(
    async (
      templateId: string,
      input: { name?: string; description?: string | null },
    ) => {
      setError(null);
      try {
        const data = await updateSpaceTemplate(templateId, input);
        setTemplates((prev) =>
          prev.map((template) =>
            template.id === templateId ? data.template : template,
          ),
        );
        return data.template;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "템플릿을 수정하지 못했습니다.",
        );
        return null;
      }
    },
    [],
  );

  const deleteTemplate = useCallback(async (templateId: string) => {
    setError(null);
    try {
      await deleteSpaceTemplate(templateId);
      setTemplates((prev) =>
        prev.filter((template) => template.id !== templateId),
      );
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "템플릿을 삭제하지 못했습니다.",
      );
      return false;
    }
  }, []);

  const duplicateTemplate = useCallback(async (templateId: string) => {
    setError(null);
    try {
      const data = await duplicateSpaceTemplate(templateId);
      setTemplates((prev) => [data.template, ...prev]);
      return data.template;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "템플릿을 복제하지 못했습니다.",
      );
      return null;
    }
  }, []);

  const snapshotTemplate = useCallback(
    async (name: string, description?: string | null) => {
      if (!spaceId) return null;
      setError(null);
      try {
        const data = await snapshotSpaceTemplate(spaceId, {
          name,
          description,
        });
        setTemplates((prev) => [...prev, data.template]);
        return data.template;
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "템플릿 스냅샷을 저장하지 못했습니다.",
        );
        return null;
      }
    },
    [spaceId],
  );

  const applyTemplate = useCallback(
    async (templateId: string) => {
      if (!spaceId) return;
      setError(null);
      try {
        await applySpaceTemplate(spaceId, templateId);
        setSelectedTabId(null);
        setFields([]);
        await loadTabs();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "템플릿을 적용하지 못했습니다.",
        );
      }
    },
    [spaceId, loadTabs],
  );

  return {
    tabs,
    tabsLoading,
    selectedTabId,
    setSelectedTabId,
    fields,
    fieldsLoading,
    templates,
    templatesLoading,
    error,
    createTab,
    renameTab,
    toggleTabVisibility,
    deleteTab,
    reorderTabs,
    resetToDefaults,
    createField,
    updateField,
    deleteField,
    reorderFields,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    snapshotTemplate,
    applyTemplate,
  };
}
