import styles from "../../mockdata/mockdata.module.css";
import { ChevronDownIcon } from "./icons";

export function TopNav() {
  return (
    <div className={styles.topNav}>
      {/* 왼쪽: 모델 선택기 스타일 */}
      <button
        className={styles.topNavModelBtn}
        title="모델 선택"
      >
        <span className={styles.logo}>YEON</span>
        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
          상담 기록
        </span>
        <ChevronDownIcon size={14} />
      </button>

      <div style={{ flex: 1 }} />

      {/* 오른쪽: 액션 버튼 */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button className={styles.topNavActionBtn} title="공유">
          <ShareIcon size={18} />
        </button>
      </div>
    </div>
  );
}

function ShareIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  );
}
