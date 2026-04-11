export interface MemberSelectionState {
  selectedIds: Set<string>;
  anchorId: string | null;
}

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

export function createSelectAllState(
  visibleMemberIds: string[],
  allVisibleSelected: boolean,
): MemberSelectionState {
  return {
    selectedIds: allVisibleSelected ? new Set() : new Set(visibleMemberIds),
    anchorId: allVisibleSelected ? null : (visibleMemberIds[0] ?? null),
  };
}
