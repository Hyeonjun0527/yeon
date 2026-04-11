"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Users,
  Plus,
  GraduationCap,
  X,
  CheckCircle,
  AlertCircle,
  Upload,
} from "lucide-react";
import { StudentManagementProvider } from "@/features/student-management";
import { useStudentManagement } from "@/features/student-management/student-management-provider";
import {
  SpaceSettingsDrawerProvider,
  SpaceSettingsDrawerHost,
  useSpaceSettingsDrawer,
} from "@/features/space-settings";
import { Settings } from "lucide-react";

const CloudImportInline = dynamic(
  () =>
    import("@/features/cloud-import/components/cloud-import-inline").then(
      (mod) => mod.CloudImportInline,
    ),
  { ssr: false },
);

/* ── OAuth 결과 토스트 ──
 * URL query param으로 OAuth 결과를 전달받아 표시하는 컴포넌트.
 * useSearchParams()는 브라우저 URL을 읽는 클라이언트 전용 API이므로
 * next/dynamic ssr:false로 명시적으로 클라이언트에서만 실행한다.
 * Suspense 안에서 useSearchParams를 쓰면 Next.js가 해당 서브트리를
 * SSR에서 제외하면서 hydration 불일치가 발생하기 때문이다.
 */

type ToastState = { text: string; type: "success" | "error" } | null;

function OAuthResultToastInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
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
  }, [searchParams, router]);

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
    importMode,
    enterImportMode,
    exitImportMode,
  } = useStudentManagement();
  const { openSpaceSettings } = useSpaceSettingsDrawer();
  const router = useRouter();
  const pathname = usePathname();

  const noSpaces = !spacesLoading && spaces.length === 0;
  const isStudentDetailRoute =
    /^\/home\/student-management\/[^/]+$/.test(pathname) &&
    pathname !== "/home/student-management/members/new";

  function resetDetailRouteIfNeeded() {
    if (isStudentDetailRoute) {
      router.replace("/home/student-management");
    }
  }

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreateSpace() {
    const name = newSpaceName.trim();
    if (!name) {
      setCreateError("이름을 입력해주세요.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/v1/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "스페이스를 만들지 못했습니다.");
      }
      const data = (await res.json()) as { space: { id: string } };
      refetchSpaces();
      setSelectedSpaceId(data.space.id);
      setNewSpaceName("");
      setShowCreateForm(false);
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : "스페이스를 만들지 못했습니다.",
      );
    } finally {
      setCreating(false);
    }
  }

  if (importMode) {
    return (
      <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
        <CloudImportInline
          expanded
          onClose={exitImportMode}
          onImportComplete={refetchSpaces}
        />
      </main>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden md:flex-row flex-col">
      <nav className="w-[240px] bg-surface border-r border-border pt-5 px-3 pb-5 flex flex-col gap-1 flex-shrink-0 overflow-y-auto md:w-[240px] max-md:w-full max-md:flex-row max-md:py-3 max-md:px-4 max-md:gap-1 max-md:border-r-0 max-md:border-b max-md:overflow-x-auto max-md:overflow-y-hidden">
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
          className={`flex items-center gap-2 py-2 px-2.5 rounded-[6px] text-[13px] font-medium cursor-pointer border-none w-full text-left transition-[background,color] duration-[120ms] max-md:whitespace-nowrap max-md:py-2 max-md:px-3${
            selectedSpaceId === null
              ? " bg-accent-dim text-accent font-semibold"
              : " bg-transparent text-text-secondary hover:bg-surface-3 hover:text-text"
          }`}
          onClick={() => {
            setSelectedSpaceId(null);
            if (importMode) exitImportMode();
            resetDetailRouteIfNeeded();
          }}
        >
          <Users size={16} />
          <span style={{ flex: 1 }}>전체 수강생</span>
        </button>

        {/* 스페이스 목록 */}
        <div className="text-[11px] font-semibold text-text-dim uppercase tracking-[0.05em] px-2.5 pt-4 pb-1.5 max-md:hidden">
          스페이스
        </div>
        <div className="flex flex-col gap-0.5 max-md:flex-row max-md:gap-1">
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
          {spaces.map((space) => (
            <button
              key={space.id}
              className={`flex items-center gap-2 py-2 px-2.5 rounded-[6px] text-[13px] font-medium cursor-pointer border-none w-full text-left transition-[background,color] duration-[120ms] max-md:whitespace-nowrap max-md:py-2 max-md:px-3${
                selectedSpaceId === space.id
                  ? " bg-accent-dim text-accent font-semibold"
                  : " bg-transparent text-text-secondary hover:bg-surface-3 hover:text-text"
              }`}
              onClick={() => {
                setSelectedSpaceId(space.id);
                if (importMode) exitImportMode();
                resetDetailRouteIfNeeded();
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: "var(--accent)" }}
              />
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {space.name}
              </span>
              {selectedSpaceId === space.id && (
                <>
                  <span className="ml-auto text-[11px] text-text-dim font-medium tabular-nums">
                    {members.length}
                  </span>
                  <div
                    role="button"
                    tabIndex={0}
                    className="w-5 h-5 flex items-center justify-center text-text-dim hover:text-text cursor-pointer p-0 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSpaceSettings({ spaceId: space.id });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        openSpaceSettings({ spaceId: space.id });
                      }
                    }}
                    title="스페이스 설정"
                  >
                    <Settings size={12} />
                  </div>
                </>
              )}
            </button>
          ))}
        </div>

        {/* 스페이스 생성 인라인 폼 */}
        {showCreateForm ? (
          <div
            style={{
              marginTop: 8,
              padding: "10px 10px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span
                style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}
              >
                새 스페이스
              </span>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-dim)",
                  padding: 0,
                  display: "flex",
                }}
                onClick={() => {
                  setShowCreateForm(false);
                  setNewSpaceName("");
                  setCreateError(null);
                }}
              >
                <X size={14} />
              </button>
            </div>
            <input
              type="text"
              placeholder="스페이스 이름 (예: 풀스택 3기)"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateSpace();
              }}
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: 13,
                border: "1px solid var(--border)",
                borderRadius: 4,
                background: "var(--surface)",
                color: "var(--text)",
                outline: "none",
                boxSizing: "border-box",
              }}
              autoFocus
            />
            {createError && (
              <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>
                {createError}
              </div>
            )}
            <button
              style={{
                marginTop: 8,
                width: "100%",
                padding: "6px 0",
                fontSize: 13,
                fontWeight: 600,
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                opacity: creating ? 0.7 : 1,
              }}
              onClick={handleCreateSpace}
              disabled={creating}
            >
              {creating ? "만드는 중..." : "만들기"}
            </button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1.5 py-2 px-2.5 mt-1 rounded-[6px] text-text-dim text-[13px] font-medium cursor-pointer border border-dashed border-border bg-transparent transition-[border-color,color,background] duration-150 w-full hover:border-accent-border hover:text-accent hover:bg-accent-dim max-md:whitespace-nowrap max-md:w-auto max-md:mt-0"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus size={14} />
            스페이스 만들기
          </button>
        )}

        {/* 클라우드 가져오기 버튼 */}
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
          <button
            className="flex items-center gap-1.5 py-2 px-2.5 mt-1 rounded-[6px] text-text-dim text-[13px] font-medium cursor-pointer border border-dashed border-border bg-transparent transition-[border-color,color,background] duration-150 w-full hover:border-accent-border hover:text-accent hover:bg-accent-dim"
            onClick={enterImportMode}
            type="button"
          >
            <Upload size={14} />
            외부에서 가져오기
          </button>
        </div>
      </nav>
      <main className="flex-1 overflow-y-auto p-8 max-md:px-4 max-md:py-5">
        {children}
      </main>
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
        <SidebarContent>{children}</SidebarContent>
        <SpaceSettingsDrawerHost />
      </SpaceSettingsDrawerProvider>
      <OAuthResultToast />
    </StudentManagementProvider>
  );
}
