"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Drawer as VaulDrawer } from "vaul";
import {
  Users,
  Plus,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  Pencil,
  FileClock,
  ClipboardCheck,
  ChevronsUpDown,
  Ellipsis,
  X,
} from "lucide-react";
import { useSpaceSidebarActions } from "./_hooks/use-space-sidebar-actions";
import { useSpaceSidebarSelection } from "./_hooks/use-space-sidebar-selection";
import { StudentManagementProvider } from "@/features/student-management";
import { useStudentManagement } from "@/features/student-management/student-management-provider";
import { StudentSpaceCreateModal } from "@/features/student-management/components/space-create-modal";
import { useClickOutside } from "@/app/home/_hooks";
import {
  SpaceSettingsDrawerProvider,
  SpaceSettingsDrawerHost,
  useSpaceSettingsDrawer,
} from "@/features/space-settings";
import type { LocalImportDraftSummary } from "./_lib/space-sidebar-types";
import { createPatchedHref } from "@/lib/route-state/search-params";

/* ── OAuth 결과 토스트 ──
 * URL query param으로 OAuth 결과를 전달받아 표시하는 컴포넌트.
 * useSearchParams()는 브라우저 URL을 읽는 클라이언트 전용 API이므로
 * next/dynamic ssr:false로 명시적으로 클라이언트에서만 실행한다.
 * Suspense 안에서 useSearchParams를 쓰면 Next.js가 해당 서브트리를
 * SSR에서 제외하면서 hydration 불일치가 발생하기 때문이다.
 */

type ToastState = { text: string; type: "success" | "error" } | null;

