"use client";

import { useRouter } from "next/navigation";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { RecordItem } from "../_lib/types";
import type { Space } from "../_hooks/use-current-space";
import type { MemberWithStatus } from "../_hooks/use-space-members";
import { useClickOutside } from "../_hooks";
import { CreateSpaceModal } from "./create-space-modal";
import { useAppRoute } from "@/lib/app-route-context";

export interface SidebarProps {
  records: RecordItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStartRecording: () => void;
  onFileUpload: () => void;
  spaces: Space[];
  currentSpace: Space | null;
  onSpaceChange: (id: string) => void;
  onSpaceCreated: (space: Space) => void;
  members: MemberWithStatus[];
  membersLoading: boolean;
  selectedMemberId: string | null;
  onSelectMember: (id: string) => void;
  onOpenQuickMemo: () => void;
  onDeleteRecord: (id: string) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
  onDeleteSpace: (id: string) => Promise<void>;
  onExportRecord: (id: string) => Promise<void>;
  onExportMember: (id: string) => Promise<void>;
}

type ContextMenuState = {
  kind: "space" | "member" | "record";
  ids: string[];
  primaryId: string;
  label: string;
  x: number;
  y: number;
} | null;

type SelectionState = {
  kind: "space" | "member" | "record" | null;
  ids: string[];
};

type DragSelectionState = {
  kind: "space" | "member" | "record";
  orderedIds: string[];
  anchorId: string;
};

function fmtDaysSince(days: number | null): string {
  if (days === null) return "상담 없음";
  if (days === 0) return "오늘";
  return `${days}일 전`;
}

