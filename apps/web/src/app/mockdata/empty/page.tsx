import { Gnav } from "../_components/gnav";
import styles from "../mockdata.module.css";

export default function EmptyPage() {
  return (
    <div className={styles.appShell}>
      <Gnav activeMenu="records" />
      <div className={styles.flex1}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrap}>🎙</div>
          <p className={styles.emptyTitle}>상담을 녹음해 보세요</p>
          <p className={styles.emptyDesc}>
            녹음하면 AI가 자동으로 전사하고, 학생 이름·상담 요약까지 정리합니다.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className={`${styles.btnLg} ${styles.btnAccent}`}>
              🎙 녹음 시작
            </button>
            <button className={`${styles.btnLg} ${styles.btnOutline}`}>
              📁 파일 업로드
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
