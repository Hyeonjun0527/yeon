import { useState, useRef, useEffect } from "react";
import styles from "../../mockdata/mockdata.module.css";
import { SettingsIcon, LogOutIcon } from "./icons";
import type { ActiveMenu } from "../_hooks/use-workspace-nav";

type GnavProps = {
  activeMenu: ActiveMenu;
  onMenuChange: (menu: ActiveMenu) => void;
};

export function Gnav({ activeMenu, onMenuChange }: GnavProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  return (
    <div className={styles.gnav}>
      {/* 상단: 로고 */}
      <div className={styles.gnavItem} title="홈" style={{ marginBottom: 4 }}>
        <span className={styles.logo} style={{ fontSize: 13 }}>Y</span>
      </div>

      {/* 메뉴 */}
      <div style={{ marginTop: 8 }}>
        <div
          className={`${styles.gnavItem} ${activeMenu === "records" ? styles.gnavItemActive : ""}`}
          title="상담 기록"
          onClick={() => onMenuChange("records")}
          style={{ cursor: "pointer" }}
        >
          <RecordIcon size={16} />
        </div>
      </div>
      <div
        className={`${styles.gnavItem} ${activeMenu === "students" ? styles.gnavItemActive : ""}`}
        title="학생 관리"
        onClick={() => onMenuChange("students")}
        style={{ cursor: "pointer" }}
      >
        <StudentsIcon size={16} />
      </div>
      <div
        className={`${styles.gnavItem} ${activeMenu === "tasks" ? styles.gnavItemActive : ""}`}
        title="후속 조치"
        onClick={() => onMenuChange("tasks")}
        style={{ cursor: "pointer" }}
      >
        <TaskIcon size={16} />
      </div>
      <div
        className={`${styles.gnavItem} ${activeMenu === "reports" ? styles.gnavItemActive : ""}`}
        title="수강생 리포트"
        onClick={() => onMenuChange("reports")}
        style={{ cursor: "pointer" }}
      >
        <ReportIcon size={16} />
      </div>

      <div className={styles.gnavSpacer} />

      {/* 하단: 프로필 */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          onClick={() => setShowMenu((p) => !p)}
          className={styles.gnavAvatar}
          style={{ cursor: "pointer", border: "none" }}
          title="프로필"
        >
          최
        </button>
        {showMenu && (
          <div
            className={styles.btnNewDropdown}
            style={{
              bottom: "calc(100% + 8px)",
              top: "auto",
              left: "calc(100% + 8px)",
              right: "auto",
              minWidth: 140,
            }}
          >
            <button className={styles.btnNewDropdownItem}>
              <SettingsIcon size={14} />
              설정
            </button>
            <button
              className={styles.btnNewDropdownItem}
              style={{ color: "var(--red)" }}
              onClick={() => {
                setShowMenu(false);
                alert("로그아웃 (시뮬레이션)");
              }}
            >
              <LogOutIcon size={14} />
              로그아웃
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 네비게이션 전용 아이콘 ── */

function RecordIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

function StudentsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TaskIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function ReportIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}
