import styles from "../../mockdata/mockdata.module.css";
import { MicIcon } from "./icons";
import { fmtTime } from "../_lib/utils";

export interface RecordingStateProps {
  elapsed: number;
  onStop: () => void;
}

export function RecordingState({ elapsed, onStop }: RecordingStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateCta}>
        <div
          className={styles.emptyIconWrap}
          style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
        >
          <MicIcon size={32} />
        </div>
        <h2 className={styles.emptyTitle}>녹음 중입니다</h2>
        <div className={styles.recBar}>
          <span className={styles.recPulse} />
          <span className={styles.recLabel}>녹음 중</span>
          <span className={styles.recTime}>{fmtTime(elapsed)} 경과</span>
        </div>
        <div className={styles.visualizer}>
          <span className={styles.vizBar1} />
          <span className={styles.vizBar2} />
          <span className={styles.vizBar3} />
          <span className={styles.vizBar4} />
          <span className={styles.vizBar5} />
        </div>
        <button className={styles.btnStop} onClick={onStop}>
          ⏹ 녹음 종료
        </button>
      </div>
    </div>
  );
}
