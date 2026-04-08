import styles from "../../mockdata/mockdata.module.css";
import { MicIcon, UploadIcon } from "./icons";

export interface EmptyStateProps {
  onStartRecording: () => void;
  onFileUpload: () => void;
}

export function EmptyState({ onStartRecording, onFileUpload }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateCta}>
        <div className={styles.emptyIconWrap}>
          <MicIcon size={32} />
        </div>
        <h2 className={styles.emptyTitle}>첫 상담 기록을 만들어 보세요</h2>
        <p className={styles.emptyDesc}>
          음성 파일을 업로드하거나 브라우저에서 바로 녹음할 수 있습니다.
        </p>
        <div className={styles.emptyActions}>
          <button
            className={`${styles.btnLg} ${styles.btnAccent}`}
            onClick={onFileUpload}
          >
            <UploadIcon />
            파일 업로드
          </button>
          <button
            className={`${styles.btnLg} ${styles.btnOutline}`}
            onClick={onStartRecording}
          >
            <MicIcon />
            바로 녹음하기
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
          또는 오디오 파일을 여기에 드래그 앤 드롭
        </p>
      </div>
    </div>
  );
}
