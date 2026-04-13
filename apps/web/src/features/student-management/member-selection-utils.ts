export interface MemberSelectionState {
  selectedIds: Set<string>;
  anchorId: string | null;
}

export type MemberCardPrimaryAction =
  | "open-detail"
  | "toggle-select"
  | "range-select";

export function pruneMemberSelection(
  prev: MemberSelectionState,
  visibleMemberIds: string[],
): MemberSelectionState {
  const visibleIdSet = new Set(visibleMemberIds);
  const nextSelectedIds = new Set<string>();

  for (const id of prev.selectedIds) {
    if (visibleIdSet.has(id)) {
      nextSelectedIds.add(id);
    }
  }

  const nextAnchorId =
    prev.anchorId && visibleIdSet.has(prev.anchorId) ? prev.anchorId : null;

  return {
    selectedIds: nextSelectedIds,
    anchorId: nextAnchorId,
  };
}

export function resolveMemberSelection(
  prev: MemberSelectionState,
  options: {
    memberId: string;
    visibleMemberIds: string[];
    shiftKey?: boolean;
    shouldSelect?: boolean;
  },
): MemberSelectionState {
  const {
    memberId,
    visibleMemberIds,
    shiftKey = false,
    shouldSelect = true,
  } = options;
  const nextSelectedIds = new Set(prev.selectedIds);
  const currentIndex = visibleMemberIds.indexOf(memberId);
  const anchorIndex = prev.anchorId
    ? visibleMemberIds.indexOf(prev.anchorId)
    : -1;

  if (shiftKey && currentIndex !== -1 && anchorIndex !== -1) {
    const [start, end] =
      currentIndex < anchorIndex
        ? [currentIndex, anchorIndex]
        : [anchorIndex, currentIndex];

    for (const id of visibleMemberIds.slice(start, end + 1)) {
      if (shouldSelect) {
        nextSelectedIds.add(id);
      } else {
        nextSelectedIds.delete(id);
      }
    }
  } else if (shouldSelect) {
    nextSelectedIds.add(memberId);
  } else {
    nextSelectedIds.delete(memberId);
  }

  return {
    selectedIds: nextSelectedIds,
    anchorId: memberId,
  };
}

export function resolveMemberCardPrimaryAction(options: {
  selectedCount: number;
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
}): MemberCardPrimaryAction {
  const {
    selectedCount,
    shiftKey = false,
    metaKey = false,
    ctrlKey = false,
  } = options;

  if (metaKey || ctrlKey) {
    return "toggle-select";
  }

  if (shiftKey) {
    return selectedCount > 0 ? "range-select" : "open-detail";
  }

  return "open-detail";
}

export function getOrderedSelectedMemberIds(
  visibleMemberIds: string[],
  selectedIds: Set<string>,
) {
  return visibleMemberIds.filter((memberId) => selectedIds.has(memberId));
}

export function resolveMemberContextSelection(
  prev: MemberSelectionState,
  options: {
    memberId: string;
    visibleMemberIds: string[];
  },
): MemberSelectionState {
  const { memberId, visibleMemberIds } = options;

  if (prev.selectedIds.has(memberId) && prev.selectedIds.size > 0) {
    const orderedIds = getOrderedSelectedMemberIds(
      visibleMemberIds,
      prev.selectedIds,
    );
    const nextSelectedIds = new Set(orderedIds);
    const nextAnchorId =
      prev.anchorId && nextSelectedIds.has(prev.anchorId)
        ? prev.anchorId
        : memberId;

    return {
      selectedIds: nextSelectedIds,
      anchorId: nextAnchorId,
    };
  }

  return {
    selectedIds: new Set([memberId]),
    anchorId: memberId,
  };
}

export function createSelectAllState(
  visibleMemberIds: string[],
  allVisibleSelected: boolean,
): MemberSelectionState {
  return {
    selectedIds: allVisibleSelected ? new Set() : new Set(visibleMemberIds),
    anchorId: allVisibleSelected ? null : (visibleMemberIds[0] ?? null),
  };
}
