"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { createSpaceField } from "../../space-settings/space-settings-api";
import { FIELD_TYPE_LABELS, type FieldType } from "../../space-settings/types";
import {
  customTabFieldsQueryKey,
  type CustomTabFieldsQueryData,
} from "../hooks/use-custom-tab-fields";

interface AddCustomFieldModalProps {
  spaceId: string;
  memberId: string;
  tabId: string;
  onClose: () => void;
}

const DEFAULT_FIELD_TYPE: FieldType = "text";
const FIELD_TYPE_OPTIONS = Object.entries(FIELD_TYPE_LABELS) as Array<
  [FieldType, string]
>;

export function AddCustomFieldModal({
  spaceId,
  memberId,
  tabId,
  onClose,
}: AddCustomFieldModalProps) {
  const queryClient = useQueryClient();
  const [fieldName, setFieldName] = React.useState("");
  const [fieldType, setFieldType] =
    React.useState<FieldType>(DEFAULT_FIELD_TYPE);

  const mutation = useMutation({
    mutationFn: async () => {
      const name = fieldName.trim();
      if (!name) {
        throw new Error("필드 이름을 입력해 주세요.");
      }

      return createSpaceField(spaceId, tabId, name, fieldType);
    },
    onSuccess: async ({ field }) => {
      const queryKey = customTabFieldsQueryKey(spaceId, memberId, tabId);

      queryClient.setQueryData<CustomTabFieldsQueryData | undefined>(
        queryKey,
        (current) => {
          if (!current) {
            return current;
          }

          const nextFields = current.fields
            .filter((item) => item.id !== field.id)
            .concat({
              id: field.id,
              name: field.name,
              fieldType: field.fieldType,
              isRequired: field.isRequired,
              displayOrder: field.displayOrder,
            })
            .sort((left, right) => left.displayOrder - right.displayOrder);

          return {
            ...current,
            fields: nextFields,
          };
        },
      );

      await queryClient.invalidateQueries({
        queryKey,
        exact: true,
      });

      onClose();
    },
  });

  const isSubmitting = mutation.isPending;
  const errorMessage =
    mutation.error instanceof Error ? mutation.error.message : null;

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose]);

  return (
    <div
      className="fixed inset-0 z-[320] flex items-center justify-center bg-[rgba(0,0,0,0.56)] p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[380px] rounded-2xl border border-border bg-surface-2 shadow-[0_24px_64px_rgba(0,0,0,0.48)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-text">필드 추가</h3>
            <p className="mt-1 text-[12px] text-text-dim">
              추가 정보에 표시할 새 필드를 만듭니다.
            </p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border-none bg-transparent text-text-dim transition-colors hover:bg-surface-3 hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            aria-label="닫기"
            disabled={isSubmitting}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-text-secondary">
              필드 이름
            </label>
            <input
              autoFocus
              value={fieldName}
              onChange={(event) => setFieldName(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  fieldName.trim() &&
                  !isSubmitting
                ) {
                  mutation.mutate();
                }
              }}
              placeholder="예: 역할, 깃허브, 관심 분야"
              className="w-full rounded-xl border border-border bg-surface-3 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent-border"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-text-secondary">
              필드 타입
            </label>
            <select
              value={fieldType}
              onChange={(event) =>
                setFieldType(event.target.value as FieldType)
              }
              className="w-full rounded-xl border border-border bg-surface-3 px-4 py-3 text-sm text-text outline-none transition-colors focus:border-accent-border"
            >
              {FIELD_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            className="inline-flex min-h-9 items-center rounded-lg border border-border bg-surface-3 px-3.5 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-4 hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="button"
            className="inline-flex min-h-9 items-center rounded-lg border border-accent/40 bg-accent px-3.5 py-2 text-[12px] font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => mutation.mutate()}
            disabled={!fieldName.trim() || isSubmitting}
          >
            {isSubmitting ? "추가 중..." : "필드 추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
