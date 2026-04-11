"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FieldType } from "../../space-settings/types";

export interface FieldDef {
  id: string;
  name: string;
  fieldType: FieldType;
  isRequired: boolean;
  displayOrder: number;
}

export interface FieldValue {
  fieldDefinitionId: string;
  valueText: string | null;
  valueNumber: string | null;
  valueBoolean: boolean | null;
  valueJson: unknown;
  fieldType: string;
  fieldName: string;
}

export function resolveValue(
  fieldType: FieldType,
  fv: FieldValue | undefined,
): unknown {
  if (!fv) return null;
  switch (fieldType) {
    case "checkbox":
      return fv.valueBoolean;
    case "number":
      return fv.valueNumber !== null ? Number(fv.valueNumber) : null;
    case "select":
    case "multi_select":
      return fv.valueJson;
    default:
      return fv.valueText;
  }
}

export function useCustomTabFields(
  spaceId: string,
  memberId: string,
  tabId: string,
) {
  const queryClient = useQueryClient();
  const enabled = !!spaceId && !!memberId && !!tabId;
  const queryKey = ["custom-tab-fields", spaceId, memberId, tabId] as const;

  const { data, isPending } = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/spaces/${spaceId}/member-tabs/${tabId}/fields?memberId=${memberId}`,
      );

      if (!res.ok) {
        throw new Error("커스텀 필드를 불러오지 못했습니다.");
      }

      return res.json() as Promise<{
        fields: FieldDef[];
        values: FieldValue[];
      }>;
    },
  });

  async function saveValue(fieldId: string, value: string | null) {
    const res = await fetch(
      `/api/v1/spaces/${spaceId}/members/${memberId}/field-values`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: [{ fieldDefinitionId: fieldId, value }],
        }),
      },
    );

    if (!res.ok) {
      throw new Error("필드 값을 저장하지 못했습니다.");
    }

    const payload = (await res.json()) as { values?: FieldValue[] };
    const updatedValues = Array.isArray(payload.values) ? payload.values : [];

    queryClient.setQueryData<
      { fields: FieldDef[]; values: FieldValue[] } | undefined
    >(queryKey, (current) => {
      if (!current || updatedValues.length === 0) {
        return current;
      }

      const nextValues = current.values.filter(
        (item) =>
          !updatedValues.some(
            (updated) => updated.fieldDefinitionId === item.fieldDefinitionId,
          ),
      );

      return {
        ...current,
        values: [...nextValues, ...updatedValues],
      };
    });
  }

  return {
    fields: data ? data.fields : [],
    values: data ? data.values : [],
    loading: enabled && isPending,
    saveValue,
  };
}
