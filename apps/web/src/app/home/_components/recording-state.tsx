import { MicIcon } from "./icons";
import { fmtTime } from "../_lib/utils";
import styles from "../home.module.css";

export interface RecordingStateProps {
  elapsed: number;
  onStop: () => void;
}

export function RecordingState({ elapsed, onStop }: RecordingStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-0">
      <div className="flex flex-col items-center gap-4 text-center max-w-[360px]">
        <div
          className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-[20px] mb-1"
          style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
        >
          <MicIcon size={32} />
        </div>
        <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">
          녹음 중입니다
        </h2>
        <div className="flex items-center gap-[14px] px-5 py-[14px] mt-5 max-w-[400px] bg-red-dim border border-[rgba(248,113,113,0.2)] rounded">
          <span className={styles.recPulse} />
          <span className="text-xs font-medium text-red">녹음 중</span>
          <span className="font-mono text-[11px] text-text-secondary">
            {fmtTime(elapsed)} 경과
          </span>
        </div>
        <div className="flex items-center gap-0.5 h-8">
          <span
            className={styles.vizBar1}
            style={{ width: 3, background: "var(--red)", borderRadius: 2 }}
          />
          <span
            className={styles.vizBar2}
            style={{ width: 3, background: "var(--red)", borderRadius: 2 }}
          />
          <span
            className={styles.vizBar3}
            style={{ width: 3, background: "var(--red)", borderRadius: 2 }}
          />
          <span
            className={styles.vizBar4}
            style={{ width: 3, background: "var(--red)", borderRadius: 2 }}
          />
          <span
            className={styles.vizBar5}
            style={{ width: 3, background: "var(--red)", borderRadius: 2 }}
          />
        </div>
        <button
          className="bg-red text-white border-none px-4 py-[7px] rounded-sm text-xs cursor-pointer font-[inherit] font-medium"
          onClick={onStop}
        >
          ⏹ 녹음 종료
        </button>
      </div>
    </div>
  );
}
