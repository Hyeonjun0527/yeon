"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { FieldType } from "../../space-settings/types";
import type {
  FieldChoiceOption,
  MemberFieldActionTarget,
} from "../member-field-edit-policy";

interface MemberFieldContextMenuProps {
  x: number;
  y: number;
  onRename: () => void;
  onDelete: () => void;
}

interface MemberFieldEditModalProps {
  target: MemberFieldActionTarget | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: { name: string; value: unknown }) => void;
}

interface MemberFieldDeleteModalProps {
  target: MemberFieldActionTarget | null;
  isDeleting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onDelete: () => void;
}

function normalizeSelectValue(value: unknown) {
  if (typeof value === "object" && value !== null && "value" in value) {
    const option = value as { value?: unknown };
    return typeof option.value === "string" ? option.value : "";
  }

  return value == null ? "" : String(value);
}

function normalizeMultiSelectValues(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (typeof item === "object" && item !== null && "value" in item) {
        const option = item as { value?: unknown };
        return typeof option.value === "string" ? option.value : null;
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function buildSubmittedValue(
  fieldType: FieldType,
  valueInput: string,
  checkboxValue: boolean,
  selectValue: string,
  multiSelectValues: string[],
  options?: FieldChoiceOption[] | null,
) {
  switch (fieldType) {
    case "checkbox":
      return checkboxValue;
    case "select": {
      if (!selectValue) return null;
      const matchedOption = options?.find(
        (option) => option.value === selectValue,
      );
      if (matchedOption) {
        return {
          value: matchedOption.value,
          color: matchedOption.color,
        };
      }
      return selectValue;
    }
    case "multi_select": {
      if (multiSelectValues.length === 0) return null;
      return multiSelectValues.map((selectedValue) => {
        const matchedOption = options?.find(
          (option) => option.value === selectedValue,
        );
        return matchedOption
          ? { value: matchedOption.value, color: matchedOption.color }
          : { value: selectedValue };
      });
    }
    default:
      return valueInput.trim() ? valueInput.trim() : null;
  }
}

function FieldValueInput({
  fieldType,
  valueInput,
  checkboxValue,
  selectValue,
  multiSelectValues,
  options,
  autoFocus,
  onValueInputChange,
  onCheckboxValueChange,
  onSelectValueChange,
  onMultiSelectValuesChange,
}: {
  fieldType: FieldType;
  valueInput: string;
  checkboxValue: boolean;
  selectValue: string;
  multiSelectValues: string[];
  options?: FieldChoiceOption[] | null;
  autoFocus?: boolean;
  onValueInputChange: (value: string) => void;
  onCheckboxValueChange: (value: boolean) => void;
  onSelectValueChange: (value: string) => void;
  onMultiSelectValuesChange: (value: string[]) => void;
}) {
  if (fieldType === "long_text") {
    return (
      <textarea
        className="min-h-[108px] w-full resize-none rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent-border"
        value={valueInput}
        onChange={(event) => onValueInputChange(event.target.value)}
        placeholder="현재 학생에게만 적용될 값을 입력해 주세요."
        autoFocus={autoFocus}
      />
    );
  }

  if (fieldType === "checkbox") {
    return (
      <div className="flex gap-2">
        {[
          { value: true, label: "예" },
          { value: false, label: "아니요" },
        ].map((option) => (
          <button
            key={String(option.value)}
            type="button"
            className={`inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-[13px] font-medium transition-colors ${
              checkboxValue === option.value
                ? "border-accent/40 bg-accent-dim text-accent"
                : "border-border bg-surface-2 text-text-secondary hover:border-border-light hover:bg-surface-3 hover:text-text"
            }`}
            onClick={() => onCheckboxValueChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (fieldType === "select") {
    if (options && options.length > 0) {
      return (
        <select
          className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition-colors focus:border-accent-border"
          value={selectValue}
          onChange={(event) => onSelectValueChange(event.target.value)}
          autoFocus={autoFocus}
        >
          <option value="">선택해 주세요</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent-border"
        value={valueInput}
        onChange={(event) => onValueInputChange(event.target.value)}
        placeholder="선택값이 없어서 직접 입력합니다."
        autoFocus={autoFocus}
      />
    );
  }

  if (fieldType === "multi_select") {
    if (options && options.length > 0) {
      return (
        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface-2 px-3 py-3">
          {options.map((option) => {
            const checked = multiSelectValues.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  checked
                    ? "border-accent/40 bg-accent-dim text-accent"
                    : "border-border bg-surface-3 text-text-secondary hover:border-border-light hover:bg-surface-4 hover:text-text"
                }`}
                onClick={() =>
                  onMultiSelectValuesChange(
                    checked
                      ? multiSelectValues.filter(
                          (item) => item !== option.value,
                        )
                      : [...multiSelectValues, option.value],
                  )
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <input
        className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent-border"
        value={valueInput}
        onChange={(event) => onValueInputChange(event.target.value)}
        placeholder="쉼표로 구분해 여러 값을 입력해 주세요."
        autoFocus={autoFocus}
      />
    );
  }

  return (
    <input
      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent-border"
      value={valueInput}
      onChange={(event) => onValueInputChange(event.target.value)}
      placeholder="현재 학생에게만 적용될 값을 입력해 주세요."
      autoFocus={autoFocus}
      type={
        fieldType === "number"
          ? "number"
          : fieldType === "date"
            ? "date"
            : "text"
      }
    />
  );
}

export function MemberFieldContextMenu({
  x,
  y,
  onRename,
  onDelete,
}: MemberFieldContextMenuProps) {
  return (
    <div
      data-overview-field-menu="true"
      className="fixed z-[340] min-w-[168px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_48px_rgba(0,0,0,0.38)]"
      style={{ left: x, top: y }}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-2 text-left text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-4 hover:text-text"
        onClick={onRename}
      >
        <Pencil size={14} />
        필드 편집
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-2 text-left text-[12px] font-medium text-red transition-colors hover:bg-surface-4"
        onClick={onDelete}
      >
        <Trash2 size={14} />
        삭제
      </button>
    </div>
  );
}

export function MemberFieldEditModal({
  target,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: MemberFieldEditModalProps) {
  const [name, setName] = React.useState("");
  const [valueInput, setValueInput] = React.useState("");
  const [checkboxValue, setCheckboxValue] = React.useState(false);
  const [selectValue, setSelectValue] = React.useState("");
  const [multiSelectValues, setMultiSelectValues] = React.useState<string[]>(
    [],
  );

  React.useEffect(() => {
    if (!target) return;

    setName(target.field.name);
    setValueInput(
      target.valueFieldType === "multi_select"
        ? normalizeMultiSelectValues(target.value).join(", ")
        : normalizeSelectValue(target.value),
    );
    setCheckboxValue(Boolean(target.value));
    setSelectValue(normalizeSelectValue(target.value));
    setMultiSelectValues(normalizeMultiSelectValues(target.value));
  }, [target]);

  if (!target) {
    return null;
  }

  const managesSharedField = target.valueScope === "fieldValue";

  const value = buildSubmittedValue(
    target.valueFieldType,
    target.valueFieldType === "multi_select"
      ? valueInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .join(", ")
      : valueInput,
    checkboxValue,
    selectValue || valueInput.trim(),
    target.valueFieldType === "multi_select" &&
      (!target.valueOptions || target.valueOptions.length === 0)
      ? valueInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : multiSelectValues,
    target.valueOptions,
  );

  return (
    <div
      className="fixed inset-0 z-[330] flex items-center justify-center bg-[rgba(0,0,0,0.62)] p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-dim">
            {managesSharedField ? "필드 편집" : "기본 정보 수정"}
          </p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-text">
            {managesSharedField
              ? "컬럼명은 스페이스 전역, 값은 현재 학생에게만 반영됩니다"
              : `${target.field.name} 값을 현재 학생 기준으로 수정합니다`}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            {managesSharedField ? (
              <>
                항목 이름을 바꾸면{" "}
                <span className="font-semibold text-text">
                  현재 스페이스 전체
                </span>
                에서 같은 컬럼명이 보이고, 아래 값은{" "}
                <span className="font-semibold text-text">
                  지금 보고 있는 학생
                </span>
                에게만 적용됩니다.
              </>
            ) : (
              <>
                기본 정보 필드 이름은 고정되어 있고, 아래 값만{" "}
                <span className="font-semibold text-text">
                  지금 보고 있는 학생
                </span>
                에게 반영됩니다.
              </>
            )}
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          {managesSharedField ? (
            <div className="space-y-2">
              <label className="block text-[12px] font-medium text-text-secondary">
                컬럼명
              </label>
              <input
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent-border"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                autoFocus
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-text-secondary">
              {managesSharedField ? "현재 학생 값" : target.field.name}
            </label>
            <FieldValueInput
              fieldType={target.valueFieldType}
              valueInput={valueInput}
              checkboxValue={checkboxValue}
              selectValue={selectValue}
              multiSelectValues={multiSelectValues}
              options={target.valueOptions}
              autoFocus={!managesSharedField}
              onValueInputChange={setValueInput}
              onCheckboxValueChange={setCheckboxValue}
              onSelectValueChange={setSelectValue}
              onMultiSelectValuesChange={setMultiSelectValues}
            />
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red/20 bg-red/10 px-4 py-3 text-[13px] text-red">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            className="rounded-lg border border-border bg-surface-3 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-4 hover:text-text disabled:opacity-50"
            onClick={onClose}
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() =>
              onSubmit({
                name: managesSharedField ? name.trim() : target.field.name,
                value,
              })
            }
            disabled={isSubmitting || (managesSharedField && !name.trim())}
          >
            {isSubmitting ? "변경 중..." : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MemberFieldDeleteModal({
  target,
  isDeleting,
  errorMessage,
  onClose,
  onDelete,
}: MemberFieldDeleteModalProps) {
  if (!target) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[330] flex items-center justify-center bg-[rgba(0,0,0,0.62)] p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-dim">
            항목 삭제
          </p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-text">
            정말로 이 항목을 삭제할까요?
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            현재 스페이스의 모든 학생 상세에서 이 필드가 사라집니다.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-border bg-surface-2/70 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-dim">
              삭제할 항목
            </p>
            <p className="mt-1 text-sm font-semibold text-text">
              {target.field.name}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-2/70 px-4 py-3 text-[12px] leading-relaxed text-text-secondary">
            복구를 원하면 010-9485-1049로 문의해 주세요.
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red/20 bg-red/10 px-4 py-3 text-[13px] text-red">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            className="rounded-lg border border-border bg-surface-3 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-4 hover:text-text disabled:opacity-50"
            onClick={onClose}
            disabled={isDeleting}
          >
            취소
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-red px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "삭제 중..." : "삭제하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
