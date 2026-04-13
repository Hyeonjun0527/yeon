import {
  memberTabSystemKeyValues,
  type MemberTabSystemKey,
} from "@yeon/api-contract/spaces";

const PROTECTED_MEMBER_TAB_KEYS = new Set<MemberTabSystemKey>(
  memberTabSystemKeyValues,
);

export function isProtectedMemberTabSystemKey(
  systemKey: string | null | undefined,
): systemKey is MemberTabSystemKey {
  if (!systemKey) {
    return false;
  }

  return PROTECTED_MEMBER_TAB_KEYS.has(systemKey as MemberTabSystemKey);
}

export function isProtectedMemberTab(tab: {
  tabType: string;
  systemKey: string | null | undefined;
}) {
  return (
    tab.tabType === "system" && isProtectedMemberTabSystemKey(tab.systemKey)
  );
}
