import type {
  FieldType,
  SpaceField,
  SpaceTab,
  SpaceTemplateSummary,
} from "./types";
import { resolveApiHrefForCurrentPath } from "@/lib/app-route-paths";
import type { Space } from "@/features/student-management/types";

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolveApiHrefForCurrentPath(url), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `API 오류 (${res.status})`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function fetchSpaceTabs(spaceId: string) {
  return apiFetch<{ tabs: SpaceTab[] }>(
    `/api/v1/spaces/${spaceId}/member-tabs`,
  );
}

export async function patchSpace(
  spaceId: string,
  input: { name?: string; startDate?: string | null; endDate?: string | null },
) {
  return apiFetch<{ space: Space }>(`/api/v1/spaces/${spaceId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function fetchSpaceFields(spaceId: string, tabId: string) {
  return apiFetch<{ fields: SpaceField[] }>(
    `/api/v1/spaces/${spaceId}/member-tabs/${tabId}/fields`,
  );
}

export async function fetchSpaceTemplates() {
  return apiFetch<{ templates: SpaceTemplateSummary[] }>(
    "/api/v1/space-templates",
  );
}

export async function createSpaceTab(spaceId: string, name: string) {
  return apiFetch<{ tab: SpaceTab }>(`/api/v1/spaces/${spaceId}/member-tabs`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function patchSpaceTab(
  spaceId: string,
  tabId: string,
  input: { name?: string; isVisible?: boolean },
) {
  return apiFetch(`/api/v1/spaces/${spaceId}/member-tabs/${tabId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteSpaceTab(spaceId: string, tabId: string) {
  return apiFetch(`/api/v1/spaces/${spaceId}/member-tabs/${tabId}`, {
    method: "DELETE",
  });
}

export async function reorderSpaceTabs(spaceId: string, order: string[]) {
  return apiFetch(`/api/v1/spaces/${spaceId}/member-tabs/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ order }),
  });
}

export async function resetSpaceTabs(spaceId: string) {
  return apiFetch(`/api/v1/spaces/${spaceId}/member-tabs/reset`, {
    method: "POST",
  });
}

export async function createSpaceField(
  spaceId: string,
  tabId: string,
  name: string,
  fieldType: FieldType,
) {
  return apiFetch<{ field: SpaceField }>(
    `/api/v1/spaces/${spaceId}/member-tabs/${tabId}/fields`,
    {
      method: "POST",
      body: JSON.stringify({ name, fieldType }),
    },
  );
}

export async function deleteSpaceField(spaceId: string, fieldId: string) {
  return apiFetch(`/api/v1/spaces/${spaceId}/member-fields/${fieldId}`, {
    method: "DELETE",
  });
}

export async function updateSpaceField(
  spaceId: string,
  fieldId: string,
  input: {
    name?: string;
    fieldType?: FieldType;
    isRequired?: boolean;
    options?: { value: string; color: string }[] | null;
    displayOrder?: number;
    tabId?: string;
  },
) {
  return apiFetch<{ field: SpaceField }>(
    `/api/v1/spaces/${spaceId}/member-fields/${fieldId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function reorderSpaceFields(
  spaceId: string,
  tabId: string,
  order: string[],
) {
  return apiFetch(
    `/api/v1/spaces/${spaceId}/member-tabs/${tabId}/fields/reorder`,
    {
      method: "PATCH",
      body: JSON.stringify({ order }),
    },
  );
}

export async function updateSpaceTemplate(
  templateId: string,
  input: { name?: string; description?: string | null },
) {
  return apiFetch<{ template: SpaceTemplateSummary }>(
    `/api/v1/space-templates/${templateId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteSpaceTemplate(templateId: string) {
  return apiFetch(`/api/v1/space-templates/${templateId}`, {
    method: "DELETE",
  });
}

export async function duplicateSpaceTemplate(templateId: string) {
  return apiFetch<{ template: SpaceTemplateSummary }>(
    `/api/v1/space-templates/${templateId}/duplicate`,
    {
      method: "POST",
    },
  );
}

export async function snapshotSpaceTemplate(
  spaceId: string,
  input: { name: string; description?: string | null },
) {
  return apiFetch<{ template: SpaceTemplateSummary }>(
    `/api/v1/spaces/${spaceId}/snapshot-template`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function applySpaceTemplate(spaceId: string, templateId: string) {
  return apiFetch(`/api/v1/spaces/${spaceId}/apply-template`, {
    method: "POST",
    body: JSON.stringify({ templateId }),
  });
}
