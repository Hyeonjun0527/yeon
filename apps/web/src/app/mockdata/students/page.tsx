import { Gnav } from "../_components/gnav";
import styles from "../mockdata.module.css";

const STUDENTS = [
  {
    name: "김민수",
    initial: "민",
    gradient: "linear-gradient(135deg, #60a5fa, #818cf8)",
    tags: [
      { label: "수학", cls: styles.tagMath },
      { label: "영어", cls: styles.tagEng },
    ],
    grade: "중2",
    counseling: 12,
    lastDate: "4.8",
    memos: 3,
  },
  {
    name: "이서윤",
    initial: "서",
    gradient: "linear-gradient(135deg, #34d399, #22d3ee)",
    tags: [
      { label: "국어", cls: styles.tagKor },
      { label: "영어", cls: styles.tagEng },
    ],
    grade: "중3",
    counseling: 8,
    lastDate: "4.7",
    memos: 1,
  },
  {
    name: "박도현",
    initial: "도",
    gradient: "linear-gradient(135deg, #fbbf24, #fb923c)",
    tags: [
      { label: "수학", cls: styles.tagMath },
      { label: "과학", cls: styles.tagSci },
    ],
    grade: "중1",
    counseling: 5,
    lastDate: "4.6",
    memos: 0,
  },
  {
    name: "최지우",
    initial: "지",
    gradient: "linear-gradient(135deg, #fb7185, #c084fc)",
    tags: [{ label: "영어", cls: styles.tagEng }],
    grade: "고1",
    counseling: 3,
    lastDate: "4.5",
    memos: 2,
  },
  {
    name: "정현우",
    initial: "현",
    gradient: "linear-gradient(135deg, #818cf8, #60a5fa)",
    tags: [
      { label: "수학", cls: styles.tagMath },
      { label: "국어", cls: styles.tagKor },
    ],
    grade: "중2",
    counseling: 7,
    lastDate: "4.6",
    memos: 1,
  },
  {
    name: "한소희",
    initial: "소",
    gradient: "linear-gradient(135deg, #22d3ee, #818cf8)",
    tags: [
      { label: "영어", cls: styles.tagEng },
      { label: "과학", cls: styles.tagSci },
    ],
    grade: "중3",
    counseling: 10,
    lastDate: "4.7",
    memos: 4,
  },
];

export default function StudentsPage() {
  return (
    <div className={styles.appShell} style={{ minHeight: 560 }}>
      <Gnav activeMenu="students" />

      <div className={styles.flexCol}>
        {/* 페이지 헤더 */}
        <div className={styles.studentPageHeader}>
          <div>
            <p className={styles.studentPageHeaderTitle}>학생 관리</p>
            <p className={styles.studentPageHeaderSub}>총 24명 · 2026학년도</p>
          </div>
          <div className={styles.studentHeaderActions}>
            <input
              className={styles.sidebarSearch}
              style={{ width: 200, margin: 0 }}
              placeholder="학생 검색..."
            />
            <button className={styles.btnNew}>+ 학생 추가</button>
          </div>
        </div>

        {/* 년도 탭 */}
        <div className={styles.yearTabs}>
          <button className={`${styles.yearTab} ${styles.yearTabActive}`}>2026</button>
          <button className={styles.yearTab}>2025</button>
          <button className={styles.yearTab}>2024</button>
          <button className={styles.yearTab}>전체</button>
        </div>

        {/* 학생 카드 그리드 */}
        <div className={styles.studentGrid}>
          {STUDENTS.map((s) => (
            <div key={s.name} className={styles.studentCard}>
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
                      <span key={t.label} className={`${styles.tagSm} ${t.cls}`}>
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
    </div>
  );
}
