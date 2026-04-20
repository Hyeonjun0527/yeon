"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  getOrderedSelectedMemberIds,
  resolveMemberCardPrimaryAction,
  resolveMemberContextSelection,
} from "../member-selection-utils";
import { useStudentManagement } from "../student-management-provider";
import { MEMBER_STATUS_META, RISK_LEVEL_META } from "../constants";
import type { RiskLevel } from "../types";
import { SheetExportPanel } from "../components/sheet-export-panel";
import { useSpaceSettingsDrawer } from "../../space-settings";
import { StudentTutorial } from "@/components/tutorial";
import { useRegisterTutorialPolicy } from "@/features/counseling-service-shell/counseling-sidebar-layout-context";
import { useAppRoute } from "@/lib/app-route-context";
import { formatSpacePeriodLabel } from "@/lib/space-period";

function getMemberContact(member: {
  email?: string | null;
  phone?: string | null;
}) {
  return member.email ?? member.phone ?? "연락처 없음";
}

function getMemberInitial(name: string) {
  return name.charAt(0);
}

function getRiskSignalsSummary(signals?: string[]) {
  if (!signals || signals.length === 0) {
    return null;
  }

  return signals.join(", ");
}

const CARD_PAGE_SIZE = 24;

type MemberContextMenuState = {
  ids: string[];
  primaryId: string;
  x: number;
  y: number;
};

