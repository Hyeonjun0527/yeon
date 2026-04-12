"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  AlertTriangle,
  ClipboardCheck,
  LayoutGrid,
  List,
  Plus,
  Settings,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useMemberList } from "../hooks/use-member-list";
import { useBulkMemberDelete } from "../hooks/use-bulk-member-delete";
import { useMemberSelection } from "../hooks/use-member-selection";
import { useStudentManagement } from "../student-management-provider";
import { MEMBER_STATUS_META, RISK_LEVEL_META } from "../constants";
import type { RiskLevel } from "../types";
import { SheetExportPanel } from "../components/sheet-export-panel";
import { useSpaceSettingsDrawer } from "../../space-settings";
import { StudentTutorial } from "@/components/tutorial";
import { useAppRoute } from "@/lib/app-route-context";

function getMemberContact(member: {
  email?: string | null;
  phone?: string | null;
}) {
  return member.email ?? member.phone ?? "연락처 없음";
}

function getMemberInitial(name: string) {
  return name.charAt(0);
}

export function StudentListScreen() {
  const { spaces, selectedSpaceId, refetchMembers } = useStudentManagement();

  const { filteredMembers, viewMode, setViewMode, loading, error } =
    useMemberList();

  const { openSpaceSettings } = useSpaceSettingsDrawer();
  const router = useRouter();
  const { resolveAppHref } = useAppRoute();

  const currentSpace = spaces.find((s) => s.id === selectedSpaceId) ?? null;
  const spaceName = currentSpace?.name ?? null;
  const detailBaseHref = selectedSpaceId
    ? (memberId: string) =>
        `${resolveAppHref(`/home/student-management/${memberId}`)}?spaceId=${selectedSpaceId}`
    : (memberId: string) =>
        resolveAppHref(`/home/student-management/${memberId}`);

  const visibleMemberIds = useMemo(
    () => filteredMembers.map((member) => member.id),
    [filteredMembers],
  );

  const {
    selectedIds,
    selectedCount,
    handleSelectMember,
    clearSelection: handleClearSelection,
  } = useMemberSelection(visibleMemberIds);

  const {
    isDeletingSelected,
    deleteError,
    clearDeleteError,
    handleBulkDelete,
  } = useBulkMemberDelete({
    selectedSpaceId,
    selectedIds,
    onDeleted: () => {
      handleClearSelection();
      refetchMembers();
    },
  });

  const isEmpty = !loading && !error && filteredMembers.length === 0;
  const hasMembers = !loading && !error && filteredMembers.length > 0;

  // ── 가상 스크롤 ─────────────────────────────────────────────────
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);

  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;

    // 스크롤 컨테이너 = 가장 가까운 <main>
    setScrollElement(el.closest("main") as HTMLElement | null);

    // 컨테이너 너비 관찰 → 카드 모드 컬럼 수 계산
    const observer = new ResizeObserver(([entry]) => {
      setGridWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const CARD_MIN_W = 260;
  const CARD_GAP = 16;
  const columnCount =
    viewMode === "dense"
      ? 1
      : gridWidth > 0
        ? Math.max(
            1,
            Math.floor((gridWidth + CARD_GAP) / (CARD_MIN_W + CARD_GAP)),
          )
        : 1;
  const rowCount = Math.ceil(filteredMembers.length / columnCount);

  const scrollMarginTop = gridContainerRef.current?.offsetTop ?? 0;

  const rowVirtualizer = useVirtualizer({
    count: hasMembers ? rowCount : 0,
    getScrollElement: () => scrollElement,
    estimateSize: () => (viewMode === "dense" ? 48 : 200),
    overscan: 5,
    scrollMargin: scrollMarginTop,
  });

  const viewModeToggle = (
    <div className="flex items-center rounded-lg border border-border bg-surface-2 p-1">
      <button
        type="button"
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors ${
          viewMode === "card"
            ? "bg-surface-3 text-text shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
            : "text-text-dim hover:text-text"
        }`}
        onClick={() => setViewMode("card")}
        aria-pressed={viewMode === "card"}
        aria-label="카드 보기"
      >
        <LayoutGrid size={14} />
        카드
      </button>
      <button
        type="button"
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors ${
          viewMode === "dense"
            ? "bg-surface-3 text-text shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
            : "text-text-dim hover:text-text"
        }`}
        onClick={() => setViewMode("dense")}
        aria-pressed={viewMode === "dense"}
        aria-label="촘촘히 보기"
      >
        <List size={14} />
        촘촘히
      </button>
    </div>
  );

  const handleMemberCardClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, memberId: string) => {
      clearDeleteError();

      if (event.shiftKey) {
        event.preventDefault();
        handleSelectMember(memberId, {
          shiftKey: true,
          shouldSelect: true,
        });
        return;
      }

      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        handleSelectMember(memberId, {
          shouldSelect: !selectedIds.has(memberId),
        });
        return;
      }

      router.push(detailBaseHref(memberId));
    },
    [clearDeleteError, detailBaseHref, handleSelectMember, router, selectedIds],
  );

  const handleMemberCardKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, memberId: string) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();

      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        handleSelectMember(memberId, {
          shiftKey: event.shiftKey,
          shouldSelect: !selectedIds.has(memberId),
        });
        return;
      }

      router.push(detailBaseHref(memberId));
    },
    [detailBaseHref, handleSelectMember, router, selectedIds],
  );

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h2
              className="text-xl font-bold tracking-[-0.02em] text-text sm:text-2xl"
              data-tutorial="space-title"
            >
              {spaceName ?? "전체 수강생"}
            </h2>
            {!loading && (
              <p className="mt-0.5 text-sm text-text-secondary">
                {filteredMembers.length}명
              </p>
            )}
          </div>

          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:justify-end md:gap-[10px]">
            {selectedSpaceId && (
              <button
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-3 hover:text-text md:px-3.5 md:text-[13px]"
                onClick={() =>
                  selectedSpaceId &&
                  openSpaceSettings({ spaceId: selectedSpaceId })
                }
                title="수강생 탭·항목 설정"
              >
                <Settings size={14} />
                스페이스 설정
              </button>
            )}

            <Link
              href={
                selectedSpaceId
                  ? `${resolveAppHref("/home/student-management/check-board")}?spaceId=${selectedSpaceId}`
                  : resolveAppHref("/home/student-management/check-board")
              }
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-3 hover:text-text md:px-3.5 md:text-[13px]"
            >
              <ClipboardCheck size={14} />
              출석·과제 보드
            </Link>

            <Link
              href={resolveAppHref("/home/student-management/members/new")}
              data-tutorial="add-member-btn"
              className="col-span-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-95 md:col-span-1"
            >
              <Plus size={16} />
              수강생 추가
            </Link>
          </div>
        </div>

        {selectedSpaceId && <SheetExportPanel spaceId={selectedSpaceId} />}
      </div>

      <div className="mb-4 flex justify-end">
        {hasMembers ? (
          viewModeToggle
        ) : (
          <div className="hidden md:block">{viewModeToggle}</div>
        )}
      </div>

      {deleteError ? (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
          {deleteError}
        </div>
      ) : null}

      {selectedCount > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-border bg-accent-dim px-4 py-3">
          <div className="text-sm font-medium text-text">
            {selectedCount}명 선택됨
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-text-secondary transition-colors hover:border-border-light hover:text-text"
              onClick={handleClearSelection}
            >
              <X size={14} />
              선택 해제
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              onClick={() => void handleBulkDelete()}
              disabled={isDeletingSelected}
            >
              <Trash2 size={14} />
              {isDeletingSelected ? "삭제 중..." : "선택 삭제"}
            </button>
          </div>
        </div>
      ) : null}

      {/* 로딩 */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
          <p style={{ color: "var(--text-dim)", fontSize: 14 }}>
            불러오는 중...
          </p>
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
          <p style={{ color: "var(--red)", fontSize: 14 }}>{error}</p>
        </div>
      )}

      {/* 빈 상태 */}
      {isEmpty && (
        <div
          className="flex flex-col items-center justify-center py-20 px-5 text-center"
          data-tutorial="member-empty-state"
        >
          <User size={40} className="text-text-dim mb-4" />
          <p className="text-lg font-semibold text-text mb-2">
            수강생이 없습니다.
          </p>
          <>
            <p className="max-w-md text-sm leading-relaxed text-text-secondary">
              {selectedSpaceId
                ? "이 스페이스는 아직 비어 있습니다. 상단의 수강생 추가로 바로 등록하거나, 다음 스페이스는 왼쪽 하단의 스페이스 만들기에서 외부 파일 가져오기로 시작할 수 있습니다."
                : "왼쪽에서 스페이스를 선택하거나, 새 스페이스를 만든 뒤 시작해보세요."}
            </p>
            {selectedSpaceId ? (
              <p className="mt-3 text-[12px] leading-relaxed text-text-dim">
                부트캠프 운영에서는 엑셀/CSV 가져오기로 시작하는 흐름을
                권장합니다.
              </p>
            ) : null}
          </>
        </div>
      )}

      {/* 수강생 목록 (가상 스크롤) */}
      {hasMembers && (
        <div
          ref={gridContainerRef}
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const startIdx = virtualRow.index * columnCount;
            const endIdx = Math.min(
              startIdx + columnCount,
              filteredMembers.length,
            );
            const rowMembers = filteredMembers.slice(startIdx, endIdx);

            return (
              <div
                key={virtualRow.key}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                }}
                className={
                  viewMode === "dense"
                    ? "grid gap-1.5"
                    : "grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))] max-md:grid-cols-1"
                }
              >
                {rowMembers.map((member) => {
                  const statusMeta =
                    MEMBER_STATUS_META[member.status] ??
                    MEMBER_STATUS_META.active;
                  const resolvedRiskLevel =
                    member.aiRiskLevel ?? member.initialRiskLevel;
                  const riskMeta = resolvedRiskLevel
                    ? RISK_LEVEL_META[resolvedRiskLevel as RiskLevel]
                    : null;
                  const isSelected = selectedIds.has(member.id);

                  return (
                    <div
                      key={member.id}
                      data-tutorial={
                        member === filteredMembers[0]
                          ? "member-card"
                          : undefined
                      }
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`${member.name} ${isSelected ? "선택됨" : "선택 안 됨"}`}
                      className={`relative border transition-all duration-150 ${
                        viewMode === "dense"
                          ? `rounded-lg px-3 py-2 ${
                              isSelected
                                ? "border-accent-border bg-accent-dim"
                                : "border-border bg-surface-2 hover:border-border-light hover:bg-surface-3"
                            }`
                          : `${
                              isSelected
                                ? "border-accent-border bg-accent-dim"
                                : "border-border bg-surface-2 hover:border-border-light hover:bg-surface-3"
                            } rounded p-5`
                      }`}
                      onClick={(event) =>
                        handleMemberCardClick(event, member.id)
                      }
                      onKeyDown={(event) =>
                        handleMemberCardKeyDown(event, member.id)
                      }
                    >
                      {isSelected ? (
                        <div
                          className={`absolute z-10 rounded-full border border-accent-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-accent ${
                            viewMode === "dense"
                              ? "right-2 top-2"
                              : "right-3 top-3"
                          }`}
                        >
                          선택됨
                        </div>
                      ) : null}

                      <div className="block" style={{ textDecoration: "none" }}>
                        <div
                          className={`flex ${
                            viewMode === "dense"
                              ? "items-center gap-2.5 pr-12"
                              : "mb-3 items-center gap-3"
                          }`}
                        >
                          <div
                            className={`flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--cyan))] font-bold text-white ${
                              viewMode === "dense"
                                ? "h-9 w-9 text-[13px]"
                                : "h-10 w-10 text-base"
                            }`}
                          >
                            {getMemberInitial(member.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className={`flex ${
                                viewMode === "dense"
                                  ? "items-center justify-between gap-2"
                                  : "flex-col"
                              }`}
                            >
                              <div className="min-w-0">
                                <div
                                  className={`truncate font-semibold text-text ${
                                    viewMode === "dense"
                                      ? "text-[14px] leading-none"
                                      : "text-[15px]"
                                  }`}
                                >
                                  {member.name}
                                </div>
                                <div
                                  className={`truncate text-text-dim ${
                                    viewMode === "dense"
                                      ? "mt-1 text-[11px] leading-none"
                                      : "mt-0.5 text-xs"
                                  }`}
                                >
                                  {getMemberContact(member)}
                                </div>
                              </div>

                              <div
                                className={`flex flex-wrap gap-1.5 ${
                                  viewMode === "dense"
                                    ? "shrink-0 items-center justify-end"
                                    : "mt-3"
                                }`}
                              >
                                <span
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: 10,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: statusMeta.color,
                                    background: statusMeta.bgColor,
                                  }}
                                >
                                  {statusMeta.label}
                                </span>
                                {riskMeta && (
                                  <span
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 3,
                                      padding: "2px 8px",
                                      borderRadius: 10,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: riskMeta.color,
                                      background: riskMeta.bgColor,
                                      border: `1px solid ${riskMeta.borderColor}`,
                                    }}
                                  >
                                    <AlertTriangle size={10} />
                                    {member.aiRiskLevel
                                      ? `위험도 ${riskMeta.label}`
                                      : riskMeta.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {member.aiRiskSummary ? (
                          <p
                            className={`text-[12px] leading-[1.5] text-text-secondary ${
                              viewMode === "dense" ? "hidden" : "mt-3"
                            }`}
                          >
                            {member.aiRiskSummary}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
      <StudentTutorial />
    </div>
  );
}