function fmtMonthDay(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}-${day}`;
}

// ---------------------------------------------------------------------------
// MemberListItem — React.memo로 변경되지 않은 항목의 re-render를 차단
// 141명 기준 클릭 시 141번 → 2~3번(이전 선택 + 새 선택 + 확장 변경)으로 감소
// ---------------------------------------------------------------------------

interface MemberListItemProps {
  member: MemberWithStatus;
  memberRecords: RecordItem[];
  isMultiSelected: boolean;
  isActive: boolean;
  isExpanded: boolean;
  selectedRecordId: string | null;
  recordMultiSelectedSet: ReadonlySet<string>;
  /** ref 기반 안정 핸들러 — 참조가 변하지 않음 */
  actions: MemberItemActions;
}

interface MemberItemActions {
  onMemberClick: (
    e: React.MouseEvent,
    id: string,
    index: number,
    name: string,
  ) => void;
  onMemberMouseDown: (e: React.MouseEvent, id: string) => void;
  onMemberMouseEnter: (e: React.MouseEvent, id: string, index: number) => void;
  onMemberContextMenu: (
    e: React.MouseEvent,
    id: string,
    name: string,
    index: number,
  ) => void;
  onRecordClick: (e: React.MouseEvent, id: string, index: number) => void;
  onRecordMouseDown: (e: React.MouseEvent, id: string) => void;
  onRecordMouseEnter: (e: React.MouseEvent, id: string, index: number) => void;
  onRecordContextMenu: (
    e: React.MouseEvent,
    id: string,
    title: string,
    index: number,
  ) => void;
}

const MemberListItem = memo(
  function MemberListItem({
    member,
    memberRecords,
    isMultiSelected,
    isActive,
    isExpanded,
    selectedRecordId,
    recordMultiSelectedSet,
    actions,
  }: MemberListItemProps) {
    return (
      <div>
        <button
          className={`select-none w-full flex items-center gap-2 px-2 py-[7px] rounded-md text-left transition-colors cursor-pointer font-[inherit] border-none ${
            isMultiSelected
              ? "bg-accent-dim border border-accent-border"
              : isActive
                ? "bg-surface-3 border border-border-light"
                : "bg-transparent hover:bg-surface-3"
          }`}
          onMouseDown={(e) => actions.onMemberMouseDown(e, member.id)}
          onMouseEnter={(e) =>
            actions.onMemberMouseEnter(
              e,
              member.id,
              0 /* index resolved in parent */,
            )
          }
          onClick={(e) => actions.onMemberClick(e, member.id, 0, member.name)}
          onContextMenu={(e) =>
            actions.onMemberContextMenu(e, member.id, member.name, 0)
          }
        >
          {member.indicator === "recent" && (
            <span className="w-1.5 h-1.5 rounded-full bg-green flex-shrink-0" />
          )}
          {member.indicator === "warning" && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber flex-shrink-0" />
          )}
          {member.indicator === "none" && (
            <span className="w-1.5 h-1.5 rounded-full bg-surface-4 border border-border flex-shrink-0" />
          )}

          <span className="flex-1 text-sm truncate text-text">
            {member.name}
          </span>

          <span
            className={`text-[10px] flex-shrink-0 tabular-nums ${
              member.indicator === "recent"
                ? "text-green"
                : member.indicator === "warning"
                  ? "text-amber"
                  : "text-text-dim"
            }`}
          >
            {fmtDaysSince(member.daysSinceLast)}
          </span>

          {memberRecords.length > 0 && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className={`flex-shrink-0 text-text-dim transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            >
              <path
                d="M3 2l4 3-4 3"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {isExpanded && memberRecords.length > 0 && (
          <div className="ml-4 border-l border-border pl-2 mb-1">
            {memberRecords.map((rec) => (
              <button
                key={rec.id}
                className={`select-none w-full text-left px-2 py-[5px] rounded text-xs truncate transition-colors cursor-pointer font-[inherit] border-none ${
                  recordMultiSelectedSet.has(rec.id)
                    ? "bg-accent-dim text-text border border-accent-border"
                    : rec.id === selectedRecordId
                      ? "bg-surface-3 text-accent"
                      : "bg-transparent text-text-dim hover:text-text hover:bg-surface-3"
                }`}
                onMouseDown={(e) => actions.onRecordMouseDown(e, rec.id)}
                onMouseEnter={(e) => actions.onRecordMouseEnter(e, rec.id, 0)}
                onDragStart={(e) => e.preventDefault()}
                onClick={(e) => actions.onRecordClick(e, rec.id, 0)}
                onContextMenu={(e) =>
                  actions.onRecordContextMenu(e, rec.id, rec.title, 0)
                }
              >
                {rec.title}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
  (prev, next) =>
    // member 객체는 records 폴링마다 새 참조 → 필드 레벨 비교 필수
    prev.member.id === next.member.id &&
    prev.member.indicator === next.member.indicator &&
    prev.member.daysSinceLast === next.member.daysSinceLast &&
    prev.member.counselingCount === next.member.counselingCount &&
    prev.member.name === next.member.name &&
    prev.isMultiSelected === next.isMultiSelected &&
    prev.isActive === next.isActive &&
    prev.isExpanded === next.isExpanded &&
    prev.selectedRecordId === next.selectedRecordId &&
    // memberRecords는 records 폴링마다 새 배열 → length + 경계 ID로 비교
    (prev.memberRecords === next.memberRecords ||
      (prev.memberRecords.length === next.memberRecords.length &&
        (prev.memberRecords.length === 0 ||
          (prev.memberRecords[0].id === next.memberRecords[0].id &&
            prev.memberRecords.at(-1)!.id ===
              next.memberRecords.at(-1)!.id)))) &&
    prev.recordMultiSelectedSet === next.recordMultiSelectedSet &&
    prev.actions === next.actions,
);

export function Sidebar({
  records,
  selectedId,
  onSelect,
  onStartRecording,
  onFileUpload,
  spaces,
  currentSpace,
  onSpaceChange,
  onSpaceCreated,
  members,
  membersLoading,
  selectedMemberId,
  onSelectMember,
  onOpenQuickMemo,
  onDeleteRecord,
  onDeleteMember,
  onDeleteSpace,
  onExportRecord,
  onExportMember,
}: SidebarProps) {
  const router = useRouter();
  const { resolveAppHref } = useAppRoute();
  const [showMenu, setShowMenu] = useState(false);
  const [showSpaceDropdown, setShowSpaceDropdown] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [selection, setSelection] = useState<SelectionState>({
    kind: null,
    ids: [],
  });
  const [deletingContextId, setDeletingContextId] = useState<string | null>(
    null,
  );
  const lastSelectedIdRef = useRef<{
    space: string | null;
    member: string | null;
    record: string | null;
  }>({
    space: null,
    member: null,
    record: null,
  });
  const dragSelectionRef = useRef<DragSelectionState | null>(null);
  const suppressDefaultActionRef = useRef(false);

  const menuRef = useClickOutside<HTMLDivElement>(
    () => setShowMenu(false),
    showMenu,
  );
  const spaceRef = useClickOutside<HTMLDivElement>(
    () => setShowSpaceDropdown(false),
    showSpaceDropdown,
  );
  const contextMenuRef = useClickOutside<HTMLDivElement>(
    () => setContextMenu(null),
    !!contextMenu,
  );

  const getMemberRecords = (memberId: string) =>
    records.filter((r) => r.memberId === memberId);

  const unlinkedRecords = records.filter((r) => r.memberId === null);

  const toggleMember = (id: string) =>
    setExpandedMemberId((prev) => (prev === id ? null : id));

  const visibleRecordOrder = useMemo(
    () => [
      ...members.flatMap((member) => {
        if (expandedMemberId !== member.id) return [] as RecordItem[];
        return getMemberRecords(member.id);
      }),
      ...unlinkedRecords,
    ],
    [expandedMemberId, members, records],
  );

  const visibleRecordIndexById = useMemo(
    () =>
      new Map(visibleRecordOrder.map((record, index) => [record.id, index])),
    [visibleRecordOrder],
  );
  const spaceOrderIds = useMemo(
    () => spaces.map((space) => space.id),
    [spaces],
  );
  const memberOrderIds = useMemo(
    () => members.map((member) => member.id),
    [members],
  );
  const visibleRecordOrderIds = useMemo(
    () => visibleRecordOrder.map((record) => record.id),
    [visibleRecordOrder],
  );

  const selectedIdSet = useMemo(() => new Set(selection.ids), [selection.ids]);

  // ── 멤버별 records 캐시 (members/records 변경 시만 재계산) ─────
  const memberRecordsMap = useMemo(() => {
    const map = new Map<string, RecordItem[]>();
    for (const member of members) {
      map.set(
        member.id,
        records.filter((r) => r.memberId === member.id),
      );
    }
    return map;
  }, [members, records]);

  // record multi-select set (kind가 record일 때만 유의미)
  const recordMultiSelectedSet = useMemo(
    () =>
      selection.kind === "record"
        ? selectedIdSet
        : (new Set<string>() as ReadonlySet<string>),
    [selection.kind, selectedIdSet],
  );

  // ── ref 기반 안정 핸들러 (MemberListItem에 전달) ──────────────
  const sidebarActionsRef = useRef({
    handleSelectableClick: (() => {}) as typeof handleSelectableClick,
    beginDragSelection: (() => {}) as typeof beginDragSelection,
    extendDragSelection: (() => {}) as typeof extendDragSelection,
    openContextMenu: (() => {}) as typeof openContextMenu,
    onSelectMember,
    onSelect,
    setExpandedMemberId,
    memberOrderIds,
    visibleRecordOrderIds,
    visibleRecordOrder,
    visibleRecordIndexById,
    members,
  });
  // render마다 최신값으로 갱신 — ref이므로 자식 re-render를 유발하지 않음
  sidebarActionsRef.current = {
    handleSelectableClick,
    beginDragSelection,
    extendDragSelection,
    openContextMenu,
    onSelectMember,
    onSelect,
    setExpandedMemberId,
    memberOrderIds,
    visibleRecordOrderIds,
    visibleRecordOrder,
    visibleRecordIndexById,
    members,
  };

  // 안정 actions 객체 — useCallback으로 참조 고정, 내부에서 ref.current 사용
  const memberItemActions = useMemo<MemberItemActions>(
    () => ({
      onMemberClick: (e, id, _index, _name) => {
        const a = sidebarActionsRef.current;
        const index = a.members.findIndex((m) => m.id === id);
        a.handleSelectableClick({
          event: e,
          kind: "member",
          id,
          index,
          orderedIds: a.memberOrderIds,
          onDefault: () => {
            a.onSelectMember(id);
            a.setExpandedMemberId(id);
          },
        });
      },
      onMemberMouseDown: (e, id) => {
        const a = sidebarActionsRef.current;
        a.beginDragSelection({
          event: e,
          kind: "member",
          id,
          orderedIds: a.memberOrderIds,
        });
      },
      onMemberMouseEnter: (e, id, _index) => {
        const a = sidebarActionsRef.current;
        const index = a.members.findIndex((m) => m.id === id);
        a.extendDragSelection({
          event: e,
          kind: "member",
          id,
          index,
          orderedIds: a.memberOrderIds,
        });
      },
      onMemberContextMenu: (e, id, label, _index) => {
        const a = sidebarActionsRef.current;
        const index = a.members.findIndex((m) => m.id === id);
        a.openContextMenu(e, { kind: "member", id, label, index });
      },
      onRecordClick: (e, id, _index) => {
        const a = sidebarActionsRef.current;
        const index = a.visibleRecordIndexById.get(id) ?? 0;
        a.handleSelectableClick({
          event: e,
          kind: "record",
          id,
          index,
          orderedIds: a.visibleRecordOrder.map((r) => r.id),
          onDefault: () => a.onSelect(id),
        });
      },
      onRecordMouseDown: (e, id) => {
        const a = sidebarActionsRef.current;
        a.beginDragSelection({
          event: e,
          kind: "record",
          id,
          orderedIds: a.visibleRecordOrderIds,
        });
      },
      onRecordMouseEnter: (e, id, _index) => {
        const a = sidebarActionsRef.current;
        const index = a.visibleRecordIndexById.get(id) ?? 0;
        a.extendDragSelection({
          event: e,
          kind: "record",
          id,
          index,
          orderedIds: a.visibleRecordOrderIds,
        });
      },
      onRecordContextMenu: (e, id, label, _index) => {
        const a = sidebarActionsRef.current;
        const index = a.visibleRecordIndexById.get(id) ?? 0;
        a.openContextMenu(e, { kind: "record", id, label, index });
      },
    }),
    [], // deps 없음 — ref 기반이므로 항상 최신값 사용, 참조 영구 고정
  );

  useEffect(() => {
    if (selection.kind === null) {
      return;
    }

    const orderedIds =
      selection.kind === "space"
        ? spaceOrderIds
        : selection.kind === "member"
          ? memberOrderIds
          : visibleRecordOrderIds;
    const nextIds = selection.ids.filter((id) => orderedIds.includes(id));

    if (nextIds.length === 0) {
      if (selection.ids.length > 0) {
        setSelection({ kind: null, ids: [] });
      }
      lastSelectedIdRef.current[selection.kind] = null;
      if (contextMenu?.kind === selection.kind) {
        setContextMenu(null);
      }
      return;
    }

    if (nextIds.length !== selection.ids.length) {
      setSelection({ kind: selection.kind, ids: nextIds });
    }

    const currentAnchorId = lastSelectedIdRef.current[selection.kind];
    if (!currentAnchorId || !orderedIds.includes(currentAnchorId)) {
      lastSelectedIdRef.current[selection.kind] = nextIds.at(-1) ?? null;
    }

    if (contextMenu?.kind === selection.kind) {
      const nextContextIds = contextMenu.ids.filter((id) =>
        orderedIds.includes(id),
      );
      if (nextContextIds.length === 0) {
        setContextMenu(null);
      } else if (nextContextIds.length !== contextMenu.ids.length) {
        setContextMenu({
          ...contextMenu,
          ids: nextContextIds,
          primaryId: nextContextIds.includes(contextMenu.primaryId)
            ? contextMenu.primaryId
            : nextContextIds[0],
        });
      }
    }
  }, [
    contextMenu,
    memberOrderIds,
    selection,
    spaceOrderIds,
    visibleRecordOrderIds,
  ]);

  useEffect(() => {
    const handleMouseUp = () => {
      dragSelectionRef.current = null;
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);
  const contextDeleteLabel = useMemo(() => {
    if (!contextMenu) return "삭제";
    const count = contextMenu.ids.length;
    if (contextMenu.kind === "space") {
      return count > 1 ? `선택한 스페이스 ${count}개 삭제` : "스페이스 삭제";
    }
    if (contextMenu.kind === "member") {
      return count > 1 ? `선택한 수강생 ${count}명 삭제` : "수강생 삭제";
    }
    return count > 1 ? `선택한 상담 기록 ${count}개 삭제` : "상담 기록 삭제";
  }, [contextMenu]);

  function getOrderedIdsForKind(kind: "space" | "member" | "record") {
    if (kind === "space") return spaceOrderIds;
    if (kind === "member") return memberOrderIds;
    return visibleRecordOrderIds;
  }

  function clearSelection() {
    setSelection({ kind: null, ids: [] });
    setContextMenu(null);
  }

  function getSelectionLabel(kind: "space" | "member" | "record", id: string) {
    if (kind === "space") {
      return spaces.find((space) => space.id === id)?.name ?? "선택 항목";
    }

    if (kind === "member") {
      return members.find((member) => member.id === id)?.name ?? "선택 항목";
    }

    return records.find((record) => record.id === id)?.title ?? "선택 항목";
  }

  function buildDeleteConfirmationMessage(params: {
    kind: "space" | "member" | "record";
    ids: string[];
    primaryId: string;
    label?: string;
  }) {
    const count = params.ids.length;
    const resolvedLabel =
      params.label ?? getSelectionLabel(params.kind, params.primaryId);

    if (params.kind === "space") {
      return count > 1
        ? `선택한 스페이스 ${count}개를 정말로 삭제하시겠습니까?`
        : `스페이스 "${resolvedLabel}"을 정말로 삭제하시겠습니까?`;
    }

    if (params.kind === "member") {
      return count > 1
        ? `선택한 수강생 ${count}명을 정말로 삭제하시겠습니까?`
        : `수강생 "${resolvedLabel}"을 정말로 삭제하시겠습니까?`;
    }

    return count > 1
      ? `선택한 상담 기록 ${count}개를 삭제하시겠습니까?`
      : `상담 기록 "${resolvedLabel}"을 삭제하시겠습니까?`;
  }

  async function deleteSelection(params: {
    kind: "space" | "member" | "record";
    ids: string[];
    primaryId: string;
    label?: string;
  }) {
    const confirmationMessage = buildDeleteConfirmationMessage(params);
    const confirmed = window.confirm(confirmationMessage);
    if (!confirmed) return;

    setDeletingContextId(params.primaryId);
    try {
      for (const id of params.ids) {
        if (params.kind === "space") {
          await onDeleteSpace(id);
        } else if (params.kind === "member") {
          await onDeleteMember(id);
        } else {
          await onDeleteRecord(id);
        }
      }
      clearSelection();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "삭제 처리에 실패했습니다.",
      );
    } finally {
      setDeletingContextId(null);
    }
  }

  function handleSidebarKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    const isTextInput =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable;

    if (event.key === "Escape") {
      if (selection.ids.length > 0 || contextMenu) {
        event.preventDefault();
        clearSelection();
      }
      return;
    }

    if (
      (event.key === "Delete" || event.key === "Backspace") &&
      !isTextInput &&
      selection.kind !== null &&
      selection.ids.length > 0
    ) {
      event.preventDefault();
      void deleteSelection({
        kind: selection.kind,
        ids: selection.ids,
        primaryId: selection.ids[0],
      });
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      if (isTextInput) {
        return;
      }

      const activeKind =
        selection.kind ??
        contextMenu?.kind ??
        (showSpaceDropdown ? "space" : selectedId ? "record" : "member");
      const orderedIds = getOrderedIdsForKind(activeKind);

      if (orderedIds.length === 0) {
        return;
      }

      event.preventDefault();
      updateSelection(
        activeKind,
        orderedIds,
        orderedIds.at(-1) ?? orderedIds[0],
      );
    }
  }

  function clearBrowserTextSelection() {
    window.getSelection()?.removeAllRanges();
  }

  function beginDragSelection(params: {
    event: React.MouseEvent;
    kind: "space" | "member" | "record";
    id: string;
    orderedIds: string[];
  }) {
    const { event, kind, id, orderedIds } = params;
    if (event.button !== 0) {
      return;
    }

    if (!event.shiftKey) {
      dragSelectionRef.current = null;
      suppressDefaultActionRef.current = false;
      return;
    }

    event.preventDefault();
    clearBrowserTextSelection();

    dragSelectionRef.current = {
      kind,
      orderedIds,
      anchorId: id,
    };
    suppressDefaultActionRef.current = false;
  }

  function extendDragSelection(params: {
    event: React.MouseEvent;
    kind: "space" | "member" | "record";
    id: string;
    index: number;
    orderedIds: string[];
  }) {
    const { event, kind, index, orderedIds } = params;
    const drag = dragSelectionRef.current;
    if (!drag || event.buttons !== 1 || drag.kind !== kind) {
      return;
    }

    const anchorIndex = orderedIds.indexOf(drag.anchorId);
    const resolvedAnchorIndex = anchorIndex >= 0 ? anchorIndex : index;
    const start = Math.min(resolvedAnchorIndex, index);
    const end = Math.max(resolvedAnchorIndex, index);
    suppressDefaultActionRef.current = true;
    clearBrowserTextSelection();
    updateSelection(kind, orderedIds.slice(start, end + 1), drag.anchorId);
  }

  function updateSelection(
    kind: "space" | "member" | "record",
    ids: string[],
    anchorId: string,
  ) {
    setSelection({ kind, ids });
    lastSelectedIdRef.current[kind] = anchorId;
  }

  function handleSelectableClick(params: {
    event: React.MouseEvent;
    kind: "space" | "member" | "record";
    id: string;
    index: number;
    orderedIds: string[];
    onDefault: () => void;
  }) {
    const { event, kind, id, index, orderedIds, onDefault } = params;
    setContextMenu(null);

    if (suppressDefaultActionRef.current) {
      suppressDefaultActionRef.current = false;
      return;
    }

    if (event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      clearBrowserTextSelection();

      if (selection.kind === kind && selectedIdSet.has(id)) {
        const nextIds = selection.ids.filter((itemId) => itemId !== id);
        if (nextIds.length === 0) {
          clearSelection();
          lastSelectedIdRef.current[kind] = null;
          return;
        }

        const currentAnchorId = lastSelectedIdRef.current[kind];
        const nextAnchorId =
          currentAnchorId && nextIds.includes(currentAnchorId)
            ? currentAnchorId
            : (nextIds.at(-1) ?? id);
        updateSelection(kind, nextIds, nextAnchorId);
        return;
      }

      const anchorId =
        selection.kind === kind ? lastSelectedIdRef.current[kind] : null;
      const anchorIndex = anchorId ? orderedIds.indexOf(anchorId) : -1;
      const resolvedAnchorIndex = anchorIndex >= 0 ? anchorIndex : index;

      const start = Math.min(resolvedAnchorIndex, index);
      const end = Math.max(resolvedAnchorIndex, index);
      const nextAnchorId = anchorIndex >= 0 && anchorId ? anchorId : id;
      updateSelection(kind, orderedIds.slice(start, end + 1), nextAnchorId);
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
      clearBrowserTextSelection();

      const baseIds = selection.kind === kind ? selection.ids : [];
      const nextIds = selectedIdSet.has(id)
        ? baseIds.filter((itemId) => itemId != id)
        : [...baseIds, id];

      if (nextIds.length === 0) {
        clearSelection();
        lastSelectedIdRef.current[kind] = null;
        return;
      }

      updateSelection(kind, nextIds, id);
      return;
    }

    updateSelection(kind, [id], id);
    onDefault();
  }

  function openContextMenu(
    event: React.MouseEvent,
    menu: {
      kind: "space" | "member" | "record";
      id: string;
      label: string;
      index: number;
    },
  ) {
    event.preventDefault();
    event.stopPropagation();
    const ids =
      selection.kind === menu.kind && selectedIdSet.has(menu.id)
        ? selection.ids
        : [menu.id];

    updateSelection(menu.kind, ids, menu.id);
    setContextMenu({
      kind: menu.kind,
      ids,
      primaryId: menu.id,
      label: menu.label,
      x: event.clientX,
      y: event.clientY,
    });
    setShowMenu(false);
    setShowSpaceDropdown(false);
  }

  async function handleContextDelete() {
    if (!contextMenu) return;

    await deleteSelection({
      kind: contextMenu.kind,
      ids: contextMenu.ids,
      primaryId: contextMenu.primaryId,
      label: contextMenu.label,
    });
  }

  const contextActions = useMemo(() => {
    if (!contextMenu)
      return [] as Array<{
        key: string;
        label: string;
        destructive?: boolean;
        action: () => Promise<void> | void;
      }>;

    const single = contextMenu.ids.length === 1;
    const actions: Array<{
      key: string;
      label: string;
      destructive?: boolean;
      action: () => Promise<void> | void;
    }> = [];

    if (contextMenu.kind === "space" && single) {
      actions.push({
        key: "open-space",
        label: "열기",
        action: () => {
          onSpaceChange(contextMenu.primaryId);
          setShowSpaceDropdown(false);
          setContextMenu(null);
        },
      });
      actions.push({
        key: "goto-student-management",
        label: "수강생 관리로 이동",
        action: () => {
          router.push(resolveAppHref("/home/student-management"));
          setContextMenu(null);
        },
      });
    }

    if (contextMenu.kind === "member" && single) {
      actions.push({
        key: "open-member",
        label: "열기",
        action: () => {
          onSelectMember(contextMenu.primaryId);
          toggleMember(contextMenu.primaryId);
          setContextMenu(null);
        },
      });
      actions.push({
        key: "open-member-management",
        label: "수강생 관리에서 열기",
        action: () => {
          router.push(
            resolveAppHref(`/home/student-management/${contextMenu.primaryId}`),
          );
          setContextMenu(null);
        },
      });
      actions.push({
        key: "export-member-report",
        label: "리포트 내보내기",
        action: async () => {
          await onExportMember(contextMenu.primaryId);
          setContextMenu(null);
        },
      });
    }

    if (contextMenu.kind === "record" && single) {
      actions.push({
        key: "open-record",
        label: "열기",
        action: () => {
          onSelect(contextMenu.primaryId);
          setContextMenu(null);
        },
      });
      actions.push({
        key: "export-record-docx",
        label: "DOCX 내보내기",
        action: async () => {
          await onExportRecord(contextMenu.primaryId);
          setContextMenu(null);
        },
      });
    }

    actions.push({
      key: "delete",
      label: contextDeleteLabel,
      destructive: true,
      action: () => handleContextDelete(),
    });

    return actions;
  }, [
    contextDeleteLabel,
    contextMenu,
    onExportMember,
    onExportRecord,
    onSelect,
    onSelectMember,
    onSpaceChange,
    router,
  ]);

  return (
    <div
      className="w-64 border-r border-border flex flex-col bg-surface overflow-hidden"
      tabIndex={0}
      onKeyDown={handleSidebarKeyDown}
    >
      {/* 스페이스 셀렉터 */}
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <div className="relative" ref={spaceRef}>
          <button
            className="w-full flex items-center justify-between gap-2 px-3 py-[7px] rounded-md bg-surface-3 border border-border-light text-sm font-medium text-text hover:bg-surface-4 transition-colors cursor-pointer"
            onClick={() => setShowSpaceDropdown((p) => !p)}
          >
            <span className="truncate">
              {currentSpace?.name ?? "스페이스 선택"}
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className={`flex-shrink-0 text-text-dim transition-transform duration-150 ${showSpaceDropdown ? "rotate-180" : ""}`}
            >
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {showSpaceDropdown && (
            <div className="scrollbar-subtle absolute top-[calc(100%+4px)] left-0 right-0 bg-surface-3 border border-border-light rounded-md py-1 z-50 shadow-[0_8px_24px_rgba(0,0,0,0.35)] max-h-48 overflow-y-auto">
              {spaces.length === 0 ? (
                <div className="px-3 py-2 text-xs text-text-dim">
                  스페이스 없음
                </div>
              ) : (
                spaces.map((space) => (
                  <button
                    key={space.id}
                    className={`w-full px-3 py-[7px] text-left text-sm transition-colors cursor-pointer font-[inherit] border-none ${
                      space.id === currentSpace?.id
                        ? "bg-surface-4"
                        : selection.kind === "space" &&
                            selectedIdSet.has(space.id)
                          ? "bg-accent-dim"
                          : "bg-transparent hover:bg-surface-4"
                    } ${
                      space.id === currentSpace?.id
                        ? "text-accent"
                        : "text-text"
                    }`}
                    onDragStart={(event) => {
                      event.preventDefault();
                    }}
                    onClick={(event) =>
                      handleSelectableClick({
                        event,
                        kind: "space",
                        id: space.id,
                        index: spaces.findIndex((item) => item.id === space.id),
                        orderedIds: spaces.map((item) => item.id),
                        onDefault: () => {
                          onSpaceChange(space.id);
                          clearSelection();
                          setShowSpaceDropdown(false);
                        },
                      })
                    }
                    onContextMenu={(event) =>
                      openContextMenu(event, {
                        kind: "space",
                        id: space.id,
                        label: space.name,
                        index: spaces.findIndex((item) => item.id === space.id),
                      })
                    }
                  >
                    {space.name}
                  </button>
                ))
              )}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  className="w-full px-3 py-[7px] text-left text-xs text-accent hover:bg-surface-4 transition-colors cursor-pointer font-[inherit] border-none bg-transparent"
                  onClick={() => {
                    setShowSpaceDropdown(false);
                    setShowCreateSpace(true);
                  }}
                >
                  + 새 스페이스 만들기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selection.ids.length > 0 && (
        <div className="border-t border-border px-3 py-2 text-[11px] text-text-secondary bg-surface-2/80">
          <div className="font-medium text-text">
            {selection.ids.length}개 선택됨
          </div>
        </div>
      )}

      {/* 스크롤 영역 */}
      <div className="scrollbar-subtle flex-1 overflow-y-auto">
        {/* 수강생 섹션 */}
        <div className="px-2 py-2">
          <div
            className="flex items-center justify-between px-2 py-1 mb-0.5"
            data-tutorial="members-section"
          >
            <span className="text-[10px] font-semibold text-text-dim uppercase tracking-widest">
              수강생
            </span>
            {!membersLoading && (
              <span className="text-[10px] text-text-dim">
                {members.length}명
              </span>
            )}
          </div>

          {membersLoading ? (
            <div className="px-3 py-3 text-xs text-text-dim text-center">
              불러오는 중…
            </div>
          ) : members.length === 0 ? (
            <div className="px-3 py-3 text-xs text-text-dim">
              {currentSpace
                ? "등록된 수강생이 없습니다"
                : "스페이스를 선택하세요"}
            </div>
          ) : (
            members.map((member) => (
              <MemberListItem
                key={member.id}
                member={member}
                memberRecords={memberRecordsMap.get(member.id)!}
                isMultiSelected={
                  selection.kind === "member" && selectedIdSet.has(member.id)
                }
                isActive={member.id === selectedMemberId}
                isExpanded={expandedMemberId === member.id}
                selectedRecordId={selectedId}
                recordMultiSelectedSet={recordMultiSelectedSet}
                actions={memberItemActions}
              />
            ))
          )}
        </div>

        {/* 미분류 섹션 */}
        {unlinkedRecords.length > 0 && (
          <div className="px-2 py-2 border-t border-border">
            <div className="flex items-center justify-between px-2 py-1 mb-0.5">
              <span className="text-[10px] font-semibold text-text-dim uppercase tracking-widest">
                미분류
              </span>
              <span className="text-[10px] text-text-dim">
                {unlinkedRecords.length}
              </span>
            </div>

            {unlinkedRecords.map((rec) => (
              <button
                key={rec.id}
                className={`w-full flex items-center gap-2 px-2 py-[7px] rounded-md text-left text-xs transition-colors cursor-pointer font-[inherit] border-none ${
                  selection.kind === "record" && selectedIdSet.has(rec.id)
                    ? "bg-accent-dim border border-accent-border text-text"
                    : rec.id === selectedId
                      ? "bg-surface-3 border border-border-light text-text"
                      : "bg-transparent text-text-dim hover:text-text hover:bg-surface-3"
                }`}
                onMouseDown={(event) =>
                  beginDragSelection({
                    event,
                    kind: "record",
                    id: rec.id,
                    orderedIds: visibleRecordOrderIds,
                  })
                }
                onMouseEnter={(event) =>
                  extendDragSelection({
                    event,
                    kind: "record",
                    id: rec.id,
                    index: visibleRecordIndexById.get(rec.id) ?? 0,
                    orderedIds: visibleRecordOrderIds,
                  })
                }
                onClick={(event) =>
                  handleSelectableClick({
                    event,
                    kind: "record",
                    id: rec.id,
                    index: visibleRecordIndexById.get(rec.id) ?? 0,
                    orderedIds: visibleRecordOrder.map((item) => item.id),
                    onDefault: () => onSelect(rec.id),
                  })
                }
                onContextMenu={(event) =>
                  openContextMenu(event, {
                    kind: "record",
                    id: rec.id,
                    label: rec.title,
                    index: visibleRecordIndexById.get(rec.id) ?? 0,
                  })
                }
              >
                <span className="text-[10px] text-text-dim flex-shrink-0 w-9 tabular-nums">
                  {fmtMonthDay(rec.createdAt)}
                </span>
                <span className="truncate">{rec.title}</span>
                {rec.status === "processing" && (
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreateSpace && (
        <CreateSpaceModal
          onClose={() => setShowCreateSpace(false)}
          onCreated={(space) => {
            onSpaceCreated(space);
            setShowCreateSpace(false);
          }}
        />
      )}

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed min-w-[168px] rounded-md border border-border-light bg-surface-3 py-1 shadow-[0_12px_32px_rgba(0,0,0,0.42)] z-[120]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextActions.map((action, index) => (
            <button
              key={action.key}
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-2 bg-transparent border-none text-left text-[12px] font-medium cursor-pointer hover:bg-surface-4 disabled:opacity-50 ${
                action.destructive ? "text-red" : "text-text"
              } ${index > 0 && action.destructive ? "border-t border-border" : ""}`}
              onClick={() => void action.action()}
              disabled={
                action.key === "delete" &&
                deletingContextId === contextMenu.primaryId
              }
            >
              <span>
                {action.key === "delete"
                  ? "🗑"
                  : action.key === "open-space" ||
                      action.key === "open-member" ||
                      action.key === "open-record"
                    ? "📂"
                    : action.key === "goto-student-management" ||
                        action.key === "open-member-management"
                      ? "👥"
                      : action.key.includes("export")
                        ? "📄"
                        : "•"}
              </span>
              {action.key === "delete" &&
              deletingContextId === contextMenu.primaryId
                ? "삭제 중..."
                : action.label}
            </button>
          ))}
        </div>
      )}

      {/* 하단 버튼 */}
      {records.length > 0 ? (
        <div className="px-3 py-3 border-t border-border">
          <div className="relative" ref={menuRef}>
            <button
              className="w-full bg-accent text-white py-[8px] rounded-md text-[12px] font-medium cursor-pointer hover:opacity-90 transition-opacity font-[inherit] border-none"
              onClick={() => setShowMenu((p) => !p)}
              data-tutorial="new-record-btn"
            >
              + 새 상담 기록
            </button>

            {showMenu && (
              <div className="absolute bottom-[calc(100%+4px)] left-0 right-0 bg-surface-3 border border-border-light rounded-md py-1 z-50 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                <button
                  className="flex items-center gap-2 w-full px-3 py-[7px] bg-transparent border-none text-text text-xs font-[inherit] cursor-pointer text-left hover:bg-surface-4 transition-colors"
                  onClick={() => {
                    setShowMenu(false);
                    onStartRecording();
                  }}
                >
                  🎙 바로 녹음
                </button>
                <button
                  className="flex items-center gap-2 w-full px-3 py-[7px] bg-transparent border-none text-text text-xs font-[inherit] cursor-pointer text-left hover:bg-surface-4 transition-colors"
                  onClick={() => {
                    setShowMenu(false);
                    onFileUpload();
                  }}
                >
                  📁 파일 업로드
                </button>
                <button
                  className="flex items-center gap-2 w-full px-3 py-[7px] bg-transparent border-none text-text text-xs font-[inherit] cursor-pointer text-left hover:bg-surface-4 transition-colors"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenQuickMemo();
                  }}
                >
                  ✏️ 텍스트 메모
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
