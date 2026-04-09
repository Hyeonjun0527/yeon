"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users, Plus, GraduationCap, X, CheckCircle, AlertCircle } from "lucide-react";
import { StudentManagementProvider } from "@/features/student-management";
import { useStudentManagement } from "@/features/student-management/student-management-provider";
import { CloudImport } from "@/features/cloud-import";
import styles from "./student-management-layout.module.css";

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
      setToast({ text: "Google Drive 연동에 실패했습니다. 다시 시도해주세요.", type: "error" });
    } else if (odConnected === "true") {
      setToast({ text: "OneDrive 연동이 완료됐습니다.", type: "success" });
    } else if (odError) {
      setToast({ text: "OneDrive 연동에 실패했습니다. 다시 시도해주세요.", type: "error" });
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

const OAuthResultToast = dynamic(() => Promise.resolve(OAuthResultToastInner), { ssr: false });

function SidebarContent({ children }: { children: React.ReactNode }) {
  const {
    spaces,
    spacesLoading,
    selectedSpaceId,
    setSelectedSpaceId,
    refetchSpaces,
    members,
  } = useStudentManagement();

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

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar}>
        <div className={styles.logo}>
          <GraduationCap size={20} style={{ color: "var(--accent)" }} />
          <span className={styles.logoText}>수강생 관리</span>
        </div>

        {/* 전체 수강생 */}
        <button
          className={`${styles.navItem} ${selectedSpaceId === null ? styles.navItemActive : ""}`}
          onClick={() => setSelectedSpaceId(null)}
        >
          <Users size={16} />
          <span style={{ flex: 1 }}>전체 수강생</span>
        </button>

        {/* 스페이스 목록 */}
        <div className={styles.sectionLabel}>스페이스</div>
        <div className={styles.cohortList}>
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
          {!spacesLoading && spaces.length === 0 && (
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
              className={`${styles.navItem} ${selectedSpaceId === space.id ? styles.navItemActive : ""}`}
              onClick={() => setSelectedSpaceId(space.id)}
            >
              <span
                className={styles.cohortDot}
                style={{ backgroundColor: "var(--accent)" }}
              />
              <span className={styles.cohortName}>{space.name}</span>
              {selectedSpaceId === space.id && (
                <span className={styles.navCount}>{members.length}</span>
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
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
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
            className={styles.addCohortBtn}
            onClick={() => setShowCreateForm(true)}
          >
            <Plus size={14} />
            스페이스 만들기
          </button>
        )}

        {/* OneDrive AI 임포트 */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 16,
            borderTop: "1px solid var(--border)",
          }}
        >
          <CloudImport onImportComplete={refetchSpaces} />
        </div>
      </nav>
      <main className={styles.main}>{children}</main>
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
      <SidebarContent>{children}</SidebarContent>
      <OAuthResultToast />
    </StudentManagementProvider>
  );
}
