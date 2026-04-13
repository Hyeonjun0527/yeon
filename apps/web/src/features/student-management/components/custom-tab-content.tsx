"use client";

import { useState } from "react";
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

interface CustomTabContentProps {
  spaceId: string;
  memberId: string;
  tabId: string;
  emptyHint?: string;
  onRequestFieldMenu?: (
    field: FieldDef,
    position: { x: number; y: number },
  ) => void;
}

export function CustomTabContent({
  spaceId,
  memberId,
  tabId,
  emptyHint,
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

  if (visibleFields.length === 0) {
    return (
      <div className="py-10 text-center text-xs text-text-dim">
        아직 등록된 커스텀 필드가 없습니다.
        {emptyHint ? (
          <>
            <br />
            <span className="opacity-60">{emptyHint}</span>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {visibleFields.map((field) => {
        const fv = values.find((v) => v.fieldDefinitionId === field.id);
        const resolved = resolveValue(field.fieldType, fv);
        const isEditing = editingId === field.id;
        const isTextLike = TEXT_LIKE_TYPES.has(field.fieldType);

        return (
          <div
            key={field.id}
            className="group flex items-start gap-3 rounded-lg border-b border-[rgba(255,255,255,0.04)] px-2 py-[10px] transition-colors last:border-0 hover:bg-surface-3/40"
            onContextMenu={(event) => {
              if (!onRequestFieldMenu) return;
              event.preventDefault();
              onRequestFieldMenu(field, {
                x: event.clientX,
                y: event.clientY,
              });
            }}
          >
            <div
              className="w-[6px] h-[6px] rounded-full flex-shrink-0 mt-[5px]"
              style={{
                background:
                  resolved != null ? "var(--accent)" : "rgba(255,255,255,0.15)",
                boxShadow: resolved != null ? "0 0 6px var(--accent)" : "none",
              }}
            />
            <span className="text-[12px] text-text-dim w-[96px] flex-shrink-0 font-mono tracking-tight pt-[1px]">
              {field.name}
              {field.isRequired && (
                <span className="text-accent ml-0.5">*</span>
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
                  onClick={() => isTextLike && startEdit(field.id, resolved)}
                >
                  <FieldRenderer fieldType={field.fieldType} value={resolved} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
