"use client";

import { useState } from "react";
import { Users, Plus, GraduationCap, X } from "lucide-react";
import { StudentManagementProvider } from "@/features/student-management";
import { useStudentManagement } from "@/features/student-management/student-management-provider";
import styles from "./student-management-layout.module.css";

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
              <div
                style={{
                  fontSize: 11,
                  color: "var(--red)",
                  marginTop: 4,
                }}
              >
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
    </StudentManagementProvider>
  );
}
