"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { StudentSpaceCreateStep } from "@/features/student-management/components/space-create-modal";
import { createPatchedHref, isOneOf } from "@/lib/route-state/search-params";

import type {
  CreateModalState,
  SpaceDialogTarget,
  SpaceSelectionState,
} from "../_lib/space-sidebar-types";

interface UseSpaceSidebarActionsParams {
  selectedSpaceId: string | null;
  setSelectedSpaceId: (id: string | null) => void;
  refetchSpaces: () => void;
  resetDetailRouteIfNeeded: (nextSpaceId?: string | null) => void;
  setSpaceSelection: React.Dispatch<React.SetStateAction<SpaceSelectionState>>;
  closeContextMenu: () => void;
}

export function useSpaceSidebarActions({
  selectedSpaceId,
  setSelectedSpaceId,
  refetchSpaces,
  resetDetailRouteIfNeeded,
  setSpaceSelection,
  closeContextMenu,
}: UseSpaceSidebarActionsParams) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const getCurrentSearchParams = useCallback(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );
  const [spaceActionError, setSpaceActionError] = useState<string | null>(null);
  const [deletingSpaceId, setDeletingSpaceId] = useState<string | null>(null);
  const [renamingSpaceId, setRenamingSpaceId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<SpaceDialogTarget | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SpaceDialogTarget | null>(
    null,
  );

  const createModalState = useMemo<CreateModalState>(() => {
    const searchParams = getCurrentSearchParams();
    const modal = searchParams.get("modal");
    const mode = searchParams.get("mode");
    const step = searchParams.get("step");
    const initialStep = isOneOf(step, ["choose", "blank", "import"] as const)
      ? step
      : isOneOf(mode, ["choose", "blank", "import"] as const)
        ? mode
        : "choose";

    return {
      open: modal === "create-space",
      initialStep,
      initialLocalDraftId: searchParams.get("draftId"),
    };
  }, [getCurrentSearchParams]);

  const openCreateModal = useCallback(
    (
      initialStep: StudentSpaceCreateStep,
      initialLocalDraftId?: string | null,
    ) => {
      setSpaceActionError(null);
      setSpaceSelection({ ids: [], anchorId: null });
      router.replace(
        createPatchedHref(pathname, getCurrentSearchParams(), {
          modal: "create-space",
          mode: initialStep,
          step: initialStep,
          draftId: initialLocalDraftId ?? null,
        }),
      );
    },
    [getCurrentSearchParams, pathname, router, setSpaceSelection],
  );

  const closeCreateModal = useCallback(() => {
    router.replace(
      createPatchedHref(pathname, getCurrentSearchParams(), {
        modal: null,
        mode: null,
        step: null,
        draftId: null,
      }),
    );
  }, [getCurrentSearchParams, pathname, router]);

  const updateCreateModalRouteState = useCallback(
    (patch: {
      step?: StudentSpaceCreateStep | null;
      mode?: StudentSpaceCreateStep | null;
      draftId?: string | null;
    }) => {
      router.replace(
        createPatchedHref(pathname, getCurrentSearchParams(), {
          modal: "create-space",
          step: patch.step,
          mode: patch.mode,
          draftId: patch.draftId,
        }),
      );
    },
    [getCurrentSearchParams, pathname, router],
  );

  const readSpaceActionErrorMessage = useCallback(async (res: Response) => {
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const data = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (typeof data?.message === "string" && data.message.trim()) {
        return data.message;
      }
    }

    const text = await res.text().catch(() => "");
    return text || "스페이스를 삭제하지 못했습니다.";
  }, []);

  const deleteSpaceById = useCallback(
    async (spaceId: string) => {
      const res = await fetch(`/api/v1/spaces/${spaceId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await readSpaceActionErrorMessage(res));
      }

      if (selectedSpaceId === spaceId) {
        setSelectedSpaceId(null);
        resetDetailRouteIfNeeded(null);
      }
    },
    [
      readSpaceActionErrorMessage,
      resetDetailRouteIfNeeded,
      selectedSpaceId,
      setSelectedSpaceId,
    ],
  );

  const handleDeleteSpace = useCallback(
    async (spaceId: string) => {
      if (deletingSpaceId) {
        return;
      }

      setDeletingSpaceId(spaceId);
      setSpaceActionError(null);

      try {
        await deleteSpaceById(spaceId);
        setSpaceSelection((prev) => ({
          ids: prev.ids.filter((id) => id !== spaceId),
          anchorId: prev.anchorId === spaceId ? null : prev.anchorId,
        }));
        await refetchSpaces();
      } catch (err) {
        setSpaceActionError(
          err instanceof Error
            ? err.message
            : "스페이스를 삭제하지 못했습니다.",
        );
      } finally {
        setDeletingSpaceId(null);
        setDeleteTarget(null);
      }
    },
    [deleteSpaceById, deletingSpaceId, refetchSpaces, setSpaceSelection],
  );

  const openRenameDialog = useCallback(
    (target: SpaceDialogTarget) => {
      setRenameTarget(target);
      setRenameValue(target.spaceName);
      closeContextMenu();
    },
    [closeContextMenu],
  );

  const openDeleteDialog = useCallback(
    (target: SpaceDialogTarget) => {
      setDeleteTarget(target);
      closeContextMenu();
    },
    [closeContextMenu],
  );

  const handleRenameSpace = useCallback(
    async (spaceId: string, currentName: string) => {
      if (renamingSpaceId || deletingSpaceId) {
        return;
      }

      const trimmedName = renameValue.trim();
      if (!trimmedName || trimmedName === currentName) {
        setRenameTarget(null);
        return;
      }

      setRenamingSpaceId(spaceId);
      setSpaceActionError(null);

      try {
        const res = await fetch(`/api/v1/spaces/${spaceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName }),
        });

        if (!res.ok) {
          throw new Error(await readSpaceActionErrorMessage(res));
        }

        await refetchSpaces();
      } catch (err) {
        setSpaceActionError(
          err instanceof Error
            ? err.message
            : "스페이스 이름을 수정하지 못했습니다.",
        );
      } finally {
        setRenamingSpaceId(null);
        setRenameTarget(null);
        closeContextMenu();
      }
    },
    [
      closeContextMenu,
      deletingSpaceId,
      readSpaceActionErrorMessage,
      refetchSpaces,
      renameValue,
      renamingSpaceId,
    ],
  );

  return {
    createModalState,
    closeCreateModal,
    openCreateModal,
    updateCreateModalRouteState,
    spaceActionError,
    setSpaceActionError,
    deletingSpaceId,
    renamingSpaceId,
    renameTarget,
    setRenameTarget,
    renameValue,
    setRenameValue,
    deleteTarget,
    setDeleteTarget,
    openRenameDialog,
    openDeleteDialog,
    handleRenameSpace,
    handleDeleteSpace,
  };
}
