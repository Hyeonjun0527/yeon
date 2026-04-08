import { Gnav } from "../_components/gnav";
import styles from "../mockdata.module.css";

export default function RecordingPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "24px 0" }}>
      {/* ── 상태 1: 녹음 중 ── */}
      <section style={{ padding: "0 40px" }}>
        <p style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 8, fontWeight: 500 }}>
          녹음 중
        </p>
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div className={styles.appShell} style={{ minHeight: 320 }}>
            <Gnav activeMenu="records" />
            <div className={styles.flex1}>
              <div className={styles.emptyState}>
                <div
                  className={styles.emptyIconWrap}
                  style={{
                    background: "var(--red-dim)",
                    borderColor: "rgba(248,113,113,0.2)",
                  }}
                >
                  🎙
                </div>
                <p className={styles.emptyTitle}>녹음 중입니다</p>
                <div className={styles.recBar}>
                  <div className={styles.recPulse} />
                  <div style={{ flex: 1 }}>
                    <p className={styles.recLabel}>녹음 중</p>
                    <p className={styles.recTime}>02:34 경과</p>
                  </div>
                  <button className={styles.btnStop}>⏹ 녹음 종료</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 상태 2: 녹음 종료 → 즉시 워크스페이스 (전사 처리 중) ── */}
      <section style={{ padding: "0 40px" }}>
        <p style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 8, fontWeight: 500 }}>
          녹음 종료 → 즉시 워크스페이스 (전사 처리 중)
        </p>
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div className={styles.appShell}>
            <Gnav activeMenu="records" />

            {/* 사이드바 */}
            <div className={styles.sidebar}>
              <div className={styles.sidebarHeader}>
                <span className={styles.sidebarTitle}>상담 기록</span>
                <button className={styles.btnNew}>+ 새 녹음</button>
              </div>
              <div className={styles.sidebarList}>
                <div className={`${styles.sidebarItem} ${styles.sidebarItemActive}`}>
                  <div className={styles.sidebarItemTitle}>녹음 2026.04.08 03:46</div>
                  <div className={styles.sidebarItemMeta}>
                    <span className={`${styles.statusBadge} ${styles.statusProcessing}`}>
                      ● 전사 중
                    </span>
                    2분 34초
                  </div>
                </div>
              </div>
            </div>

            {/* 센터 */}
            <div className={styles.center}>
              <div className={styles.centerHeader}>
                <div>
                  <p className={styles.centerTitle}>녹음 2026.04.08 03:46</p>
                  <p className={styles.centerMeta}>2분 34초 · 전사 처리 중</p>
                </div>
              </div>
              <div className={styles.processingState}>
                <div className={styles.spinner} />
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                  음성을 분석하고 있습니다
                </p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  보통 1~2분 이내 완료
                </p>
              </div>
            </div>

            {/* AI 패널 */}
            <div className={styles.aiPanel}>
              <div className={styles.aiHeader}>
                <span className={`${styles.aiHeaderDot} ${styles.aiHeaderDotAmber}`} />
                AI 어시스턴트
              </div>
              <div className={styles.aiMessages}>
                <div className={`${styles.aiMsg} ${styles.aiMsgSystem}`}>
                  전사가 완료되면 자동으로
                  <br />
                  상담 요약을 생성합니다
                </div>
              </div>
              <div className={styles.aiInputWrap}>
                <input
                  className={styles.aiInput}
                  placeholder="전사 완료 후 질문 가능"
                  disabled
                  style={{ opacity: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
