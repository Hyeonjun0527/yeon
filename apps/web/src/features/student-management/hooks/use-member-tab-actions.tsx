"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  deleteSpaceTab,
  patchSpaceTab,
} from "../../space-settings/space-settings-api";
import type { DynamicTab } from "./use-dynamic-member-tabs";
import { memberTabsQueryKey } from "./use-dynamic-member-tabs";

type MemberTabActionTarget = {
  id: string;
  name: string;
};

type ContextMenuState = {
  target: MemberTabActionTarget;
  x: number;
  y: number;
};

function resolveNextActiveTab(
  tabs: DynamicTab[],
  removedTabId: string,
  currentActiveTab: string,
) {
  if (currentActiveTab !== removedTabId) {
    return null;
  }

  const remainingTabs = tabs.filter((tab) => tab.id !== removedTabId);
  const fallbackTab = remainingTabs[0];
  if (!fallbackTab) {
    return null;
  }

  return fallbackTab.systemKey ?? fallbackTab.id;
}

export function useMemberTabActions({
  spaceId,
  tabs,
  activeTab,
  setActiveTab,
}: {
  spaceId: string | null;
  tabs: DynamicTab[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const queryClient = useQueryClient();
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState | null>(
    null,
  );
  const [renameTarget, setRenameTarget] =
    React.useState<MemberTabActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<MemberTabActionTarget | null>(null);

  React.useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const handleScroll = () => setContextMenu(null);

    function handleClose(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-member-tab-menu='true']")) {
        return;
      }
      setContextMenu(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    }

    window.addEventListener("mousedown", handleClose);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("mousedown", handleClose);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [contextMenu]);

  const renameMutation = useMutation({
    mutationFn: async ({ tabId, name }: { tabId: string; name: string }) => {
      if (!spaceId) {
        throw new Error("스페이스가 선택되지 않았습니다.");
      }

      return patchSpaceTab(spaceId, tabId, { name });
    },
    onSuccess: async () => {
      if (spaceId) {
        await queryClient.invalidateQueries({
          queryKey: memberTabsQueryKey(spaceId),
          exact: true,
        });
      }
      setRenameTarget(null);
      setContextMenu(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tabId: string) => {
      if (!spaceId) {
        throw new Error("스페이스가 선택되지 않았습니다.");
      }

      return deleteSpaceTab(spaceId, tabId);
    },
    onSuccess: async (_data, removedTabId) => {
      const nextActiveTab = resolveNextActiveTab(tabs, removedTabId, activeTab);
      if (nextActiveTab) {
        setActiveTab(nextActiveTab);
      }

      if (spaceId) {
        await queryClient.invalidateQueries({
          queryKey: memberTabsQueryKey(spaceId),
          exact: true,
        });
      }

      setDeleteTarget(null);
      setContextMenu(null);
    },
  });

  function openTabMenu(
    target: MemberTabActionTarget,
    position: { x: number; y: number },
  ) {
    setContextMenu({
      target,
      x: position.x,
      y: position.y,
    });
  }

  return {
    contextMenu,
    renameTarget,
    deleteTarget,
    renameErrorMessage:
      renameMutation.error instanceof Error
        ? renameMutation.error.message
        : null,
    deleteErrorMessage:
      deleteMutation.error instanceof Error
        ? deleteMutation.error.message
        : null,
    isRenaming: renameMutation.isPending,
    isDeleting: deleteMutation.isPending,
    openTabMenu,
    openRenameModal: (target: MemberTabActionTarget) => {
      setRenameTarget(target);
      setContextMenu(null);
    },
    closeRenameModal: () => setRenameTarget(null),
    submitRename: (payload: { name: string }) => {
      if (!renameTarget) {
        return;
      }

      renameMutation.mutate({
        tabId: renameTarget.id,
        name: payload.name,
      });
    },
    openDeleteModal: (target: MemberTabActionTarget) => {
      setDeleteTarget(target);
      setContextMenu(null);
    },
    closeDeleteModal: () => setDeleteTarget(null),
    confirmDelete: () => {
      if (!deleteTarget) {
        return;
      }

      deleteMutation.mutate(deleteTarget.id);
    },
  };
}
