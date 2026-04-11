"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  AlertTriangle,
  Plus,
  Search,
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

export function StudentListScreen() {
  const { spaces, selectedSpaceId, refetchMembers } = useStudentManagement();

  const {
    filteredMembers,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    riskLevelFilter,
    setRiskLevelFilter,
    sortKey,
    setSortKey,
    loading,
    error,
  } = useMemberList();

  const { openSpaceSettings } = useSpaceSettingsDrawer();
  const router = useRouter();

  const currentSpace = spaces.find((s) => s.id === selectedSpaceId) ?? null;
  const spaceName = currentSpace?.name ?? null;
  const detailBaseHref = selectedSpaceId
    ? (memberId: string) =>
        `/home/student-management/${memberId}?spaceId=${selectedSpaceId}`
    : (memberId: string) => `/home/student-management/${memberId}`;

  const visibleMemberIds = useMemo(
    () => filteredMembers.map((member) => member.id),
    [filteredMembers],
  );

  const {
    selectedIds,
    selectedCount,
    allVisibleSelected,
    handleSelectMember,
    clearSelection: handleClearSelection,
    toggleSelectAllVisible: handleToggleSelectAllVisible,
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

      if (event.metaKey || event.ctrlKey || selectedCount > 0) {
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

      if (
        selectedCount > 0 ||
        event.shiftKey ||
        event.metaKey ||
        event.ctrlKey
      ) {
        handleSelectMember(memberId, {
          shiftKey: event.shiftKey,
          shouldSelect: !selectedIds.has(memberId),
        });
        return;
      }

      router.push(detailBaseHref(memberId));
    },
    [detailBaseHref, handleSelectMember, router, selectedCount, selectedIds],
  );

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-4 md:flex-row md:items-start flex-col items-start">
          <div>
            <h2
              className="text-2xl font-bold text-text tracking-[-0.02em]"
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

          <div className="flex items-center gap-[10px] md:w-auto w-full flex-wrap md:justify-end">
            {selectedSpaceId && (
              <button
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3.5 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-3 hover:text-text"
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
              href="/home/student-management/members/new"
              data-tutorial="add-member-btn"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-95"
            >
              <Plus size={16} />
              수강생 추가
            </Link>
          </div>
        </div>

        {selectedSpaceId && <SheetExportPanel spaceId={selectedSpaceId} />}
      </div>

      {/* 필터 바 */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              color: "var(--text-dim)",
              pointerEvents: "none",
            }}
          />
          <input
            className="py-2 px-[14px] border border-border rounded-lg text-sm w-[220px] outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border focus:shadow-[0_0_0_3px_var(--accent-dim)]"
            style={{ paddingLeft: 30 }}
            placeholder="이름, 이메일, 전화번호"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            className="appearance-none py-1.5 pl-3 pr-7 border border-border rounded-lg text-[13px] text-text-secondary bg-surface-2 cursor-pointer outline-none transition-[border-color] duration-150 hover:border-border-light focus:border-accent-border"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">전체 상태</option>
            <option value="active">수강중</option>
            <option value="withdrawn">중도포기</option>
            <option value="graduated">수료</option>
          </select>
          <svg
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-dim"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="relative">
          <select
            className="appearance-none py-1.5 pl-3 pr-7 border border-border rounded-lg text-[13px] text-text-secondary bg-surface-2 cursor-pointer outline-none transition-[border-color] duration-150 hover:border-border-light focus:border-accent-border"
            value={riskLevelFilter}
            onChange={(e) =>
              setRiskLevelFilter(e.target.value as RiskLevel | "all")
            }
          >
            <option value="all">전체 위험도</option>
            <option value="low">낮음</option>
            <option value="medium">보통</option>
            <option value="high">높음</option>
          </select>
          <svg
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-dim"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="relative">
          <select
            className="appearance-none py-1.5 pl-3 pr-7 border border-border rounded-lg text-[13px] text-text-secondary bg-surface-2 cursor-pointer outline-none transition-[border-color] duration-150 hover:border-border-light focus:border-accent-border"
            value={sortKey}
            onChange={(e) =>
              setSortKey(e.target.value as "name" | "createdAt" | "status")
            }
          >
            <option value="createdAt">최근 등록순</option>
            <option value="name">이름순</option>
            <option value="status">상태순</option>
          </select>
          <svg
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-dim"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {hasMembers ? (
          <div className="ml-auto flex items-center gap-2 text-[12px] text-text-dim">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[12px] text-text-secondary transition-colors hover:border-border-light hover:text-text"
              onClick={() => {
                clearDeleteError();
                handleToggleSelectAllVisible();
              }}
            >
              {allVisibleSelected ? "전체 해제" : "전체 선택"}
            </button>
          </div>
        ) : null}
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
        <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
          <User size={40} className="text-text-dim mb-4" />
          <p className="text-lg font-semibold text-text mb-2">
            {search || statusFilter !== "all" || riskLevelFilter !== "all"
              ? "검색 결과가 없습니다."
              : "수강생이 없습니다."}
          </p>
          {!search && statusFilter === "all" && riskLevelFilter === "all" && (
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
          )}
        </div>
      )}

      {/* 수강생 목록 */}
      {hasMembers && (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))] max-md:grid-cols-1">
          {filteredMembers.map((member) => {
            const statusMeta =
              MEMBER_STATUS_META[member.status] ?? MEMBER_STATUS_META.active;
            const resolvedRiskLevel =
              member.aiRiskLevel ?? member.initialRiskLevel;
            const riskMeta = resolvedRiskLevel
              ? RISK_LEVEL_META[resolvedRiskLevel as RiskLevel]
              : null;
            const isSelected = selectedIds.has(member.id);

            return (
              <div
                key={member.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${member.name} ${isSelected ? "선택됨" : "선택 안 됨"}`}
                className={`relative rounded border p-5 transition-all duration-150 ${
                  isSelected
                    ? "border-accent-border bg-accent-dim"
                    : "border-border bg-surface-2 hover:border-border-light hover:bg-surface-3"
                }`}
                onClick={(event) => handleMemberCardClick(event, member.id)}
                onKeyDown={(event) => handleMemberCardKeyDown(event, member.id)}
              >
                {isSelected ? (
                  <div className="absolute right-3 top-3 z-10 rounded-full border border-accent-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-accent">
                    선택됨
                  </div>
                ) : null}

                <div className="block" style={{ textDecoration: "none" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, var(--accent), var(--cyan))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-[15px] font-semibold text-text">
                        {member.name}
                      </div>
                      <div className="text-xs text-text-dim mt-0.5">
                        {member.email ?? member.phone ?? "연락처 없음"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                          ? `AI ${riskMeta.label}`
                          : riskMeta.label}
                      </span>
                    )}
                  </div>
                  {member.aiRiskSummary ? (
                    <p className="mt-3 text-[12px] leading-[1.5] text-text-secondary">
                      {member.aiRiskSummary}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <StudentTutorial />
    </div>
  );
}
