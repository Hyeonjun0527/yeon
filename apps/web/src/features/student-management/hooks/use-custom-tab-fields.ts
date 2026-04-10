"use client";

import { useCallback, useEffect, useState } from "react";
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

export function resolveValue(fieldType: FieldType, fv: FieldValue | undefined): unknown {
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

export function useCustomTabFields(spaceId: string, memberId: string, tabId: string) {
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [values, setValues] = useState<FieldValue[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fieldsRes, valuesRes] = await Promise.all([
        fetch(`/api/v1/spaces/${spaceId}/member-tabs/${tabId}/fields`),
        fetch(`/api/v1/spaces/${spaceId}/members/${memberId}/field-values`),
      ]);
      if (fieldsRes.ok) {
        const d = (await fieldsRes.json()) as { fields: FieldDef[] };
        setFields(d.fields);
      }
      if (valuesRes.ok) {
        const d = (await valuesRes.json()) as { values: FieldValue[] };
        setValues(d.values);
      }
    } finally {
      setLoading(false);
    }
  }, [spaceId, memberId, tabId]);

  useEffect(() => { load(); }, [load]);

  async function saveValue(fieldId: string, value: string | null) {
    await fetch(`/api/v1/spaces/${spaceId}/members/${memberId}/field-values`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: [{ fieldDefinitionId: fieldId, value }] }),
    });
    await load();
  }

  return { fields, values, loading, saveValue };
}
