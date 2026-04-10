"use client";

import type { FieldType } from "../../space-settings/types";

interface FieldRendererProps {
  fieldType: FieldType;
  value: unknown;
  onEdit?: (newValue: unknown) => void;
}

function EmptyValue() {
  return <span className="text-text-dim opacity-40">─ 미입력</span>;
}

export function FieldRenderer({ fieldType, value, onEdit }: FieldRendererProps) {
  if (value === null || value === undefined || value === "") {
    return <EmptyValue />;
  }

  switch (fieldType) {
    case "text":
    case "long_text":
      return (
        <span
          className="text-text text-sm whitespace-pre-wrap break-words"
          onClick={onEdit ? () => onEdit(value) : undefined}
        >
          {String(value)}
        </span>
      );

    case "number":
      return (
        <span className="text-text text-sm font-mono tabular-nums">
          {Number(value).toLocaleString("ko-KR")}
        </span>
      );

    case "date": {
      const d = new Date(String(value));
      const formatted = isNaN(d.getTime())
        ? String(value)
        : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
      return <span className="text-text text-sm font-mono">{formatted}</span>;
    }

    case "checkbox":
      return (
        <div className="flex items-center gap-1.5">
          <div
            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
              value ? "bg-accent border-accent" : "border-border bg-surface-3"
            }`}
          >
            {value && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-sm text-text">{value ? "예" : "아니요"}</span>
        </div>
      );

    case "select": {
      const option = typeof value === "object" && value !== null
        ? (value as { value: string; color?: string })
        : { value: String(value), color: undefined };
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            background: option.color ? `${option.color}20` : "var(--surface3)",
            color: option.color ?? "var(--text)",
            border: `1px solid ${option.color ? `${option.color}40` : "var(--border)"}`,
          }}
        >
          {option.value}
        </span>
      );
    }

    case "multi_select": {
      const options = Array.isArray(value)
        ? (value as { value: string; color?: string }[])
        : [];
      if (options.length === 0) return <EmptyValue />;
      return (
        <div className="flex flex-wrap gap-1">
          {options.map((opt, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: opt.color ? `${opt.color}20` : "var(--surface3)",
                color: opt.color ?? "var(--text)",
                border: `1px solid ${opt.color ? `${opt.color}40` : "var(--border)"}`,
              }}
            >
              {opt.value}
            </span>
          ))}
        </div>
      );
    }

    case "url":
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent text-sm hover:underline truncate max-w-xs inline-block"
        >
          {String(value)}
        </a>
      );

    case "email":
      return (
        <a
          href={`mailto:${String(value)}`}
          className="text-accent text-sm hover:underline"
        >
          {String(value)}
        </a>
      );

    case "phone":
      return (
        <a
          href={`tel:${String(value)}`}
          className="text-accent text-sm hover:underline font-mono"
        >
          {String(value)}
        </a>
      );

    default:
      return <span className="text-text text-sm">{String(value)}</span>;
  }
}
