"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Pencil, Trash2 } from "lucide-react";
import {
  deleteSpaceField,
  updateSpaceField,
} from "../../space-settings/space-settings-api";
import {
  OVERVIEW_FIELD_META_BY_SOURCE_KEY,
  OVERVIEW_FIELD_SOURCE_KEY_SET,
  OVERVIEW_SECTION_TITLES,
  type OverviewSectionKey,
  type OverviewFieldSourceKey,
} from "@/lib/member-overview-fields";
import {
  useCustomTabFields,
  customTabFieldsQueryKey,
  type CustomTabFieldsQueryData,
  type FieldDef,
} from "../hooks/use-custom-tab-fields";
import type { Member, Memo } from "../types";
import { fmtDate, fmtRelative } from "../utils";
import { CustomTabContent } from "./custom-tab-content";

interface TabMemberOverviewProps {
  member: Member;
  overviewTabId?: string;
  guardianTabId?: string;
  memos?: Memo[];
  memosLoading?: boolean;
  memosError?: string | null;
  totalMemoCount?: number;
  onAddField?: () => void;
}

type ContextMenuState = {
  field: FieldDef;
  x: number;
  y: number;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: "수강중", color: "var(--accent)" },
  withdrawn: { label: "중도포기", color: "#f87171" },
  graduated: { label: "수료", color: "#34d399" },
};

const AI_RISK_TOOLTIP_COPY = "상담을 분석하여 위험신호를 결정합니다.";

function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group relative flex items-center">
      <button
        type="button"
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-dim transition-colors hover:border-border-light hover:text-text focus-visible:border-accent focus-visible:text-text focus-visible:outline-none"
        aria-label={text}
      >
        <HelpCircle size={12} />
      </button>
      <div className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-10 w-[180px] -translate-x-1/2 rounded-md border border-border bg-surface px-2.5 py-2 text-[11px] leading-[1.45] text-text-secondary opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.24)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {text}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-text-dim">
          {title}
        </div>
        {action}
      </div>
      <div className="rounded-lg border border-border bg-surface-2 px-4">
        {children}
      </div>
    </div>
  );
}

function OverviewFieldRow({
  field,
  value,
  filled,
  note,
  valueColor,
  labelSuffix,
  onContextMenu,
}: {
  field: FieldDef;
  value: string;
  filled: boolean;
  note?: string;
  valueColor?: string;
  labelSuffix?: React.ReactNode;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="group -mx-2 flex items-center gap-3.5 rounded-lg border-b border-[rgba(255,255,255,0.04)] px-2 py-3 transition-colors last:border-0 hover:bg-surface-3/40"
      onContextMenu={onContextMenu}
    >
      <div
        className="h-[6px] w-[6px] flex-shrink-0 rounded-full"
        style={{
          background: filled ? "var(--accent)" : "rgba(255,255,255,0.15)",
          boxShadow: filled ? "0 0 6px var(--accent)" : "none",
        }}
      />
      <div className="flex w-[124px] flex-shrink-0 items-center gap-2">
        <span className="whitespace-nowrap text-[13px] font-medium text-text-secondary">
          {field.name}
        </span>
        {labelSuffix}
      </div>
      <span
        className="min-w-0 flex-1 truncate text-[13px] leading-[1.35]"
        style={{
          color: filled
            ? (valueColor ?? "var(--text)")
            : "rgba(255,255,255,0.2)",
        }}
      >
        {filled ? value : "─ 미입력"}
      </span>
      {note && filled ? (
        <span className="flex-shrink-0 text-[11px] text-text-dim">{note}</span>
      ) : null}
    </div>
  );
}

function LegacyGuardianFieldsSection({
  spaceId,
  memberId,
  guardianTabId,
}: {
  spaceId: string;
  memberId: string;
  guardianTabId?: string;
}) {
  const { fields, loading } = useCustomTabFields(
    spaceId,
    memberId,
    guardianTabId ?? "",
  );

  if (!guardianTabId || loading || fields.length === 0) {
    return null;
  }

  return (
    <Section title="비상 연락 정보">
      <CustomTabContent
        spaceId={spaceId}
        memberId={memberId}
        tabId={guardianTabId}
      />
    </Section>
  );
}

