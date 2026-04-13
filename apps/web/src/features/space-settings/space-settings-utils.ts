import type { SpaceTab } from "./types";

export function resolveInitialSelectedTabId(
  tabs: SpaceTab[],
  selectedTabId: string | null,
  initialTabId?: string,
) {
  if (tabs.length === 0) {
    return selectedTabId;
  }

  if (selectedTabId && tabs.some((tab) => tab.id === selectedTabId)) {
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

export function getAdjacentCustomTabIndexes(
  tabs: SpaceTab[],
  currentIndex: number,
) {
  const currentTab = tabs[currentIndex];
  if (!currentTab || currentTab.tabType !== "custom") {
    return {
      previousIndex: null,
      nextIndex: null,
    };
  }

  const customIndexes = tabs.flatMap((tab, index) =>
    tab.tabType === "custom" ? [index] : [],
  );
  const currentCustomIndex = customIndexes.indexOf(currentIndex);

  return {
    previousIndex:
      currentCustomIndex > 0 ? customIndexes[currentCustomIndex - 1] : null,
    nextIndex:
      currentCustomIndex >= 0 && currentCustomIndex < customIndexes.length - 1
        ? customIndexes[currentCustomIndex + 1]
        : null,
  };
}
