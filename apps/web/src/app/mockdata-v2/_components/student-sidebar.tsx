import styles from "../../mockdata/mockdata.module.css";
import type { Student } from "../../mockdata/app/_data/mock-data";
import type { StudentStatusFilter } from "../_hooks/use-student-view";

type StudentSidebarProps = {
  students: readonly Student[];
  selectedId: string | null;
  search: string;
  statusFilter: StudentStatusFilter;
  onSelect: (id: string) => void;
  onSearchChange: (v: string) => void;
  onStatusFilter: (v: StudentStatusFilter) => void;
};

const FILTERS: { value: StudentStatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "active", label: "수강중" },
  { value: "graduated", label: "수료" },
  { value: "leave", label: "휴원" },
];

export function StudentSidebar({
  students,
  selectedId,
  search,
  statusFilter,
  onSelect,
  onSearchChange,
  onStatusFilter,
}: StudentSidebarProps) {
  return (
    <div className={styles.sidebar}>
      {/* 헤더 */}
      <div className={styles.sidebarHeader}>
        <span className={styles.sidebarTitle}>학생 관리</span>
        <button className={styles.btnNew}>+ 등록</button>
      </div>

      {/* 검색 */}
      <div style={{ padding: "0 12px 8px" }}>
        <input
          className={styles.sidebarSearch}
          placeholder="이름, 트랙, 기수 검색…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* 필터 */}
      <div className={styles.stuFilters}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`${styles.stuFilterBtn} ${statusFilter === f.value ? styles.stuFilterBtnActive : ""}`}
            onClick={() => onStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 학생 리스트 */}
      <div className={styles.sidebarList}>
        {students.map((s) => (
          <div
            key={s.id}
            className={`${styles.stuItem} ${selectedId === s.id ? styles.stuItemActive : ""}`}
            onClick={() => onSelect(s.id)}
          >
            <div
              className={styles.stuAvatar}
              style={{ background: s.gradient }}
            >
              {s.initial}
            </div>
            <div className={styles.stuItemInfo}>
              <div className={styles.stuItemName}>{s.name}</div>
              <div className={styles.stuItemMeta}>
                {s.grade} · {s.tags.map((t) => t.label).join(", ")}
              </div>
            </div>
            <div className={styles.stuItemStats}>
              <span className={styles.stuItemCount}>{s.counseling}</span>
              <span className={styles.stuItemCountLabel}>상담</span>
            </div>
          </div>
        ))}

        {students.length === 0 && (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
            검색 결과가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