function OAuthResultToastInner() {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const gdError = searchParams.get("googledrive_error");
    const gdConnected = searchParams.get("googledrive_connected");
    const odError = searchParams.get("onedrive_error");
    const odConnected = searchParams.get("onedrive_connected");

    if (gdConnected === "true") {
      setToast({ text: "Google Drive 연동이 완료됐습니다.", type: "success" });
    } else if (gdError) {
      setToast({
        text: "Google Drive 연동에 실패했습니다. 다시 시도해주세요.",
        type: "error",
      });
    } else if (odConnected === "true") {
      setToast({ text: "OneDrive 연동이 완료됐습니다.", type: "success" });
    } else if (odError) {
      setToast({
        text: "OneDrive 연동에 실패했습니다. 다시 시도해주세요.",
        type: "error",
      });
    }

    if (gdError || gdConnected || odError || odConnected) {
      const params = new URLSearchParams(window.location.search);
      params.delete("googledrive_error");
      params.delete("googledrive_connected");
      params.delete("onedrive_error");
      params.delete("onedrive_connected");
      const qs = params.toString();
      router.replace(window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const Icon = toast.type === "success" ? CheckCircle : AlertCircle;
  const bg = toast.type === "success" ? "var(--accent)" : "#ef4444";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: bg,
        color: "#fff",
        padding: "12px 18px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500,
        zIndex: 9999,
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={16} strokeWidth={2.5} />
      {toast.text}
    </div>
  );
}

const OAuthResultToast = dynamic(() => Promise.resolve(OAuthResultToastInner), {
  ssr: false,
});

function SidebarContent({ children }: { children: React.ReactNode }) {
  const {
    spaces,
    spacesLoading,
    selectedSpaceId,
    setSelectedSpaceId,
    refetchSpaces,
    members,
  } = useStudentManagement();
  const router = useRouter();
  const pathname = usePathname();

  const noSpaces = !spacesLoading && spaces.length === 0;
  const isCheckBoardRoute = pathname === "/home/student-management/check-board";
  const currentSpace =
    spaces.find((space) => space.id === selectedSpaceId) ?? null;
  const [mobileSpaceDrawerOpen, setMobileSpaceDrawerOpen] = useState(false);
  const isStudentDetailRoute =
    /^\/home\/student-management\/[^/]+$/.test(pathname) &&
    pathname !== "/home/student-management/members/new" &&
    pathname !== "/home/student-management/check-board";

  function resetDetailRouteIfNeeded() {
    if (isStudentDetailRoute) {
      router.replace(
        createPatchedHref(
          "/home/student-management",
          new URLSearchParams(window.location.search),
          { spaceId: selectedSpaceId },
        ),
      );
    }
  }

  const {
    spaceSelection,
    setSpaceSelection,
    contextMenu,
    setContextMenu,
    handleSelectAllStudents,
    handleSpaceClick,
    handleSpaceContextMenu,
  } = useSpaceSidebarSelection({
    spaces,
    selectedSpaceId,
    setSelectedSpaceId,
    resetDetailRouteIfNeeded,
  });
  const {
    createModalState,
    closeCreateModal,
    openCreateModal,
    updateCreateModalRouteState,
    spaceActionError,
    setSpaceActionError,
    deletingSpaceId,
    renamingSpaceId,
    renameTarget,
    setRenameTarget,
    renameValue,
    setRenameValue,
    deleteTarget,
    setDeleteTarget,
    openRenameDialog,
    openDeleteDialog,
    handleRenameSpace,
    handleDeleteSpace,
  } = useSpaceSidebarActions({
    selectedSpaceId,
    setSelectedSpaceId,
    refetchSpaces,
    resetDetailRouteIfNeeded,
    setSpaceSelection,
    closeContextMenu: () => setContextMenu(null),
  });
  const contextMenuRef = useClickOutside<HTMLDivElement>(
    () => setContextMenu(null),
    !!contextMenu,
  );
  const {
    data: localDraftsData,
    isPending: localDraftsLoading,
    error: localDraftsQueryError,
    refetch: refetchLocalDrafts,
  } = useQuery({
    queryKey: ["student-management", "local-import-drafts"],
    queryFn: async () => {
      const res = await fetch("/api/v1/integrations/local/drafts?limit=100");
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "임시 가져오기 초안을 불러오지 못했습니다.");
      }

      return res.json() as Promise<{ drafts: LocalImportDraftSummary[] }>;
    },
  });
  const localDrafts = localDraftsData?.drafts ?? [];
  const localDraftCount = localDrafts.length;
  const { openSpaceSettings } = useSpaceSettingsDrawer();
  const localDraftsError =
    localDraftsQueryError instanceof Error
      ? localDraftsQueryError.message
      : localDraftsQueryError
        ? "임시 가져오기 초안을 불러오지 못했습니다."
        : null;

  useEffect(() => {
    setMobileSpaceDrawerOpen(false);
  }, [pathname, selectedSpaceId]);

  const [mobileActionTarget, setMobileActionTarget] = useState<{
    spaceId: string;
    spaceName: string;
  } | null>(null);

  const openMobileSpaceActions = (target: {
    spaceId: string;
    spaceName: string;
  }) => {
    setMobileSpaceDrawerOpen(false);
    window.setTimeout(() => {
      setMobileActionTarget(target);
    }, 140);
  };

  return (
    <div className="flex flex-1 overflow-hidden md:flex-row flex-col">
      <div className="border-b border-border bg-surface px-3 py-3 md:hidden">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-2 p-1">
          <button
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
              !isCheckBoardRoute
                ? "bg-accent text-white"
                : "text-text-secondary hover:bg-surface-3 hover:text-text"
            }`}
            onClick={() =>
              router.push(
                createPatchedHref(
                  "/home/student-management",
                  new URLSearchParams(window.location.search),
                  { spaceId: selectedSpaceId },
                ),
              )
            }
            type="button"
          >
            <Users size={14} />
            학생관리
          </button>
          <button
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
              isCheckBoardRoute
                ? "bg-accent text-white"
                : "text-text-secondary hover:bg-surface-3 hover:text-text"
            }`}
            onClick={() =>
              router.push(
                createPatchedHref(
                  "/home/student-management/check-board",
                  new URLSearchParams(window.location.search),
                  { spaceId: selectedSpaceId },
                ),
              )
            }
            type="button"
          >
            <ClipboardCheck size={14} />
            출석보드
          </button>
        </div>

        <button
          type="button"
          className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-border-light hover:bg-surface-3"
          onClick={() => setMobileSpaceDrawerOpen(true)}
        >
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] text-text-dim">
              현재 스페이스
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-text">
              {currentSpace?.name ?? "전체 수강생"}
            </div>
          </div>
          <div className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-text-secondary">
            <ChevronsUpDown size={14} />
            변경
          </div>
        </button>
      </div>

      <nav className="scrollbar-subtle hidden w-[240px] bg-surface border-r border-border pt-5 px-3 pb-5 flex-col gap-1 flex-shrink-0 overflow-y-auto md:flex md:w-[240px]">
        <div className="flex items-center gap-2.5 px-2.5 pb-4 text-text max-md:hidden">
          <GraduationCap size={20} style={{ color: "var(--accent)" }} />
          <span
            className="text-[15px] font-bold tracking-[-0.02em]"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--cyan))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            수강생 관리
          </span>
        </div>

        {/* 전체 수강생 */}
        <button
          className={`flex items-center gap-2 py-2 px-2.5 rounded-[6px] text-[13px] font-medium cursor-pointer border-none w-full text-left transition-[background,color] duration-[120ms]${
            selectedSpaceId === null && !isCheckBoardRoute
              ? " bg-accent-dim text-accent font-semibold"
              : " bg-transparent text-text-secondary hover:bg-surface-3 hover:text-text"
          }`}
          onClick={() => {
            handleSelectAllStudents();
          }}
        >
          <Users size={16} />
          <span style={{ flex: 1 }}>전체 수강생</span>
        </button>

        {/* 스페이스 목록 */}
        <div className="text-[11px] font-semibold text-text-dim uppercase tracking-[0.05em] px-2.5 pt-4 pb-1.5">
          스페이스
        </div>
        <div className="flex flex-col gap-0.5">
          {spaceSelection.ids.length > 1 ? (
            <div className="mb-1 rounded-[8px] border border-accent-border bg-accent-dim px-2.5 py-2 text-[12px] font-medium text-accent max-md:min-w-[220px]">
              스페이스 {spaceSelection.ids.length}개 선택됨
            </div>
          ) : null}
          {spacesLoading && (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                padding: "4px 10px",
              }}
            >
              불러오는 중...
            </div>
          )}
          {noSpaces && (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                padding: "4px 10px",
              }}
            >
              스페이스가 없습니다.
            </div>
          )}
          {spaces.map((space, index) => {
            const isSpaceSelected = spaceSelection.ids.includes(space.id);
            const isActiveSpace = selectedSpaceId === space.id;

            return (
              <button
                key={space.id}
                className={`flex items-center gap-2 py-2 px-2.5 rounded-[6px] text-[13px] font-medium cursor-pointer border-none w-full text-left transition-[background,color] duration-[120ms] max-md:whitespace-nowrap max-md:py-2 max-md:px-3${
                  isSpaceSelected
                    ? isActiveSpace
                      ? " bg-accent-dim text-accent font-semibold"
                      : " bg-accent-dim text-text font-medium"
                    : " bg-transparent text-text-secondary hover:bg-surface-3 hover:text-text"
                }`}
                onClick={(event) => handleSpaceClick(event, space.id, index)}
                onContextMenu={(event) =>
                  handleSpaceContextMenu(event, space.id, space.name)
                }
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "var(--accent)" }}
                />
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {space.name}
                </span>
                {isActiveSpace ? (
                  <span className="ml-auto text-[11px] text-text-dim font-medium tabular-nums">
                    {members.length}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {spaceActionError ? (
          <div className="mt-2 rounded-[6px] border border-red/20 bg-red/10 px-2.5 py-2 text-[12px] text-red">
            {spaceActionError}
          </div>
        ) : null}

        <div
          style={{
            marginTop: "auto",
            paddingTop: 16,
            borderTop: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {localDraftCount > 0 ? (
            <button
              type="button"
              className="w-full rounded-xl border border-accent-border bg-accent-dim/50 px-3 py-3 text-left transition-colors hover:border-accent hover:bg-accent-dim"
              onClick={() => openCreateModal("import")}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 rounded-lg bg-surface px-2 py-2 text-accent shrink-0">
                  <FileClock size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 text-[13px] font-semibold text-text truncate">
                      가져오기 작업 보기
                    </span>
                    <span className="shrink-0 rounded-full border border-accent-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-accent">
                      {localDraftCount}개
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-dim line-clamp-2">
                    분석 중이거나 저장된 가져오기 작업을 한곳에서 확인하고,
                    원하는 초안을 골라 이어서 작업할 수 있습니다.
                  </p>
                </div>
              </div>
            </button>
          ) : null}
          {localDraftCount === 0 && localDraftsLoading ? (
            <div className="rounded-[8px] border border-border bg-surface-2 px-3 py-2 text-[12px] text-text-dim">
              가져오기 작업 확인 중...
            </div>
          ) : null}
          {localDraftsError ? (
            <div className="rounded-[8px] border border-red/20 bg-red/10 px-3 py-2 text-[12px] text-red">
              {localDraftsError}
            </div>
          ) : null}
          <button
            className="flex items-center gap-1.5 py-2 px-2.5 mt-1 rounded-[6px] text-text-dim text-[13px] font-medium cursor-pointer border border-dashed border-border bg-transparent transition-[border-color,color,background] duration-150 w-full hover:border-accent-border hover:text-accent hover:bg-accent-dim"
            onClick={() => openCreateModal("choose")}
            type="button"
          >
            <Plus size={14} />
            스페이스 만들기
          </button>
          <p className="px-1 text-[11px] leading-relaxed text-text-dim">
            빈 스페이스를 만들거나, 엑셀/CSV를 가져와 바로 시작할 수 있습니다.
          </p>
        </div>
      </nav>
      <main className="scrollbar-subtle flex-1 overflow-y-auto p-8 max-md:px-3 max-md:py-4">
        {children}
      </main>
      {mobileSpaceDrawerOpen ? (
        <div className="fixed inset-0 z-[340] bg-[rgba(0,0,0,0.62)] p-3 md:hidden">
          <div className="ml-auto flex h-full w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-text-dim">
                  space selector
                </div>
                <div className="mt-1 text-base font-semibold text-text">
                  스페이스 선택
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-text-secondary"
                onClick={() => setMobileSpaceDrawerOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              <div className="space-y-1.5">
                <button
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition-colors ${
                    selectedSpaceId === null && !isCheckBoardRoute
                      ? "bg-accent-dim text-accent"
                      : "bg-surface-2 text-text-secondary"
                  }`}
                  onClick={() => {
                    handleSelectAllStudents();
                    setMobileSpaceDrawerOpen(false);
                  }}
                  type="button"
                >
                  <Users size={15} />
                  전체 수강생
                </button>

                {spaces.map((space, index) => {
                  const isSpaceSelected = spaceSelection.ids.includes(space.id);
                  const isActiveSpace = selectedSpaceId === space.id;

                  return (
                    <div
                      key={space.id}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors ${
                        isSpaceSelected
                          ? isActiveSpace
                            ? "bg-accent-dim text-accent"
                            : "bg-accent-dim text-text"
                          : "bg-surface-2 text-text-secondary"
                      }`}
                    >
                      <button
                        className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] font-medium"
                        onClick={(event) => {
                          handleSpaceClick(event, space.id, index);
                          setMobileSpaceDrawerOpen(false);
                        }}
                        type="button"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                        <span className="min-w-0 flex-1 truncate">
                          {space.name}
                        </span>
                        {isActiveSpace ? (
                          <span className="text-[11px] text-text-dim">
                            {members.length}
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        className="relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          openMobileSpaceActions({
                            spaceId: space.id,
                            spaceName: space.name,
                          });
                        }}
                        aria-label={`${space.name} 액션 열기`}
                      >
                        <Ellipsis size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {spaceActionError ? (
                <div className="mt-3 rounded-xl border border-red/20 bg-red/10 px-3 py-2 text-[12px] text-red">
                  {spaceActionError}
                </div>
              ) : null}

              <div className="mt-4 space-y-2 border-t border-border pt-4">
                {localDraftCount > 0 ? (
                  <button
                    type="button"
                    className="w-full rounded-xl border border-accent-border bg-accent-dim/50 px-3 py-3 text-left"
                    onClick={() => {
                      openCreateModal("import");
                      setMobileSpaceDrawerOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-surface px-2 py-2 text-accent">
                        <FileClock size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-text">
                          가져오기 작업 보기
                        </div>
                        <div className="mt-1 text-[11px] text-text-dim">
                          {localDraftCount}개 작업
                        </div>
                      </div>
                    </div>
                  </button>
                ) : null}

                <button
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-transparent px-3 py-3 text-[13px] font-medium text-text-dim"
                  onClick={() => {
                    openCreateModal("choose");
                    setMobileSpaceDrawerOpen(false);
                  }}
                  type="button"
                >
                  <Plus size={14} />
                  스페이스 만들기
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <VaulDrawer.Root
        open={!!mobileActionTarget}
        onOpenChange={(open) => {
          if (!open) {
            setMobileActionTarget(null);
          }
        }}
      >
        <VaulDrawer.Portal>
          <VaulDrawer.Overlay className="fixed inset-0 z-[350] bg-black/60 md:hidden" />
          <VaulDrawer.Content className="fixed inset-x-0 bottom-0 z-[360] rounded-t-[28px] border border-white/10 bg-[#12131a] px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_80px_rgba(0,0,0,0.72)] outline-none md:hidden">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/15" />
            <div className="mb-4 rounded-2xl border border-white/8 bg-[#181a22] px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-text-dim">
                space actions
              </div>
              <div className="mt-1 text-lg font-semibold text-text">
                {mobileActionTarget?.spaceName ?? "스페이스 액션"}
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-2xl border border-white/8 bg-[#20232d] px-4 py-3 text-left text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:bg-[#262a36]"
                onClick={() => {
                  if (!mobileActionTarget) return;
                  openSpaceSettings({ spaceId: mobileActionTarget.spaceId });
                  setMobileActionTarget(null);
                  setMobileSpaceDrawerOpen(false);
                }}
              >
                <Users size={16} />
                스페이스 설정
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-2xl border border-white/8 bg-[#20232d] px-4 py-3 text-left text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:bg-[#262a36]"
                onClick={() => {
                  if (!mobileActionTarget) return;
                  openRenameDialog(mobileActionTarget);
                  setMobileActionTarget(null);
                  setMobileSpaceDrawerOpen(false);
                }}
              >
                <Pencil size={16} />
                이름 변경
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-2xl border border-red/40 bg-[#3a1218] px-4 py-3 text-left text-sm font-semibold text-[#ffb4bf] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:bg-[#47161d]"
                onClick={() => {
                  if (!mobileActionTarget) return;
                  openDeleteDialog(mobileActionTarget);
                  setMobileActionTarget(null);
                  setMobileSpaceDrawerOpen(false);
                }}
              >
                <span>🗑</span>
                스페이스 삭제
              </button>
            </div>
          </VaulDrawer.Content>
        </VaulDrawer.Portal>
      </VaulDrawer.Root>
      {createModalState.open ? (
        <StudentSpaceCreateModal
          initialStep={createModalState.initialStep}
          initialLocalDraftId={createModalState.initialLocalDraftId}
          onRouteStateChange={({ step, draftId }) => {
            updateCreateModalRouteState({
              mode: step === "import" ? "import" : step,
              step,
              draftId,
            });
          }}
          onDraftDiscarded={() => {
            void refetchLocalDrafts();
          }}
          onClose={closeCreateModal}
          onCreated={(space) => {
            setSpaceActionError(null);
            setSelectedSpaceId(space.id);
            refetchSpaces();
            resetDetailRouteIfNeeded();
            closeCreateModal();
          }}
          onImported={() => {
            setSpaceActionError(null);
            refetchSpaces();
            void refetchLocalDrafts();
          }}
        />
      ) : null}

      {contextMenu ? (
        <div
          ref={contextMenuRef}
          className="fixed min-w-[168px] rounded-md border border-border-light bg-surface-3 py-1 shadow-[0_12px_32px_rgba(0,0,0,0.42)] z-[320]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 bg-transparent border-none text-left text-[12px] font-medium text-text cursor-pointer hover:bg-surface-4 disabled:opacity-50"
            onClick={() => {
              openRenameDialog({
                spaceId: contextMenu.spaceId,
                spaceName: contextMenu.spaceName,
              });
            }}
            disabled={renamingSpaceId === contextMenu.spaceId}
          >
            <Pencil size={12} />
            {renamingSpaceId === contextMenu.spaceId
              ? "이름 변경 중..."
              : "이름 변경"}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 bg-transparent border-none text-left text-[12px] font-medium text-red cursor-pointer hover:bg-surface-4 disabled:opacity-50"
            onClick={() => {
              openDeleteDialog({
                spaceId: contextMenu.spaceId,
                spaceName: contextMenu.spaceName,
              });
            }}
            disabled={deletingSpaceId === contextMenu.spaceId}
          >
            <span>🗑</span>
            {deletingSpaceId === contextMenu.spaceId
              ? "삭제 중..."
              : "스페이스 삭제"}
          </button>
        </div>
      ) : null}

      {renameTarget ? (
        <div
          className="fixed inset-0 z-[330] flex items-center justify-center bg-[rgba(0,0,0,0.62)] p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && !renamingSpaceId) {
              setRenameTarget(null);
            }
          }}
        >
          <div className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="border-b border-border px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-dim">
                스페이스 이름 변경
              </p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-text">
                이름을 다시 정리합니다
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                수강생 목록과 상단 헤더에 바로 반영됩니다. 너무 긴 이름보다는
                빠르게 찾을 수 있는 기수/트랙 중심 이름이 좋습니다.
              </p>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="rounded-xl border border-border bg-surface-2/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-dim">
                  현재 이름
                </p>
                <p className="mt-1 text-sm font-semibold text-text">
                  {renameTarget.spaceName}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-[12px] font-medium text-text-secondary">
                  새 스페이스 이름
                </label>
                <input
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent-border"
                  placeholder="예: 풀스택 부트캠프 7기"
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  autoFocus
                  maxLength={100}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                className="rounded-lg border border-border bg-surface-3 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-4 hover:text-text disabled:opacity-50"
                onClick={() => setRenameTarget(null)}
                disabled={renamingSpaceId === renameTarget.spaceId}
              >
                취소
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() =>
                  void handleRenameSpace(
                    renameTarget.spaceId,
                    renameTarget.spaceName,
                  )
                }
                disabled={
                  renamingSpaceId === renameTarget.spaceId ||
                  !renameValue.trim()
                }
              >
                <Pencil size={14} />
                {renamingSpaceId === renameTarget.spaceId
                  ? "변경 중..."
                  : "이름 변경"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[330] flex items-center justify-center bg-[rgba(0,0,0,0.62)] p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && !deletingSpaceId) {
              setDeleteTarget(null);
            }
          }}
        >
          <div className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border border-red/20 bg-surface shadow-2xl">
            <div className="border-b border-border px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red/80">
                스페이스 삭제
              </p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-text">
                이 스페이스를 삭제할까요?
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                <span className="font-semibold text-text">
                  {deleteTarget.spaceName}
                </span>
                과 연결된 수강생 데이터도 함께 삭제됩니다. 이 작업은 되돌릴 수
                없습니다.
              </p>
            </div>

            <div className="space-y-3 px-5 py-5">
              <div className="rounded-xl border border-red/20 bg-red/10 px-4 py-3 text-[13px] leading-relaxed text-red">
                운영 중인 스페이스라면 삭제 전에 CSV/엑셀 내보내기로 먼저
                백업하는 것을 권장합니다.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                className="rounded-lg border border-border bg-surface-3 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-4 hover:text-text disabled:opacity-50"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingSpaceId === deleteTarget.spaceId}
              >
                취소
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-red px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void handleDeleteSpace(deleteTarget.spaceId)}
                disabled={deletingSpaceId === deleteTarget.spaceId}
              >
                <span>🗑</span>
                {deletingSpaceId === deleteTarget.spaceId
                  ? "삭제 중..."
                  : "삭제하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function StudentManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudentManagementProvider>
      <SpaceSettingsDrawerProvider>
        <Suspense fallback={null}>
          <SidebarContent>{children}</SidebarContent>
        </Suspense>
        <SpaceSettingsDrawerHost />
      </SpaceSettingsDrawerProvider>
      <Suspense fallback={null}>
        <OAuthResultToast />
      </Suspense>
    </StudentManagementProvider>
  );
}
