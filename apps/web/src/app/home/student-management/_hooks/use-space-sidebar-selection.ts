"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createRangeSelection,
  pruneSpaceSelection,
  syncSelectionWithSelectedSpace,
} from "../_lib/space-sidebar-utils";
import type {
  SpaceContextMenuState,
  SpaceSelectionState,
} from "../_lib/space-sidebar-types";

interface SpaceListItem {
  id: string;
  name: string;
}

interface UseSpaceSidebarSelectionParams {
  spaces: SpaceListItem[];
  selectedSpaceId: string | null;
  setSelectedSpaceId: (id: string | null) => void;
  resetDetailRouteIfNeeded: () => void;
}

export function useSpaceSidebarSelection({
  spaces,
  selectedSpaceId,
  setSelectedSpaceId,
  resetDetailRouteIfNeeded,
}: UseSpaceSidebarSelectionParams) {
  const [spaceSelection, setSpaceSelection] = useState<SpaceSelectionState>({
    ids: selectedSpaceId ? [selectedSpaceId] : [],
    anchorId: selectedSpaceId,
  });
  const [contextMenu, setContextMenu] = useState<SpaceContextMenuState>(null);

  useEffect(() => {
    setSpaceSelection((prev) =>
      syncSelectionWithSelectedSpace(prev, selectedSpaceId),
    );
  }, [selectedSpaceId]);

  useEffect(() => {
    const validIds = new Set(spaces.map((space) => space.id));
    setSpaceSelection((prev) => pruneSpaceSelection(prev, validIds));
  }, [spaces]);

  const clearSpaceSelection = useCallback(() => {
    setSpaceSelection({ ids: [], anchorId: null });
  }, []);

  const handleSelectAllStudents = useCallback(() => {
    clearSpaceSelection();
    setSelectedSpaceId(null);
    resetDetailRouteIfNeeded();
  }, [clearSpaceSelection, resetDetailRouteIfNeeded, setSelectedSpaceId]);

  const handleSpaceClick = useCallback(
    (
      event: React.MouseEvent<HTMLButtonElement>,
      spaceId: string,
      index: number,
    ) => {
      if (event.shiftKey) {
        const orderedIds = spaces.map((item) => item.id);
        const anchorId = spaceSelection.anchorId ?? selectedSpaceId ?? spaceId;
        setSpaceSelection(createRangeSelection(orderedIds, anchorId, index));
        return;
      }

      setSpaceSelection({ ids: [spaceId], anchorId: spaceId });
      setSelectedSpaceId(spaceId);
      resetDetailRouteIfNeeded();
    },
    [
      resetDetailRouteIfNeeded,
      selectedSpaceId,
      setSelectedSpaceId,
      spaceSelection.anchorId,
      spaces,
    ],
  );

  const handleSpaceContextMenu = useCallback(
    (
      event: React.MouseEvent<HTMLButtonElement>,
      spaceId: string,
      spaceName: string,
    ) => {
      event.preventDefault();
      setSpaceSelection((prev) => {
        if (prev.ids.includes(spaceId)) {
          return prev;
        }
        return { ids: [spaceId], anchorId: spaceId };
      });
      setContextMenu({
        spaceId,
        spaceName,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [],
  );

  return {
    spaceSelection,
    setSpaceSelection,
    clearSpaceSelection,
    contextMenu,
    setContextMenu,
    handleSelectAllStudents,
    handleSpaceClick,
    handleSpaceContextMenu,
  };
}
