import type { SpaceSelectionState } from "./space-sidebar-types";

export function createRangeSelection(
  orderedIds: string[],
  anchorId: string,
  targetIndex: number,
): SpaceSelectionState {
  const anchorIndex = orderedIds.indexOf(anchorId);
  const resolvedAnchorIndex = anchorIndex >= 0 ? anchorIndex : targetIndex;
  const start = Math.min(resolvedAnchorIndex, targetIndex);
  const end = Math.max(resolvedAnchorIndex, targetIndex);

  return {
    ids: orderedIds.slice(start, end + 1),
    anchorId,
  };
}

export function syncSelectionWithSelectedSpace(
  prev: SpaceSelectionState,
  selectedSpaceId: string | null,
): SpaceSelectionState {
  if (!selectedSpaceId) {
    return prev;
  }

  if (prev.ids.length === 1 && prev.ids[0] === selectedSpaceId) {
    return prev;
  }

  return { ids: [selectedSpaceId], anchorId: selectedSpaceId };
}

export function pruneSpaceSelection(
  prev: SpaceSelectionState,
  validIds: Set<string>,
): SpaceSelectionState {
  const nextIds = prev.ids.filter((id) => validIds.has(id));
  const nextAnchorId =
    prev.anchorId && validIds.has(prev.anchorId)
      ? prev.anchorId
      : (nextIds.at(-1) ?? null);

  if (
    nextIds.length === prev.ids.length &&
    nextIds.every((id, index) => id === prev.ids[index]) &&
    nextAnchorId === prev.anchorId
  ) {
    return prev;
  }

  return { ids: nextIds, anchorId: nextAnchorId };
}
