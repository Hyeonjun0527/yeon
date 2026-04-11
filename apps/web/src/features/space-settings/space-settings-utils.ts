import type { SpaceTab } from "./types";

export function resolveInitialSelectedTabId(
  tabs: SpaceTab[],
  selectedTabId: string | null,
  initialTabId?: string,
) {
  if (selectedTabId || tabs.length === 0) {
    return selectedTabId;
  }

  const preselect = initialTabId && tabs.find((tab) => tab.id === initialTabId);
  return preselect ? initialTabId : tabs[0].id;
}

export function moveItem<T>(items: T[], fromIdx: number, toIdx: number) {
  const reordered = [...items];
  const [moved] = reordered.splice(fromIdx, 1);
  reordered.splice(toIdx, 0, moved);
  return reordered;
}
