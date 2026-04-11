"use client";

import { useCallback, useState } from "react";

interface UseBulkMemberDeleteParams {
  selectedSpaceId: string | null;
  selectedIds: Set<string>;
  onDeleted: () => void;
}

export function useBulkMemberDelete({
  selectedSpaceId,
  selectedIds,
  onDeleted,
}: UseBulkMemberDeleteParams) {
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const clearDeleteError = useCallback(() => {
    setDeleteError(null);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (!selectedSpaceId || selectedIds.size === 0 || isDeletingSelected) {
      return;
    }

    const confirmed = window.confirm(
      `선택한 수강생 ${selectedIds.size}명을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingSelected(true);
    setDeleteError(null);

    try {
      const res = await fetch(
        `/api/v1/spaces/${selectedSpaceId}/members/bulk-delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ memberIds: Array.from(selectedIds) }),
        },
      );

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          payload?.message || "수강생을 일괄 삭제하지 못했습니다.",
        );
      }

      onDeleted();
    } catch (caughtError) {
      setDeleteError(
        caughtError instanceof Error
          ? caughtError.message
          : "수강생을 일괄 삭제하지 못했습니다.",
      );
    } finally {
      setIsDeletingSelected(false);
    }
  }, [isDeletingSelected, onDeleted, selectedIds, selectedSpaceId]);

  return {
    isDeletingSelected,
    deleteError,
    clearDeleteError,
    handleBulkDelete,
  };
}
