"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateMemberBody } from "@yeon/api-contract/spaces";
import {
  deleteSpaceField,
  updateSpaceField,
} from "../../space-settings/space-settings-api";
import { updateSpaceMember } from "../member-field-actions-api";
import type { Member } from "../types";
import {
  customTabFieldsQueryKey,
  patchFieldValuesInCache,
  saveMemberFieldValues,
  type CustomTabFieldsQueryData,
  type FieldValue,
} from "./use-custom-tab-fields";
import { useStudentManagement } from "../student-management-provider";
import type { MemberFieldActionTarget } from "../member-field-edit-policy";

type ContextMenuState = {
  target: MemberFieldActionTarget;
  x: number;
  y: number;
};

function areValuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeMemberPatchValue(value: unknown) {
  if (typeof value === "object" && value !== null && "value" in value) {
    const option = value as { value?: unknown };
    return option.value;
  }

  return value;
}

export function useMemberFieldActions({
  member,
  queryKey,
}: {
  member: Member;
  queryKey: readonly unknown[] | null;
}) {
  const queryClient = useQueryClient();
  const { patchMemberInCaches } = useStudentManagement();
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState | null>(
    null,
  );
  const [editTarget, setEditTarget] =
    React.useState<MemberFieldActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<MemberFieldActionTarget | null>(null);

  React.useEffect(() => {
    if (!contextMenu) return;

    const handleScroll = () => setContextMenu(null);

    function handleClose(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-overview-field-menu='true']")) {
        return;
      }
      setContextMenu(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    }

    window.addEventListener("mousedown", handleClose);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("mousedown", handleClose);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [contextMenu]);

  const editMutation = useMutation({
    mutationFn: async ({
      target,
      name,
      value,
    }: {
      target: MemberFieldActionTarget;
      name: string;
      value: unknown;
    }) => {
      const fieldRenameChanged = name !== target.field.name;
      const fieldValueChanged = !areValuesEqual(value, target.value);

      if (fieldRenameChanged) {
        const { field } = await updateSpaceField(
          member.spaceId,
          target.field.id,
          {
            name,
          },
        );

        if (queryKey) {
          queryClient.setQueryData<CustomTabFieldsQueryData | undefined>(
            queryKey,
            (current) => {
              if (!current) return current;
              return {
                ...current,
                fields: current.fields.map((item) =>
                  item.id === field.id ? { ...item, name: field.name } : item,
                ),
              };
            },
          );
        }
      }

      if (fieldValueChanged) {
        if (target.valueScope === "member" && target.memberPatchKey) {
          const normalizedValue = normalizeMemberPatchValue(value);
          const payload = {
            [target.memberPatchKey]: normalizedValue,
          } as UpdateMemberBody;
          const { member: updatedMember } = await updateSpaceMember(
            member.spaceId,
            member.id,
            payload,
          );

          patchMemberInCaches(member.id, {
            name: updatedMember.name,
            email: updatedMember.email,
            phone: updatedMember.phone,
            status: updatedMember.status,
          });
        } else {
          const response = await saveMemberFieldValues(
            member.spaceId,
            member.id,
            [{ fieldDefinitionId: target.field.id, value }],
          );
          const updatedValues = Array.isArray(response.values)
            ? response.values
            : ([] as FieldValue[]);

          if (queryKey) {
            patchFieldValuesInCache(
              queryClient,
              queryKey as ReturnType<typeof customTabFieldsQueryKey>,
              updatedValues,
            );
          }
        }
      }

      if (queryKey) {
        await queryClient.invalidateQueries({
          queryKey: ["custom-tab-fields", member.spaceId],
        });
      }
    },
    onSuccess: () => {
      setEditTarget(null);
      setContextMenu(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (target: MemberFieldActionTarget) =>
      deleteSpaceField(member.spaceId, target.field.id),
    onSuccess: async (_data, target) => {
      if (queryKey) {
        queryClient.setQueryData<CustomTabFieldsQueryData | undefined>(
          queryKey,
          (current) => {
            if (!current) return current;
            return {
              ...current,
              fields: current.fields.filter(
                (item) => item.id !== target.field.id,
              ),
              values: current.values.filter(
                (item) => item.fieldDefinitionId !== target.field.id,
              ),
            };
          },
        );
      }

      await queryClient.invalidateQueries({
        queryKey: ["custom-tab-fields", member.spaceId],
      });

      setDeleteTarget(null);
      setContextMenu(null);
    },
  });

  function openFieldMenu(
    target: MemberFieldActionTarget,
    position: { x: number; y: number },
  ) {
    setContextMenu({
      target,
      x: position.x,
      y: position.y,
    });
  }

  return {
    contextMenu,
    editTarget,
    deleteTarget,
    editErrorMessage:
      editMutation.error instanceof Error ? editMutation.error.message : null,
    deleteErrorMessage:
      deleteMutation.error instanceof Error
        ? deleteMutation.error.message
        : null,
    isEditing: editMutation.isPending,
    isDeleting: deleteMutation.isPending,
    openFieldMenu,
    closeContextMenu: () => setContextMenu(null),
    openEditModal: (target: MemberFieldActionTarget) => {
      setEditTarget(target);
      setContextMenu(null);
    },
    closeEditModal: () => setEditTarget(null),
    resetEditFeedback: () => editMutation.reset(),
    submitEdit: (payload: { name: string; value: unknown }) => {
      if (!editTarget) return;
      editMutation.mutate({
        target: editTarget,
        name: payload.name,
        value: payload.value,
      });
    },
    submitValueEdit: async (target: MemberFieldActionTarget, value: unknown) =>
      editMutation.mutateAsync({
        target,
        name: target.field.name,
        value,
      }),
    openDeleteModal: (target: MemberFieldActionTarget) => {
      setDeleteTarget(target);
      setContextMenu(null);
    },
    closeDeleteModal: () => setDeleteTarget(null),
    confirmDelete: () => {
      if (!deleteTarget) return;
      deleteMutation.mutate(deleteTarget);
    },
  };
}
