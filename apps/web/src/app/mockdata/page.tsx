import Link from "next/link";
import styles from "./mockdata.module.css";

const PAGES = [
  {
    href: "/mockdata/empty",
    phase: "1차",
    phaseClass: styles.badgePhase1,
    title: "첫 화면 — 기록 0건",
    desc: "글로벌 네비게이션 + 중앙 CTA. 녹음 버튼 하나로 시작.",
  },
  {
    href: "/mockdata/recording",
    phase: "1차",
    phaseClass: styles.badgePhase1,
    title: "녹음 → 즉시 워크스페이스",
    desc: "녹음 중지 순간 자동 업로드. 폼 없이 바로 전사 처리 중 화면으로 전환.",
  },
  {
    href: "/mockdata/result",
    phase: "2차",
    phaseClass: styles.badgePhase2,
    title: "전사 완료 + AI 자동 요약",
    desc: "AI가 학생 이름, 상담 제목, 유형, 핵심 요약을 자동 추출. 인라인 수정 가능.",
  },
  {
    href: "/mockdata/students",
    phase: "3차",
    phaseClass: styles.badgePhase3,
    title: "학생 관리 — 년도별 · 과목별",
    desc: "학원 학생을 년도별로 관리. 카드 뷰. 상담 횟수, 마지막 상담일, 과목 태그.",
  },
  {
    href: "/mockdata/students/detail",
    phase: "3차",
    phaseClass: styles.badgePhase3,
    title: "학생 상세 — 상담 이력 + AI 종합 분석",
    desc: "학생별 전체 상담 이력 타임라인. AI 종합 분석. 보호자 소통 자료 생성.",
  },
];

export default function MockdataIndexPage() {
  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.pageBadge}>OVERVIEW</div>
        <h2 className={styles.pageTitle}>
          YEON — 학원 학생관리 + AI 상담 기록
        </h2>
        <p className={styles.pageDesc}>
          사설 학원/아카데미에서 학생 상담·수업 기록을 녹음하면 AI가 자동 정리.
          년도별 학생 관리까지 한 곳에서.
        </p>
      </div>

      <div className={styles.cardGrid}>
        {PAGES.map((page) => (
          <Link key={page.href} href={page.href} className={styles.linkCard}>
            <div className={`${styles.linkCardBadge} ${page.phaseClass}`}>
              {page.phase}
            </div>
            <p className={styles.linkCardTitle}>{page.title}</p>
            <p className={styles.linkCardDesc}>{page.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
