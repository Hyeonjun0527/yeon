import styles from "../../mockdata/mockdata.module.css";
import type { Student } from "../_hooks/use-students";

type StudentListProps = {
  students: Student[];
  totalCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (id: string) => void;
};

export function StudentList({
  students,
  totalCount,
  search,
  onSearchChange,
  onSelect,
}: StudentListProps) {
  return (
    <div className={styles.flexCol}>
      {/* 페이지 헤더 */}
      <div className={styles.studentPageHeader}>
        <div>
          <p className={styles.studentPageHeaderTitle}>학생 관리</p>
          <p className={styles.studentPageHeaderSub}>
            총 {totalCount}명 · 2026학년도
          </p>
        </div>
        <div className={styles.studentHeaderActions}>
          <input
            className={styles.sidebarSearch}
            style={{ width: 200, margin: 0 }}
            placeholder="학생 검색..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button className={styles.btnNew}>+ 학생 추가</button>
        </div>
      </div>

      {/* 년도 탭 */}
      <div className={styles.yearTabs}>
        <button className={`${styles.yearTab} ${styles.yearTabActive}`}>
          2026
        </button>
        <button className={styles.yearTab}>2025</button>
        <button className={styles.yearTab}>2024</button>
        <button className={styles.yearTab}>전체</button>
      </div>

      {/* 학생 카드 그리드 */}
      <div className={styles.studentGrid}>
        {students.map((s) => (
          <div
            key={s.id}
            className={styles.studentCard}
            style={{ cursor: "pointer" }}
            onClick={() => onSelect(s.id)}
          >
            <div className={styles.studentCardHeader}>
              <div
                className={styles.studentAvatar}
                style={{ background: s.gradient }}
              >
                {s.initial}
              </div>
              <div>
                <p className={styles.studentName}>{s.name}</p>
                <p className={styles.studentSub}>
                  {s.tags.map((t) => (
                    <span
                      key={t.label}
                      className={`${styles.tagSm} ${styles[t.cls]}`}
                    >
                      {t.label}
                    </span>
                  ))}
                  {" "}· {s.grade}
                </p>
              </div>
            </div>
            <div className={styles.studentStats}>
              <div>
                <p className={styles.studentStatLabel}>상담</p>
                <p className={styles.studentStatValue}>{s.counseling}</p>
              </div>
              <div>
                <p className={styles.studentStatLabel}>마지막</p>
                <p className={styles.studentStatValue}>{s.lastDate}</p>
              </div>
              <div>
                <p className={styles.studentStatLabel}>메모</p>
                <p className={styles.studentStatValue}>{s.memos}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