export function StudentListScreen() {
  const { spaces, spacesLoading, selectedSpaceId, refetchMembers } =
    useStudentManagement();

  const {
    filteredMembers,
    rawMemberCount,
    viewMode,
    setViewMode,
    loading,
    error,
  } = useMemberList();

  const { openSpaceSettings } = useSpaceSettingsDrawer();
  const router = useRouter();
  const { resolveAppHref } = useAppRoute();

  const currentSpace = spaces.find((s) => s.id === selectedSpaceId) ?? null;
  const spaceName = currentSpace?.name ?? null;
  const spacePeriodLabel = formatSpacePeriodLabel(
    currentSpace?.startDate ?? null,
    currentSpace?.endDate ?? null,
  );
  const noSpaces = !spacesLoading && spaces.length === 0;
  const detailBaseHref = selectedSpaceId
    ? (memberId: string) =>
        `${resolveAppHref(`/counseling-service/student-management/${memberId}`)}?spaceId=${selectedSpaceId}`
    : (memberId: string) =>
        resolveAppHref(`/counseling-service/student-management/${memberId}`);

  const visibleMemberIds = useMemo(
    () => filteredMembers.map((member) => member.id),
    [filteredMembers],
  );

  const {
    selectedIds,
    selectedCount,
    selectionAnchorId,
    handleSelectMember,
    replaceSelection,
    clearSelection: handleClearSelection,
  } = useMemberSelection(visibleMemberIds);
  const [memberContextMenu, setMemberContextMenu] =
    useState<MemberContextMenuState | null>(null);

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

  useEffect(() => {
    if (!memberContextMenu) {
      return;
    }

    const primaryVisible = visibleMemberIds.includes(
      memberContextMenu.primaryId,
    );
    if (!primaryVisible) {
      setMemberContextMenu(null);
    }
  }, [memberContextMenu, visibleMemberIds]);

  useEffect(() => {
    if (!memberContextMenu) {
      return;
    }

    const handleClose = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-member-card-context-menu='true']")) {
        return;
      }
      setMemberContextMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMemberContextMenu(null);
      }
    };

    const handleScroll = () => {
      setMemberContextMenu(null);
    };

    window.addEventListener("mousedown", handleClose);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("mousedown", handleClose);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [memberContextMenu]);

  const handleMemberCardMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button === 0 && event.shiftKey) {
        event.preventDefault();
      }
    },
    [],
  );

  const isEmpty = !loading && !error && filteredMembers.length === 0;
  const hasMembers = !loading && !error && filteredMembers.length > 0;
  const isFilteredEmpty =
    !loading && !error && rawMemberCount > 0 && filteredMembers.length === 0;
  const studentTutorialPolicy = !selectedSpaceId
    ? { mode: "disabled" as const, showTrigger: false }
    : hasMembers
      ? { mode: "full" as const, showTrigger: true }
      : isEmpty && !isFilteredEmpty
        ? { mode: "empty" as const, showTrigger: false }
        : { mode: "disabled" as const, showTrigger: false };

  useRegisterTutorialPolicy("student", studentTutorialPolicy);

  // dense view만 가상 스크롤을 사용한다. 카드 뷰는 자연스러운 CSS grid를 유지해야
  // 기존 디자인과 간격이 보존되고, row-based virtualization으로 인한 레이아웃 왜곡을 피할 수 있다.
  const denseListRef = useRef<HTMLDivElement>(null);
  const cardSentinelRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const isDenseView = viewMode === "dense";
  const [visibleCardCount, setVisibleCardCount] = useState(CARD_PAGE_SIZE);

  useEffect(() => {
    const el = isDenseView ? denseListRef.current : cardSentinelRef.current;
    if (!el) return;

    setScrollElement(el.closest("main") as HTMLElement | null);
  }, [isDenseView, hasMembers]);

  const rowVirtualizer = useVirtualizer({
    count: isDenseView && hasMembers ? filteredMembers.length : 0,
    getScrollElement: () => scrollElement,
    estimateSize: () => 48,
    overscan: 5,
    scrollMargin: denseListRef.current?.offsetTop ?? 0,
  });
  const denseRows = rowVirtualizer.getVirtualItems();
  const visibleCardMembers = isDenseView
    ? filteredMembers
    : filteredMembers.slice(0, visibleCardCount);
  const hasMoreCardMembers =
    !isDenseView && visibleCardMembers.length < filteredMembers.length;

  useEffect(() => {
    if (isDenseView) {
      return;
    }

    setVisibleCardCount(CARD_PAGE_SIZE);
  }, [filteredMembers, isDenseView, selectedSpaceId]);

  useEffect(() => {
    if (isDenseView || !hasMoreCardMembers) {
      return;
    }

    const sentinel = cardSentinelRef.current;
    const rootElement = scrollElement;

    if (!sentinel || !rootElement) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) {
          return;
        }

        startTransition(() => {
          setVisibleCardCount((current) =>
            Math.min(current + CARD_PAGE_SIZE, filteredMembers.length),
          );
        });
      },
      {
        root: rootElement,
        rootMargin: "320px 0px",
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [filteredMembers.length, hasMoreCardMembers, isDenseView, scrollElement]);

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
      setMemberContextMenu(null);

      const primaryAction = resolveMemberCardPrimaryAction({
        selectedCount,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
      });

      if (primaryAction === "range-select") {
        event.preventDefault();
        handleSelectMember(memberId, {
          shiftKey: true,
          shouldSelect: true,
        });
        return;
      }

      if (primaryAction === "toggle-select") {
        event.preventDefault();
        handleSelectMember(memberId, {
          shouldSelect: !selectedIds.has(memberId),
        });
        return;
      }

      router.push(detailBaseHref(memberId));
    },
    [
      clearDeleteError,
      detailBaseHref,
      handleSelectMember,
      router,
      selectedCount,
      selectedIds,
    ],
  );

  const handleMemberCardKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, memberId: string) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();

      const primaryAction = resolveMemberCardPrimaryAction({
        selectedCount,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
      });

      if (primaryAction === "range-select") {
        handleSelectMember(memberId, {
          shiftKey: true,
          shouldSelect: true,
        });
        return;
      }

      if (primaryAction === "toggle-select") {
        handleSelectMember(memberId, {
          shouldSelect: !selectedIds.has(memberId),
        });
        return;
      }

      router.push(detailBaseHref(memberId));
    },
    [detailBaseHref, handleSelectMember, router, selectedCount, selectedIds],
  );

  const handleMemberCardContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, member: { id: string }) => {
      clearDeleteError();
      event.preventDefault();
      event.stopPropagation();

      const nextSelection = resolveMemberContextSelection(
        {
          selectedIds,
          anchorId: selectionAnchorId,
        },
        {
          memberId: member.id,
          visibleMemberIds,
        },
      );

      const orderedIds = getOrderedSelectedMemberIds(
        visibleMemberIds,
        nextSelection.selectedIds,
      );

      replaceSelection(orderedIds, nextSelection.anchorId);
      setMemberContextMenu({
        ids: orderedIds,
        primaryId: member.id,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [
      clearDeleteError,
      replaceSelection,
      selectedIds,
      selectionAnchorId,
      visibleMemberIds,
    ],
  );

  const handleContextDelete = useCallback(async () => {
    if (!memberContextMenu) {
      return;
    }

    setMemberContextMenu(null);
    await handleBulkDelete(memberContextMenu.ids);
  }, [handleBulkDelete, memberContextMenu]);

  const renderMemberCard = useCallback(
    (member: (typeof filteredMembers)[number], index: number) => {
      const statusMeta =
        MEMBER_STATUS_META[member.status] ?? MEMBER_STATUS_META.active;
      const resolvedRiskLevel = member.aiRiskLevel ?? member.initialRiskLevel;
      const riskMeta = resolvedRiskLevel
        ? RISK_LEVEL_META[resolvedRiskLevel as RiskLevel]
        : null;
      const riskSignalsSummary = getRiskSignalsSummary(member.aiRiskSignals);
      const isSelected = selectedIds.has(member.id);

      return (
        <div
          key={member.id}
          data-tutorial={index === 0 ? "member-card" : undefined}
          role="button"
          tabIndex={0}
          aria-pressed={isSelected}
          aria-label={`${member.name} ${isSelected ? "선택됨" : "선택 안 됨"}`}
          className={`relative select-none border transition-all duration-150 ${
            isDenseView
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
          onMouseDown={handleMemberCardMouseDown}
          onClick={(event) => handleMemberCardClick(event, member.id)}
          onContextMenu={(event) => handleMemberCardContextMenu(event, member)}
          onKeyDown={(event) => handleMemberCardKeyDown(event, member.id)}
        >
          {isSelected ? (
            <div
              className={`absolute z-10 rounded-full border border-accent-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-accent ${
                isDenseView ? "right-2 top-2" : "right-3 top-3"
              }`}
            >
              선택됨
            </div>
          ) : null}

          <div className="block" style={{ textDecoration: "none" }}>
            <div
              className={`flex ${
                isDenseView
                  ? "items-center gap-2.5 pr-12"
                  : "mb-3 items-center gap-3"
              }`}
            >
              <div
                className={`flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--cyan))] font-bold text-white ${
                  isDenseView ? "h-9 w-9 text-[13px]" : "h-10 w-10 text-base"
                }`}
              >
                {getMemberInitial(member.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`flex ${
                    isDenseView
                      ? "items-center justify-between gap-2"
                      : "flex-col"
                  }`}
                >
                  <div className="min-w-0">
                    <div
                      className={`truncate font-semibold text-text ${
                        isDenseView ? "text-[14px] leading-none" : "text-[15px]"
                      }`}
                    >
                      {member.name}
                    </div>
                    <div
                      className={`truncate text-text-dim ${
                        isDenseView
                          ? "mt-1 text-[11px] leading-none"
                          : "mt-0.5 text-xs"
                      }`}
                    >
                      {getMemberContact(member)}
                    </div>
                  </div>

                  <div
                    className={`flex flex-wrap gap-1.5 ${
                      isDenseView ? "shrink-0 items-center justify-end" : "mt-3"
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
                    {riskMeta ? (
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
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {riskSignalsSummary && !isDenseView ? (
              <p
                className="mt-3 truncate text-[12px] leading-[1.5] text-text-secondary"
                title={riskSignalsSummary}
              >
                <span className="mr-1 text-text-dim">AI 위험 신호</span>
                {riskSignalsSummary}
              </p>
            ) : null}
          </div>
        </div>
      );
    },
    [
      handleMemberCardClick,
      handleMemberCardContextMenu,
      handleMemberCardKeyDown,
      handleMemberCardMouseDown,
      isDenseView,
      selectedIds,
    ],
  );

  if (spacesLoading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-text-secondary">
        스페이스와 수강생 목록을 불러오는 중...
      </div>
    );
  }

  if (!selectedSpaceId) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <AlertTriangle size={22} />
        </div>
        <h2 className="text-xl font-semibold text-text">
          {noSpaces
            ? "먼저 스페이스를 만들어 주세요"
            : "먼저 스페이스를 선택해 주세요"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          수강생 추가와 출석·과제 보드는 모두 스페이스 안에서만 관리됩니다.
        </p>
        <p className="mt-1 text-sm leading-6 text-text-dim">
          {noSpaces
            ? "왼쪽 사이드바의 스페이스 만들기에서 공간을 만든 뒤 수강생을 등록해 주세요."
            : "왼쪽 사이드바에서 스페이스를 선택한 뒤 수강생 목록을 확인해 주세요."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full">
      {/* 헤더 */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h2
              className="text-xl font-bold tracking-[-0.02em] text-text sm:text-2xl"
              data-tutorial="space-title"
            >
              {spaceName}
            </h2>
            {!loading && (
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
                <span>{filteredMembers.length}명</span>
                <span className="text-text-dim">·</span>
                <span className="text-text-dim">
                  {spacePeriodLabel ?? "진행기간 미설정"}
                </span>
              </div>
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
                title="진행기간과 수강생 정보 구성 설정"
              >
                <Settings size={14} />
                스페이스 설정
              </button>
            )}

            <Link
              href={
                selectedSpaceId
                  ? `${resolveAppHref("/counseling-service/student-management/check-board")}?spaceId=${selectedSpaceId}`
                  : resolveAppHref(
                      "/counseling-service/student-management/check-board",
                    )
              }
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-3 hover:text-text md:px-3.5 md:text-[13px]"
            >
              <ClipboardCheck size={14} />
              출석·과제 보드
            </Link>

            <Link
              href={resolveAppHref(
                "/counseling-service/student-management/members/new",
              )}
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
      {isFilteredEmpty && (
        <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
          <User size={40} className="mb-4 text-text-dim" />
          <p className="mb-2 text-lg font-semibold text-text">
            필터 결과가 없습니다.
          </p>
          <p className="max-w-md text-sm leading-relaxed text-text-secondary">
            현재 스페이스에는 수강생이 있지만, 검색어나 상태/위험도 필터 때문에
            목록에서 제외되고 있습니다.
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-text-dim">
            URL의 `q`, `status`, `risk` 파라미터를 지우거나 필터를 초기화해 전체
            목록을 다시 확인해 주세요.
          </p>
        </div>
      )}

      {isEmpty && !isFilteredEmpty && (
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
      {hasMembers &&
        (isDenseView ? (
          <div
            ref={denseListRef}
            className="w-full"
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {denseRows.map((virtualRow) => {
              const member = filteredMembers[virtualRow.index];
              if (!member) {
                return null;
              }

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
                >
                  {renderMemberCard(member, virtualRow.index)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))] max-md:grid-cols-1">
            {visibleCardMembers.map((member, index) =>
              renderMemberCard(member, index),
            )}
          </div>
        ))}
      {hasMoreCardMembers ? (
        <div ref={cardSentinelRef} className="flex justify-center py-6">
          <div className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[12px] text-text-dim">
            아래로 스크롤하면 더 불러옵니다
          </div>
        </div>
      ) : null}
      {memberContextMenu ? (
        <div
          data-member-card-context-menu="true"
          className="fixed z-[340] min-w-[180px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_48px_rgba(0,0,0,0.38)]"
          style={{ left: memberContextMenu.x, top: memberContextMenu.y }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-2 text-left text-[12px] font-medium text-red transition-colors hover:bg-surface-4"
            onClick={() => void handleContextDelete()}
            disabled={isDeletingSelected}
          >
            <Trash2 size={14} />
            {isDeletingSelected
              ? "삭제 중..."
              : memberContextMenu.ids.length > 1
                ? `선택한 ${memberContextMenu.ids.length}명 삭제`
                : "1명 삭제"}
          </button>
        </div>
      ) : null}
      <StudentTutorial />
    </div>
  );
}
