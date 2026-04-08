import { useState, useRef, useEffect } from "react";
import styles from "../../mockdata/mockdata.module.css";
import type { RecordItem } from "../_lib/types";

export interface SidebarProps {
  records: RecordItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStartRecording: () => void;
  onFileUpload: () => void;
}

export function Sidebar({
  records,
  selectedId,
  onSelect,
  onStartRecording,
  onFileUpload,
}: SidebarProps) {
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
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>상담 기록</h2>
        <div className={styles.btnNewWrap} ref={menuRef}>
          <button
            className={styles.btnNew}
            onClick={() => setShowMenu((p) => !p)}
          >
            + 새 녹음
          </button>
          {showMenu && (
            <div className={styles.btnNewDropdown}>
              <button
                className={styles.btnNewDropdownItem}
                onClick={() => {
                  setShowMenu(false);
                  onStartRecording();
                }}
              >
                🎙 바로 녹음
              </button>
              <button
                className={styles.btnNewDropdownItem}
                onClick={() => {
                  setShowMenu(false);
                  onFileUpload();
                }}
              >
                📁 파일 업로드
              </button>
            </div>
          )}
        </div>
      </div>
      <input
        className={styles.sidebarSearch}
        placeholder="학생, 제목 검색..."
        readOnly
      />
      <div className={styles.sidebarList}>
        {records.map((rec) => (
          <div
            key={rec.id}
            className={`${styles.sidebarItem} ${rec.id === selectedId ? styles.sidebarItemActive : ""}`}
            onClick={() => onSelect(rec.id)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{rec.title}</span>
              <span
                className={`${styles.statusBadge} ${rec.status === "ready" ? styles.statusReady : styles.statusProcessing}`}
              >
                {rec.status === "ready" ? "✓ 완료" : "● 전사 중"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--mock-text-dim)", marginTop: 4 }}>
              {rec.meta || rec.duration}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
