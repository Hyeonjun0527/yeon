"use client";

import type { UpdateMemberBody } from "@yeon/api-contract/spaces";
import { apiFetch } from "../space-settings/space-settings-api";
import type { Member } from "./types";

export async function updateSpaceMember(
  spaceId: string,
  memberId: string,
  input: UpdateMemberBody,
) {
  return apiFetch<{ member: Member }>(
    `/api/v1/spaces/${spaceId}/members/${memberId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}
