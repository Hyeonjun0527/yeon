"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";
import {
  OVERVIEW_FIELD_META_BY_SOURCE_KEY,
  OVERVIEW_FIELD_SOURCE_KEY_SET,
  OVERVIEW_SECTION_TITLES,
  type OverviewSectionKey,
  type OverviewFieldSourceKey,
} from "@/lib/member-overview-fields";
import {
  MEMBER_STATUS_OPTIONS,
  canManageActionTarget,
  getFieldChoiceOptions,
  getOverviewMemberPatchKey,
  isInlineEditableMemberActionTarget,
  type MemberFieldActionTarget,
} from "../member-field-edit-policy";
import {
  useCustomTabFields,
  customTabFieldsQueryKey,
  type FieldDef,
} from "../hooks/use-custom-tab-fields";
import type { Member, Memo } from "../types";
import { useMemberFieldActions } from "../hooks/use-member-field-actions";
import { fmtDate, fmtRelative } from "../utils";
import { CustomTabContent } from "./custom-tab-content";
import {
  MemberFieldContextMenu,
  MemberFieldDeleteModal,
  MemberFieldEditModal,
} from "./member-field-action-overlays";

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
  interactive = true,
  clickMode = "button",
  onClick,
  onContextMenu,
  isEditing = false,
  editingValue,
  onEditingValueChange,
  onSubmitEdit,
  onCancelEdit,
  isSaving = false,
  editErrorMessage,
  inputType = "text",
}: {
  field: FieldDef;
  value: string;
  filled: boolean;
  note?: string;
  valueColor?: string;
  labelSuffix?: React.ReactNode;
  interactive?: boolean;
  clickMode?: "text" | "button";
  onClick?: () => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  isEditing?: boolean;
  editingValue?: string;
  onEditingValueChange?: (value: string) => void;
  onSubmitEdit?: () => void;
  onCancelEdit?: () => void;
  isSaving?: boolean;
  editErrorMessage?: string | null;
  inputType?: React.HTMLInputTypeAttribute;
}) {
  const isClickable = interactive && Boolean(onClick);
  const rowIsInteractive =
    interactive && (Boolean(onClick) || Boolean(onContextMenu));

  return (
    <div
      className={`group -mx-2 flex items-center gap-3.5 rounded-lg border-b border-[rgba(255,255,255,0.04)] px-2 py-3 transition-colors last:border-0 ${
        rowIsInteractive || isEditing
          ? "hover:bg-surface-3/40"
          : "cursor-not-allowed opacity-80"
      }`}
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
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <input
                autoFocus
                className="min-w-0 flex-1 rounded-lg border border-accent bg-surface-3 px-3 py-[7px] text-[13px] text-text outline-none transition-colors"
                value={editingValue ?? ""}
                onChange={(event) => onEditingValueChange?.(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSubmitEdit?.();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    onCancelEdit?.();
                  }
                }}
                type={inputType}
              />
              <button
                type="button"
                className="border-none bg-transparent p-0 text-[13px] font-medium text-accent transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onSubmitEdit}
                disabled={isSaving}
              >
                {isSaving ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                className="border-none bg-transparent p-0 text-[13px] font-medium text-text-dim transition-colors hover:text-text-secondary disabled:opacity-50"
                onClick={onCancelEdit}
                disabled={isSaving}
              >
                취소
              </button>
            </div>
            {editErrorMessage ? (
              <div className="text-[12px] leading-[1.4] text-red">
                {editErrorMessage}
              </div>
            ) : null}
          </div>
        ) : isClickable ? (
          <button
            type="button"
            className={`w-full min-w-0 border-none bg-transparent p-0 text-left ${
              clickMode === "text"
                ? "cursor-text transition-opacity group-hover:opacity-90"
                : "cursor-pointer transition-opacity group-hover:opacity-90"
            }`}
            onClick={onClick}
          >
            <span
              className="block min-w-0 truncate text-[13px] leading-[1.35]"
              style={{
                color: filled
                  ? (valueColor ?? "var(--text)")
                  : "rgba(255,255,255,0.2)",
              }}
            >
              {filled ? value : "─ 미입력"}
            </span>
          </button>
        ) : (
          <span
            className="block min-w-0 truncate text-[13px] leading-[1.35]"
            style={{
              color: filled
                ? (valueColor ?? "var(--text)")
                : "rgba(255,255,255,0.2)",
            }}
          >
            {filled ? value : "─ 미입력"}
          </span>
        )}
      </div>
      {note && filled && !isEditing ? (
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
  const overviewQuery = useCustomTabFields(
    member.spaceId,
    member.id,
    overviewTabId ?? "",
  );
  const overviewQueryKey = overviewTabId
    ? customTabFieldsQueryKey(member.spaceId, member.id, overviewTabId)
    : null;
  const fieldActions = useMemberFieldActions({
    member,
    queryKey: overviewQueryKey,
  });

  const statusMeta = STATUS_LABEL[member.status] ?? {
    label: member.status,
    color: "var(--text)",
  };
  const latestMemo = memos[0] ?? null;
  const counselingCount = member.counselingRecordCount ?? 0;
  const lastCounselingAt = member.lastCounselingAt ?? null;
  const [editingFieldId, setEditingFieldId] = React.useState<string | null>(
    null,
  );
  const [editingValue, setEditingValue] = React.useState("");
  const [inlineErrorMessage, setInlineErrorMessage] = React.useState<
    string | null
  >(null);
  const [savingFieldId, setSavingFieldId] = React.useState<string | null>(null);

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
    setEditingFieldId(null);
    setEditingValue("");
    setInlineErrorMessage(null);
    setSavingFieldId(null);
  }, [member.id]);

  function beginInlineEdit(target: MemberFieldActionTarget) {
    fieldActions.resetEditFeedback();
    setInlineErrorMessage(null);
    setEditingFieldId(target.field.id);
    setEditingValue(target.value == null ? "" : String(target.value));
  }

  function cancelInlineEdit() {
    setEditingFieldId(null);
    setEditingValue("");
    setInlineErrorMessage(null);
    fieldActions.resetEditFeedback();
  }

  async function saveInlineEdit(target: MemberFieldActionTarget) {
    const nextValue = editingValue.trim();
    const currentValue =
      target.value == null ? "" : String(target.value).trim();

    if (target.memberPatchKey === "name" && !nextValue) {
      setInlineErrorMessage("이름은 비워둘 수 없습니다.");
      return;
    }

    if (nextValue === currentValue) {
      setEditingFieldId(null);
      setEditingValue("");
      setInlineErrorMessage(null);
      return;
    }

    setSavingFieldId(target.field.id);
    setInlineErrorMessage(null);
    fieldActions.resetEditFeedback();

    try {
      await fieldActions.submitValueEdit(target, nextValue ? nextValue : null);
      setEditingFieldId(null);
      setEditingValue("");
    } catch (error) {
      setInlineErrorMessage(
        error instanceof Error
          ? error.message
          : "기본 정보를 저장하지 못했습니다.",
      );
    } finally {
      setSavingFieldId(null);
    }
  }

  function getInlineInputType(target: MemberFieldActionTarget) {
    switch (target.memberPatchKey) {
      case "email":
        return "email" as const;
      case "phone":
        return "tel" as const;
      default:
        return "text" as const;
    }
  }

  function resolveFieldPresentation(field: FieldDef) {
    if (!isOverviewSourceField(field)) {
      return null;
    }

    switch (field.sourceKey) {
      case "member_name":
        return {
          value: member.name,
          filled: !!member.name,
          actionTarget: {
            field,
            value: member.name,
            valueFieldType: field.fieldType,
            valueScope: "member",
            memberPatchKey: getOverviewMemberPatchKey(field) ?? undefined,
          } satisfies MemberFieldActionTarget,
        };
      case "member_email":
        return {
          value: member.email ?? "",
          filled: !!member.email,
          actionTarget: {
            field,
            value: member.email ?? "",
            valueFieldType: field.fieldType,
            valueScope: "member",
            memberPatchKey: getOverviewMemberPatchKey(field) ?? undefined,
          } satisfies MemberFieldActionTarget,
        };
      case "member_phone":
        return {
          value: member.phone ?? "",
          filled: !!member.phone,
          actionTarget: {
            field,
            value: member.phone ?? "",
            valueFieldType: field.fieldType,
            valueScope: "member",
            memberPatchKey: getOverviewMemberPatchKey(field) ?? undefined,
          } satisfies MemberFieldActionTarget,
        };
      case "member_status":
        return {
          value: statusMeta.label,
          filled: !!member.status,
          valueColor: statusMeta.color,
          actionTarget: {
            field,
            value: member.status,
            valueFieldType: "select",
            valueOptions: MEMBER_STATUS_OPTIONS,
            valueScope: "member",
            memberPatchKey: getOverviewMemberPatchKey(field) ?? undefined,
          } satisfies MemberFieldActionTarget,
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
                    interactive={Boolean(presentation.actionTarget)}
                    clickMode={
                      presentation.actionTarget &&
                      isInlineEditableMemberActionTarget(
                        presentation.actionTarget,
                      )
                        ? "text"
                        : "button"
                    }
                    onClick={() => {
                      if (!presentation.actionTarget) {
                        return;
                      }

                      if (
                        isInlineEditableMemberActionTarget(
                          presentation.actionTarget,
                        )
                      ) {
                        beginInlineEdit(presentation.actionTarget);
                        return;
                      }

                      if (presentation.actionTarget.valueScope === "member") {
                        fieldActions.openEditModal(presentation.actionTarget);
                      }
                    }}
                    isEditing={editingFieldId === field.id}
                    editingValue={editingValue}
                    onEditingValueChange={setEditingValue}
                    onSubmitEdit={() => {
                      if (!presentation.actionTarget) {
                        return;
                      }
                      void saveInlineEdit(presentation.actionTarget);
                    }}
                    onCancelEdit={cancelInlineEdit}
                    isSaving={savingFieldId === field.id}
                    editErrorMessage={
                      editingFieldId === field.id ? inlineErrorMessage : null
                    }
                    inputType={
                      presentation.actionTarget
                        ? getInlineInputType(presentation.actionTarget)
                        : "text"
                    }
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
            onRequestFieldMenu={({ field, value, position }) =>
              fieldActions.openFieldMenu(
                {
                  field,
                  value,
                  valueFieldType: field.fieldType,
                  valueOptions: getFieldChoiceOptions(
                    field.fieldType,
                    field.options,
                  ),
                  valueScope: "fieldValue",
                },
                position,
              )
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

      {fieldActions.contextMenu &&
      canManageActionTarget(fieldActions.contextMenu.target) ? (
        <MemberFieldContextMenu
          x={fieldActions.contextMenu.x}
          y={fieldActions.contextMenu.y}
          onRename={() =>
            fieldActions.openEditModal(fieldActions.contextMenu!.target)
          }
          onDelete={() =>
            fieldActions.openDeleteModal(fieldActions.contextMenu!.target)
          }
        />
      ) : null}

      <MemberFieldEditModal
        target={fieldActions.editTarget}
        isSubmitting={fieldActions.isEditing}
        errorMessage={fieldActions.editErrorMessage}
        onClose={fieldActions.closeEditModal}
        onSubmit={fieldActions.submitEdit}
      />

      <MemberFieldDeleteModal
        target={fieldActions.deleteTarget}
        isDeleting={fieldActions.isDeleting}
        errorMessage={fieldActions.deleteErrorMessage}
        onClose={fieldActions.closeDeleteModal}
        onDelete={fieldActions.confirmDelete}
      />
    </div>
  );
}
