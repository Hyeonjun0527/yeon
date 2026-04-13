"use client";

import { useState } from "react";
import { LayoutPanelTop } from "lucide-react";
import { FieldRenderer } from "./field-renderer";
import {
  useCustomTabFields,
  resolveValue,
  type FieldDef,
} from "../hooks/use-custom-tab-fields";

const TEXT_LIKE_TYPES = new Set([
  "text",
  "long_text",
  "url",
  "email",
  "phone",
  "number",
  "date",
]);

const LEGACY_GUARDIAN_PLAIN_TEXT_FIELD_PATTERN = /^(긴급|비상)연락처(관계)?$/;

function resolveDisplayFieldType(field: FieldDef): FieldDef["fieldType"] {
  const compactFieldName = field.name.replace(/\s+/g, "");
  if (LEGACY_GUARDIAN_PLAIN_TEXT_FIELD_PATTERN.test(compactFieldName)) {
    return "text";
  }

  return field.fieldType;
}

interface CustomTabContentProps {
  spaceId: string;
  memberId: string;
  tabId: string;
  title?: string;
  emptyHint?: string;
  onRequestAddField?: () => void;
  onRequestFieldMenu?: (payload: {
    field: FieldDef;
    value: unknown;
    position: { x: number; y: number };
  }) => void;
}

export function CustomTabContent({
  spaceId,
  memberId,
  tabId,
  title,
  emptyHint,
  onRequestAddField,
  onRequestFieldMenu,
}: CustomTabContentProps) {
  const { fields, values, loading, saveValue } = useCustomTabFields(
    spaceId,
    memberId,
    tabId,
  );
  const visibleFields = fields.filter((field) => !field.sourceKey);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(fieldId: string) {
    setSaving(true);
    try {
      await saveValue(fieldId, editText || null);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(fieldId: string, currentValue: unknown) {
    setEditingId(fieldId);
    setEditText(currentValue != null ? String(currentValue) : "");
  }

  if (loading) {
    return (
      <div className="py-10 text-center text-xs text-text-dim">
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(title || onRequestAddField) && (
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[10px] font-semibold tracking-[0.04em] text-text-dim">
            {title ?? "필드"}
          </h3>
          {onRequestAddField ? (
            <button
              type="button"
              className="flex items-center gap-1 border-none bg-transparent p-0 text-[10px] text-text-dim transition-colors hover:text-text-secondary"
              onClick={onRequestAddField}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M5 1v8M1 5h8"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              필드 추가
            </button>
          ) : null}
        </div>
      )}

      {visibleFields.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[24px] border border-border bg-surface-2 px-6 py-12 text-center">
          <LayoutPanelTop size={28} className="text-text-dim" />
          <p className="text-[14px] text-text-dim">
            등록된 커스텀 필드가 없습니다.
          </p>
          <p className="max-w-[320px] text-[13px] leading-relaxed text-text-dim">
            {emptyHint ?? "상단의 필드 추가 버튼으로 항목을 만들어 주세요."}
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {visibleFields.map((field) => {
            const fv = values.find((v) => v.fieldDefinitionId === field.id);
            const displayFieldType = resolveDisplayFieldType(field);
            const resolved = resolveValue(field.fieldType, fv);
            const isEditing = editingId === field.id;
            const isTextLike = TEXT_LIKE_TYPES.has(displayFieldType);

            return (
              <div
                key={field.id}
                className="group flex items-start gap-3 rounded-lg border-b border-[rgba(255,255,255,0.04)] px-2 py-[10px] transition-colors last:border-0 hover:bg-surface-3/40"
                onContextMenu={(event) => {
                  if (!onRequestFieldMenu) return;
                  event.preventDefault();
                  onRequestFieldMenu({
                    field,
                    value: resolved,
                    position: {
                      x: event.clientX,
                      y: event.clientY,
                    },
                  });
                }}
              >
                <div
                  className="h-[6px] w-[6px] flex-shrink-0 self-center rounded-full"
                  style={{
                    background:
                      resolved != null
                        ? "var(--accent)"
                        : "rgba(255,255,255,0.15)",
                    boxShadow:
                      resolved != null ? "0 0 6px var(--accent)" : "none",
                  }}
                />
                <span className="w-[96px] flex-shrink-0 self-center text-[12px] tracking-tight text-text-dim">
                  {field.name}
                  {field.isRequired && (
                    <span className="ml-0.5 text-accent">*</span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        className="flex-1 bg-surface-3 border border-accent rounded px-2 py-[4px] text-xs text-text outline-none"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave(field.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <button
                        className="text-xs text-accent border-none bg-transparent cursor-pointer hover:opacity-80 disabled:opacity-50"
                        onClick={() => handleSave(field.id)}
                        disabled={saving}
                      >
                        저장
                      </button>
                      <button
                        className="text-xs text-text-dim border-none bg-transparent cursor-pointer hover:opacity-80"
                        onClick={() => setEditingId(null)}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div
                      className={
                        isTextLike
                          ? "cursor-text transition-opacity group-hover:opacity-90"
                          : ""
                      }
                      onClick={() =>
                        isTextLike && startEdit(field.id, resolved)
                      }
                    >
                      <FieldRenderer
                        fieldType={displayFieldType}
                        value={resolved}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