function isOverviewSourceField(
  field: FieldDef,
): field is FieldDef & { sourceKey: OverviewFieldSourceKey } {
  return (
    typeof field.sourceKey === "string" &&
    OVERVIEW_FIELD_SOURCE_KEY_SET.has(field.sourceKey as OverviewFieldSourceKey)
  );
}

export function TabMemberOverview({
  member,
  overviewTabId,
  guardianTabId,
  memos = [],
  memosLoading = false,
  memosError = null,
  totalMemoCount = memos.length,
  onAddField,
}: TabMemberOverviewProps) {
  const queryClient = useQueryClient();
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState | null>(
    null,
  );
  const [renameTarget, setRenameTarget] = React.useState<FieldDef | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<FieldDef | null>(null);

  const overviewQuery = useCustomTabFields(
    member.spaceId,
    member.id,
    overviewTabId ?? "",
  );
  const overviewQueryKey = overviewTabId
    ? customTabFieldsQueryKey(member.spaceId, member.id, overviewTabId)
    : null;

  const statusMeta = STATUS_LABEL[member.status] ?? {
    label: member.status,
    color: "var(--text)",
  };
  const latestMemo = memos[0] ?? null;
  const counselingCount = member.counselingRecordCount ?? 0;
  const lastCounselingAt = member.lastCounselingAt ?? null;

  const sectionFields = React.useMemo(() => {
    const next: Record<OverviewSectionKey, FieldDef[]> = {
      contact: [],
      status: [],
      counseling: [],
      additional: [],
    };

    for (const field of overviewQuery.fields) {
      if (isOverviewSourceField(field)) {
        next[
          OVERVIEW_FIELD_META_BY_SOURCE_KEY[field.sourceKey].sectionKey
        ].push(field);
        continue;
      }
      next.additional.push(field);
    }

    for (const key of Object.keys(next) as OverviewSectionKey[]) {
      next[key].sort((left, right) => left.displayOrder - right.displayOrder);
    }

    return next;
  }, [overviewQuery.fields]);

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

  const renameMutation = useMutation({
    mutationFn: async ({ fieldId, name }: { fieldId: string; name: string }) =>
      updateSpaceField(member.spaceId, fieldId, { name }),
    onSuccess: async ({ field }) => {
      if (overviewQueryKey) {
        queryClient.setQueryData<CustomTabFieldsQueryData | undefined>(
          overviewQueryKey,
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

      await queryClient.invalidateQueries({
        queryKey: ["custom-tab-fields", member.spaceId],
      });

      setRenameTarget(null);
      setRenameValue("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fieldId: string) =>
      deleteSpaceField(member.spaceId, fieldId),
    onSuccess: async (_data, fieldId) => {
      if (overviewQueryKey) {
        queryClient.setQueryData<CustomTabFieldsQueryData | undefined>(
          overviewQueryKey,
          (current) => {
            if (!current) return current;
            return {
              ...current,
              fields: current.fields.filter((item) => item.id !== fieldId),
              values: current.values.filter(
                (item) => item.fieldDefinitionId !== fieldId,
              ),
            };
          },
        );
      }

      await queryClient.invalidateQueries({
        queryKey: ["custom-tab-fields", member.spaceId],
      });

      setDeleteTarget(null);
    },
  });
  const isRenaming = renameMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  function openFieldMenu(field: FieldDef, position: { x: number; y: number }) {
    setContextMenu({
      field,
      x: position.x,
      y: position.y,
    });
  }

  function openRenameModal(field: FieldDef) {
    setRenameTarget(field);
    setRenameValue(field.name);
    setContextMenu(null);
  }

  function openDeleteModal(field: FieldDef) {
    setDeleteTarget(field);
    setContextMenu(null);
  }

  function resolveFieldPresentation(field: FieldDef) {
    if (!isOverviewSourceField(field)) {
      return null;
    }

    switch (field.sourceKey) {
      case "member_name":
        return { value: member.name, filled: !!member.name };
      case "member_email":
        return { value: member.email ?? "", filled: !!member.email };
      case "member_phone":
        return { value: member.phone ?? "", filled: !!member.phone };
      case "member_status":
        return {
          value: statusMeta.label,
          filled: !!member.status,
          valueColor: statusMeta.color,
        };
      case "member_created_at":
        return {
          value: fmtDate(member.createdAt),
          filled: true,
        };
      case "member_counseling_count":
        return {
          value: `${counselingCount}건`,
          filled: counselingCount > 0,
          note: lastCounselingAt ? fmtRelative(lastCounselingAt) : undefined,
        };
      case "member_memo_count":
        return {
          value: memosLoading
            ? "불러오는 중..."
            : memosError
              ? "불러오기 실패"
              : `${totalMemoCount}건`,
          filled: memosLoading || !!memosError || memos.length > 0,
          note:
            !memosLoading && !memosError && latestMemo
              ? latestMemo.date
              : undefined,
          valueColor: memosError ? "#f87171" : undefined,
        };
      case "member_ai_risk_signals":
        return {
          value: member.aiRiskSignals?.length
            ? member.aiRiskSignals.join(", ")
            : "",
          filled: !!(member.aiRiskSignals && member.aiRiskSignals.length > 0),
          labelSuffix: <InfoTooltip text={AI_RISK_TOOLTIP_COPY} />,
        };
      default:
        return null;
    }
  }

  if (overviewQuery.loading) {
    return (
      <div className="py-10 text-center text-xs text-text-dim">
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="pt-1">
      {(["contact", "status", "counseling"] as OverviewSectionKey[]).map(
        (sectionKey) => {
          const fields = sectionFields[sectionKey];

          if (fields.length === 0) {
            return null;
          }

          return (
            <Section
              key={sectionKey}
              title={OVERVIEW_SECTION_TITLES[sectionKey]}
            >
              {fields.map((field) => {
                const presentation = resolveFieldPresentation(field);

                if (!presentation) {
                  return null;
                }

                return (
                  <OverviewFieldRow
                    key={field.id}
                    field={field}
                    value={presentation.value}
                    filled={presentation.filled}
                    note={presentation.note}
                    valueColor={presentation.valueColor}
                    labelSuffix={presentation.labelSuffix}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      openFieldMenu(field, {
                        x: event.clientX,
                        y: event.clientY,
                      });
                    }}
                  />
                );
              })}
            </Section>
          );
        },
      )}

      {!memosLoading && !memosError && latestMemo ? (
        <Section title="최근 메모">
          <div className="py-3 text-[13px] leading-[1.7] text-text-secondary">
            <div className="mb-1 text-[11px] text-text-dim">
              {latestMemo.date}
              {latestMemo.author ? ` · ${latestMemo.author}` : ""}
            </div>
            <div>{latestMemo.text}</div>
          </div>
        </Section>
      ) : null}

      {overviewTabId ? (
        <Section
          title="추가 정보"
          action={
            onAddField ? (
              <button
                className="flex items-center gap-1 border-none bg-transparent p-0 text-[10px] text-text-dim transition-colors hover:text-text-secondary"
                onClick={onAddField}
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
            ) : null
          }
        >
          <CustomTabContent
            spaceId={member.spaceId}
            memberId={member.id}
            tabId={overviewTabId}
            emptyHint="상단의 필드 추가 버튼으로 항목을 만들어 주세요."
            onRequestFieldMenu={(field, position) =>
              openFieldMenu(field, position)
            }
          />
        </Section>
      ) : null}

      {guardianTabId ? (
        <LegacyGuardianFieldsSection
          spaceId={member.spaceId}
          memberId={member.id}
          guardianTabId={guardianTabId}
        />
      ) : null}

      {contextMenu ? (
        <div
          data-overview-field-menu="true"
          className="fixed z-[340] min-w-[168px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_48px_rgba(0,0,0,0.38)]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-2 text-left text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-4 hover:text-text"
            onClick={() => openRenameModal(contextMenu.field)}
          >
            <Pencil size={14} />
            이름 변경
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-2 text-left text-[12px] font-medium text-red transition-colors hover:bg-surface-4"
            onClick={() => openDeleteModal(contextMenu.field)}
          >
            <Trash2 size={14} />
            삭제
          </button>
        </div>
      ) : null}

      {renameTarget ? (
        <div
          className="fixed inset-0 z-[330] flex items-center justify-center bg-[rgba(0,0,0,0.62)] p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isRenaming) {
              setRenameTarget(null);
            }
          }}
        >
          <div className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="border-b border-border px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-dim">
                항목 이름 변경
              </p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-text">
                현재 스페이스 전체에 반영됩니다
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                이 변경은{" "}
                <span className="font-semibold text-text">
                  현재 선택한 스페이스
                </span>
                의 모든 학생 상세 항목명에 바로 반영됩니다.
              </p>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="rounded-xl border border-border bg-surface-2/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-dim">
                  현재 항목명
                </p>
                <p className="mt-1 text-sm font-semibold text-text">
                  {renameTarget.name}
                </p>
              </div>

              <div className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-[12px] leading-relaxed text-text-secondary">
                스페이스 안에서 쓰는 공통 항목명이 바뀝니다. 다른 학생
                상세에서도 같은 이름으로 보입니다.
              </div>

              <div className="space-y-2">
                <label className="block text-[12px] font-medium text-text-secondary">
                  새 항목 이름
                </label>
                <input
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent-border"
                  placeholder="예: 연락처 이메일, 최근 멘토 메모"
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  autoFocus
                  maxLength={80}
                />
              </div>

              {renameMutation.error instanceof Error ? (
                <div className="rounded-xl border border-red/20 bg-red/10 px-4 py-3 text-[13px] text-red">
                  {renameMutation.error.message}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                className="rounded-lg border border-border bg-surface-3 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-4 hover:text-text disabled:opacity-50"
                onClick={() => setRenameTarget(null)}
                disabled={isRenaming}
              >
                취소
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() =>
                  renameMutation.mutate({
                    fieldId: renameTarget.id,
                    name: renameValue.trim(),
                  })
                }
                disabled={!renameValue.trim() || isRenaming}
              >
                <Pencil size={14} />
                {isRenaming ? "변경 중..." : "이름 변경"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[330] flex items-center justify-center bg-[rgba(0,0,0,0.62)] p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isDeleting) {
              setDeleteTarget(null);
            }
          }}
        >
          <div className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border border-red/20 bg-surface shadow-2xl">
            <div className="border-b border-border px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red/80">
                항목 삭제
              </p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-text">
                이 항목을 삭제할까요?
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                <span className="font-semibold text-text">
                  {deleteTarget.name}
                </span>
                은 현재 스페이스의 모든 학생 상세에서 사라집니다.
              </p>
            </div>

            <div className="space-y-3 px-5 py-5">
              <div className="rounded-xl border border-red/20 bg-red/10 px-4 py-3 text-[13px] leading-relaxed text-red">
                사용자에게는 삭제로 보이지만, 내부적으로는 소프트 딜리트로
                처리해 복구 가능성을 남깁니다.
              </div>

              {deleteMutation.error instanceof Error ? (
                <div className="rounded-xl border border-red/20 bg-red/10 px-4 py-3 text-[13px] text-red">
                  {deleteMutation.error.message}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                className="rounded-lg border border-border bg-surface-3 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-4 hover:text-text disabled:opacity-50"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-red px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={isDeleting}
              >
                <Trash2 size={14} />
                {isDeleting ? "삭제 중..." : "삭제하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
