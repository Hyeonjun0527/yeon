"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createSelectAllState,
  pruneMemberSelection,
  resolveMemberSelection,
} from "../member-selection-utils";

export function useMemberSelection(visibleMemberIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setSelectedIds(
      (prev) =>
        pruneMemberSelection(
          { selectedIds: prev, anchorId: selectionAnchorId },
          visibleMemberIds,
        ).selectedIds,
    );

    setSelectionAnchorId((prev) =>
      prev && visibleMemberIds.includes(prev) ? prev : null,
    );
  }, [selectionAnchorId, visibleMemberIds]);

  const handleSelectMember = useCallback(
    (
      memberId: string,
      options?: { shiftKey?: boolean; shouldSelect?: boolean },
    ) => {
      setSelectedIds(
        (prev) =>
          resolveMemberSelection(
            { selectedIds: prev, anchorId: selectionAnchorId },
            {
              memberId,
              visibleMemberIds,
              shiftKey: options?.shiftKey,
              shouldSelect: options?.shouldSelect,
            },
          ).selectedIds,
      );

      setSelectionAnchorId(memberId);
    },
    [selectionAnchorId, visibleMemberIds],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionAnchorId(null);
  }, []);

  const replaceSelection = useCallback(
    (nextSelectedIds: Iterable<string>, anchorId?: string | null) => {
      const normalizedSelectedIds = new Set(nextSelectedIds);
      setSelectedIds(normalizedSelectedIds);
      setSelectionAnchorId(
        anchorId === undefined
          ? (Array.from(normalizedSelectedIds)[0] ?? null)
          : anchorId,
      );
    },
    [],
  );

  const selectedCount = selectedIds.size;
  const allVisibleSelected = useMemo(
    () =>
      visibleMemberIds.length > 0 &&
      visibleMemberIds.every((memberId) => selectedIds.has(memberId)),
    [selectedIds, visibleMemberIds],
  );

  const toggleSelectAllVisible = useCallback(() => {
    const nextState = createSelectAllState(
      visibleMemberIds,
      allVisibleSelected,
    );
    setSelectedIds(nextState.selectedIds);
    setSelectionAnchorId(nextState.anchorId);
  }, [allVisibleSelected, visibleMemberIds]);

  return {
    selectedIds,
    selectedCount,
    allVisibleSelected,
    selectionAnchorId,
    handleSelectMember,
    replaceSelection,
    clearSelection,
    toggleSelectAllVisible,
  };
}
