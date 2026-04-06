import { getContestOverview } from "@/lib/contest-overview";

import styles from "./student-management-home.module.css";

export function StudentManagementHomeSkeleton() {
  const overview = getContestOverview();

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>{overview.category}</p>
            <div className={styles.heroTitleRow}>
              <h1 className={styles.heroTitle}>학생관리 워크스페이스</h1>
              <span className={styles.previewBadge}>로딩 상태</span>
            </div>
            <p className={styles.heroSummary}>
              학생 신호와 오늘 브리핑을 차례로 불러오고 있습니다.
            </p>
          </div>
          <div className={styles.heroMetaGrid}>
            <article className={styles.heroMetaCard}>
              <div
                className={`${styles.skeletonLine} ${styles.skeletonTitle}`}
              />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLine} />
            </article>
            <article className={styles.heroMetaCard}>
              <div
                className={`${styles.skeletonLine} ${styles.skeletonTitle}`}
              />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLine} />
            </article>
          </div>
        </section>

        <section className={styles.metricGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index} className={styles.metricCard}>
              <div className={styles.skeletonLine} />
              <div
                className={`${styles.skeletonLine} ${styles.skeletonValue}`}
              />
              <div className={styles.skeletonLine} />
            </article>
          ))}
        </section>

        <section className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>우선순위 학생 큐</p>
                  <h2 className={styles.panelTitle}>
                    학생 카드 구조를 준비 중입니다
                  </h2>
                </div>
              </div>
              <div className={styles.priorityList}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <article key={index} className={styles.priorityCard}>
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLine} />
                  </article>
                ))}
              </div>
            </article>
          </div>

          <aside className={styles.sidebar}>
            <article className={styles.panel}>
              <p className={styles.panelEyebrow}>최근 케어 이력</p>
              <div className={styles.historyList}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <article key={index} className={styles.historyItem}>
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLine} />
                  </article>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
