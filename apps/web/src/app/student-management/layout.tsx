"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, GraduationCap, Plus } from "lucide-react";
import { StudentManagementProvider } from "@/features/student-management";
import { useStudentManagement } from "@/features/student-management/student-management-provider";
import styles from "./student-management-layout.module.css";

const NAV_ITEMS = [
  { href: "/student-management", label: "학생 목록", icon: Users, exact: true },
  {
    href: "/student-management/classes",
    label: "코호트 관리",
    icon: GraduationCap,
  },
] as const;

function SidebarInner() {
  const pathname = usePathname();
  const {
    spaces,
    spacesLoading,
    selectedSpaceId,
    setSelectedSpaceId,
  } = useStudentManagement();

  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo}>
        <GraduationCap size={24} style={{ color: "#818cf8" }} />
        <span className={styles.logoText}>학생 관리</span>
      </div>

      {/* 스페이스 선택 */}
      <div style={{ padding: "0 4px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 6,
            padding: "0 8px",
          }}
        >
          스페이스
        </div>
        {spacesLoading ? (
          <div
            style={{ fontSize: 13, color: "var(--text-dim)", padding: "4px 8px" }}
          >
            불러오는 중...
          </div>
        ) : (
          <select
            value={selectedSpaceId ?? ""}
            onChange={(e) =>
              setSelectedSpaceId(e.target.value || null)
            }
            style={{
              width: "100%",
              padding: "7px 10px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              background: "var(--surface2)",
              color: selectedSpaceId ? "var(--text)" : "var(--text-dim)",
              cursor: "pointer",
              outline: "none",
              marginBottom: 6,
            }}
          >
            {spaces.length === 0 && (
              <option value="">스페이스 없음</option>
            )}
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        )}
        <Link
          href="/student-management/spaces/new"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px",
            fontSize: 12,
            color: "var(--accent)",
            textDecoration: "none",
            borderRadius: "var(--radius-sm)",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.background =
              "var(--accent-dim)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.background = "")
          }
        >
          <Plus size={13} />
          스페이스 만들기
        </Link>
      </div>

      <ul className={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const active =
            "exact" in item && item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function StudentManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudentManagementProvider>
      <div className={styles.shell}>
        <SidebarInner />
        <main className={styles.main}>{children}</main>
      </div>
    </StudentManagementProvider>
  );
}
