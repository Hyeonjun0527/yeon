"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { ActivityLog, Memo } from "../types";

interface UseMemberMemosParams {
  spaceId: string | null;
  memberId: string | null;
}

function toMemo(log: ActivityLog): Memo {
  const metadata = log.metadata ?? {};
  const noteText =
    typeof metadata.noteText === "string"
      ? metadata.noteText
      : typeof metadata.text === "string"
        ? metadata.text
        : "";
  const author =
    typeof metadata.authorLabel === "string" ? metadata.authorLabel : undefined;

  return {
    id: log.id,
    date: log.recordedAt.slice(0, 10),
    text: noteText,
    author,
  };
}

export function useMemberMemos({ spaceId, memberId }: UseMemberMemosParams) {
  const queryClient = useQueryClient();
  const [newMemoText, setNewMemoText] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data, isPending, error } = useQuery({
    queryKey: ["member-memos", spaceId, memberId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/spaces/${spaceId}/members/${memberId}/activity-logs?type=coaching-note&limit=100`,
      );

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message || "메모를 불러오지 못했습니다.");
      }

      return res.json() as Promise<{ logs: ActivityLog[]; totalCount: number }>;
    },
    enabled: !!spaceId && !!memberId,
  });

  const memos = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.logs.map(toMemo).filter((memo) => memo.text.trim().length > 0);
  }, [data]);

  useEffect(() => {
    setNewMemoText("");
    setSaveError(null);
  }, [spaceId, memberId]);

  async function addMemo() {
    if (!spaceId || !memberId || !newMemoText.trim() || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(
        `/api/v1/spaces/${spaceId}/members/${memberId}/activity-logs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: newMemoText.trim() }),
        },
      );

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message || "메모를 저장하지 못했습니다.");
      }

      setNewMemoText("");
      await queryClient.invalidateQueries({
        queryKey: ["member-memos", spaceId, memberId],
      });
    } catch (caughtError) {
      setSaveError(
        caughtError instanceof Error
          ? caughtError.message
          : "메모를 저장하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return {
    memos,
    totalCount: data?.totalCount ?? 0,
    newMemoText,
    setNewMemoText,
    addMemo,
    loading: !!spaceId && !!memberId && isPending,
    error:
      saveError ||
      (error instanceof Error
        ? error.message
        : error
          ? "메모를 불러오지 못했습니다."
          : null),
    isSaving,
  };
}
