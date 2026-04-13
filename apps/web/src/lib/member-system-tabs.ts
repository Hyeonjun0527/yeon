type TabLike = {
  id: string;
  tabType: "system" | "custom";
  systemKey: string | null;
  name: string;
  isVisible: boolean;
  displayOrder: number;
};

export const SYNTHETIC_STUDENT_BOARD_TAB_ID = "system-student_board";

const SYSTEM_TAB_ORDER = [
  "overview",
  "student_board",
  "counseling",
  "memos",
  "report",
] as const;

const SYSTEM_TAB_ORDER_INDEX = new Map<string, number>(
  SYSTEM_TAB_ORDER.map((systemKey, index) => [systemKey, index]),
);

function getResolvedTabOrder(tab: TabLike) {
  if (tab.tabType === "system" && tab.systemKey) {
    return SYSTEM_TAB_ORDER_INDEX.get(tab.systemKey) ?? 999;
  }

  return 1000 + tab.displayOrder;
}

export function sortSystemAwareTabs<T extends TabLike>(tabs: T[]) {
  return [...tabs].sort((left, right) => {
    const orderDiff = getResolvedTabOrder(left) - getResolvedTabOrder(right);
    if (orderDiff !== 0) {
      return orderDiff;
    }

    return left.displayOrder - right.displayOrder;
  });
}

export function ensureStudentBoardSystemTab<T extends TabLike>(
  tabs: T[],
  createSynthetic: () => T,
) {
  if (tabs.some((tab) => tab.systemKey === "student_board")) {
    return sortSystemAwareTabs(tabs);
  }

  return sortSystemAwareTabs([...tabs, createSynthetic()]);
}
