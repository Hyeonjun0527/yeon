"use client";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { resolveApiHrefForCurrentPath } from "@/lib/app-route-paths";

import { FIELD_TYPE_LABELS } from "../types";
import type { SpaceTemplateDetail } from "../types";

interface SpaceTemplatePreviewModalProps {
  templateId: string | null;
  open: boolean;
  onClose: () => void;
}

export function SpaceTemplatePreviewModal({
  templateId,
  open,
  onClose,
}: SpaceTemplatePreviewModalProps) {
  const { data, isPending, error } = useQuery({
    queryKey: ["space-template-detail", templateId],
    queryFn: async () => {
      const response = await fetch(
        resolveApiHrefForCurrentPath(`/api/v1/space-templates/${templateId}`),
      );
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "템플릿을 불러오지 못했습니다.");
      }

      return response.json() as Promise<{ template: SpaceTemplateDetail }>;
    },
    enabled: open && Boolean(templateId),
  });

  if (!open || !templateId) return null;

  const template = data?.template ?? null;

  return (
    <div
      className="fixed inset-0 z-[360] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.68)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[760px] max-h-[85vh] overflow-hidden rounded-xl border border-border bg-surface shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-dim">
              템플릿 상세 미리보기
            </p>
            <h3 className="mt-1 text-base font-semibold text-text">
              {template?.name ?? "불러오는 중…"}
            </h3>
            {template?.description && (
              <p className="mt-1 text-xs leading-relaxed text-text-dim max-w-[560px]">
                {template.description}
              </p>
            )}
          </div>

          <button
            className="flex items-center justify-center w-8 h-8 rounded-md bg-transparent border-none text-text-dim hover:text-text hover:bg-surface-3 cursor-pointer"
            onClick={onClose}
            aria-label="닫기"
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-border flex items-center gap-2 flex-wrap flex-shrink-0">
          <span className="rounded border border-border px-2 py-0.5 text-[10px] text-text-dim bg-surface-3">
            {template?.isSystem ? "기본 템플릿" : "사용자 템플릿"}
          </span>
          <span className="rounded border border-border px-2 py-0.5 text-[10px] text-text-dim">
            {template ? `${template.tabCount}개 탭` : "탭 수 계산 중"}
          </span>
          <span className="rounded border border-border px-2 py-0.5 text-[10px] text-text-dim">
            {template ? `${template.fieldCount}개 필드` : "필드 수 계산 중"}
          </span>
        </div>

        <div className="scrollbar-subtle flex-1 overflow-y-auto px-5 py-4">
          {isPending ? (
            <div className="py-10 text-center text-sm text-text-dim">
              템플릿 구성을 불러오는 중…
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error instanceof Error
                ? error.message
                : "템플릿을 불러오지 못했습니다."}
            </div>
          ) : template ? (
            <div className="space-y-4">
              {template.tabsConfig
                .slice()
                .sort((left, right) => left.displayOrder - right.displayOrder)
                .map((tab) => (
                  <section
                    key={`${tab.tabType}:${tab.systemKey ?? tab.name}`}
                    className="rounded-lg border border-border bg-surface-2/60"
                  >
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-text">
                            {tab.name}
                          </span>
                          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-text-dim bg-surface-3">
                            {tab.tabType === "system"
                              ? "시스템 탭"
                              : "커스텀 탭"}
                          </span>
                          {tab.systemKey && (
                            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-text-dim">
                              {tab.systemKey}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-text-dim">
                          {tab.fields.length > 0
                            ? `${tab.fields.length}개 필드가 포함됩니다.`
                            : "필드 없이 탭만 구성됩니다."}
                        </p>
                      </div>
                      <span className="text-[11px] text-text-dim whitespace-nowrap">
                        순서 {tab.displayOrder + 1}
                      </span>
                    </div>

                    {tab.fields.length > 0 ? (
                      <div className="px-4 py-3 space-y-2">
                        {tab.fields
                          .slice()
                          .sort(
                            (left, right) =>
                              left.displayOrder - right.displayOrder,
                          )
                          .map((field) => (
                            <div
                              key={`${tab.name}:${field.name}:${field.displayOrder}`}
                              className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface-3 px-3 py-2"
                            >
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-medium text-text">
                                    {field.name}
                                  </span>
                                  {field.isRequired && (
                                    <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-400">
                                      필수
                                    </span>
                                  )}
                                </div>
                                {field.options && field.options.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1.5">
                                    {field.options.map((option) => (
                                      <span
                                        key={`${field.name}:${option.value}`}
                                        className="rounded border border-border px-1.5 py-0.5 text-[10px] text-text-dim"
                                      >
                                        {option.value}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <span className="text-[11px] text-text-dim whitespace-nowrap">
                                {FIELD_TYPE_LABELS[field.fieldType]}
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </section>
                ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border flex-shrink-0">
          <button
            className="px-4 py-2 rounded-md border border-border bg-transparent text-text-secondary text-sm font-medium cursor-pointer hover:bg-surface-3 hover:text-text transition-colors"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
