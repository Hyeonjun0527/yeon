"use client";

import type { FieldType, SelectOption } from "../space-settings/types";
import {
  OVERVIEW_FIELD_SOURCE_KEYS,
  type OverviewFieldSourceKey,
} from "@/lib/member-overview-fields";
import type { FieldDef } from "./hooks/use-custom-tab-fields";

export type EditableMemberPatchKey = "name" | "email" | "phone" | "status";

export interface FieldChoiceOption {
  value: string;
  label: string;
  color?: string;
}

export interface MemberFieldActionTarget {
  field: FieldDef;
  value: unknown;
  valueFieldType: FieldType;
  valueOptions?: FieldChoiceOption[] | null;
  valueScope: "member" | "fieldValue";
  memberPatchKey?: EditableMemberPatchKey;
}

const EDITABLE_OVERVIEW_SOURCE_KEYS = new Set<OverviewFieldSourceKey>([
  OVERVIEW_FIELD_SOURCE_KEYS.memberName,
  OVERVIEW_FIELD_SOURCE_KEYS.memberEmail,
  OVERVIEW_FIELD_SOURCE_KEYS.memberPhone,
  OVERVIEW_FIELD_SOURCE_KEYS.memberStatus,
]);

const INLINE_EDITABLE_MEMBER_PATCH_KEYS = new Set<EditableMemberPatchKey>([
  "name",
  "email",
  "phone",
]);

export const MEMBER_STATUS_OPTIONS: FieldChoiceOption[] = [
  { value: "active", label: "수강중", color: "var(--accent)" },
  { value: "withdrawn", label: "중도포기", color: "#f87171" },
  { value: "graduated", label: "수료", color: "#34d399" },
];

export function isEditableOverviewSourceKey(
  sourceKey?: string | null,
): sourceKey is OverviewFieldSourceKey {
  return (
    typeof sourceKey === "string" &&
    EDITABLE_OVERVIEW_SOURCE_KEYS.has(sourceKey as OverviewFieldSourceKey)
  );
}

export function isDerivedOverviewField(field: FieldDef) {
  return (
    Boolean(field.sourceKey) && !isEditableOverviewSourceKey(field.sourceKey)
  );
}

export function canManageField(field: FieldDef) {
  return !isDerivedOverviewField(field);
}

export function canManageActionTarget(
  target?: Pick<MemberFieldActionTarget, "valueScope"> | null,
) {
  return target?.valueScope === "fieldValue";
}

export function isInlineEditableMemberActionTarget(
  target?: Pick<
    MemberFieldActionTarget,
    "valueScope" | "memberPatchKey"
  > | null,
) {
  return (
    target?.valueScope === "member" &&
    Boolean(
      target.memberPatchKey &&
      INLINE_EDITABLE_MEMBER_PATCH_KEYS.has(target.memberPatchKey),
    )
  );
}

export function getFieldChoiceOptions(
  fieldType: FieldType,
  options?: SelectOption[] | null,
) {
  if (fieldType === "select" || fieldType === "multi_select") {
    return (options ? options : []).map((option) => ({
      value: option.value,
      label: option.value,
      color: option.color,
    }));
  }

  return null;
}

export function getOverviewMemberPatchKey(field: FieldDef) {
  switch (field.sourceKey) {
    case OVERVIEW_FIELD_SOURCE_KEYS.memberName:
      return "name" as const;
    case OVERVIEW_FIELD_SOURCE_KEYS.memberEmail:
      return "email" as const;
    case OVERVIEW_FIELD_SOURCE_KEYS.memberPhone:
      return "phone" as const;
    case OVERVIEW_FIELD_SOURCE_KEYS.memberStatus:
      return "status" as const;
    default:
      return null;
  }
}
