import styles from "../../mockdata/mockdata.module.css";
import type { RecordItem, RecordPhase } from "../_lib/types";
import { fmtTime, fmtMs } from "../_lib/utils";

const PROCESSING_STEPS = [
  { label: "음성 파일 업로드" },
  { label: "화자 분리" },
  { label: "음성 전사" },
  { label: "화자 식별" },
  { label: "상담 분석" },
  { label: "요약 생성" },
];

export interface CenterPanelProps {
  phase: RecordPhase;
  selected: RecordItem | null;
  processingStep: number;
  /* 오디오 */
  isPlaying: boolean;
  audioPosition: number;
  totalSeconds: number;
  onTogglePlay: () => void;
  onSeek: (pct: number) => void;
}

export function CenterPanel({
  phase,
  selected,
  processingStep,
  isPlaying,
  audioPosition,
  totalSeconds,
  onTogglePlay,
  onSeek,
}: CenterPanelProps) {
  if (!selected) return null;

  /* 처리 중 */
  if (phase === "processing" && selected.status === "processing") {
    return (
      <div className={styles.center}>
        <div className={styles.centerHeader}>
          <h1 className={styles.centerTitle}>{selected.title}</h1>
          <div className={styles.centerMeta}>{selected.duration} · AI 분석 중</div>
        </div>
        <div className={styles.centerBody}>
          <div className={styles.processingState}>
            <div className={styles.spinner} />
            <p style={{ fontWeight: 500, marginTop: 16 }}>음성을 분석하고 있습니다</p>
            <p style={{ color: "var(--mock-text-dim)", fontSize: 13, marginTop: 4 }}>
              화자 분리 → 전사 → 화자 식별 → 상담 분석
            </p>
            <div style={{ marginTop: 24, width: "100%", maxWidth: 300 }}>
              {PROCESSING_STEPS.map((step, i) => (
                <div
                  key={step.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    fontSize: 13,
                    color: i < processingStep ? "var(--mock-accent)" : "var(--mock-text-dim)",
                  }}
                >
                  <span>{i < processingStep ? "✓" : i === processingStep ? "⟳" : "○"}</span>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* 결과 */
  if (selected.status === "ready") {
    return (
      <div className={styles.center}>
        <div className={styles.centerHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 className={`${styles.centerTitle} ${styles.editable}`}>{selected.title}</h1>
          </div>
          <div className={styles.centerMeta}>
            <span className={styles.editable}>{selected.studentName}</span>
            {" · "}
            <span className={styles.editable}>{selected.type}</span>
            {" · "}
            {selected.duration}
            {" · 원문 완료"}
          </div>
        </div>

        {/* 오디오 플레이어 */}
        <div className={styles.audioPlayer}>
          <button className={styles.playBtn} onClick={onTogglePlay}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <span className={styles.audioTime}>{fmtTime(audioPosition)}</span>
          <div
            className={styles.audioTrack}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              onSeek(pct);
            }}
          >
            <div
              className={styles.audioTrackFill}
              style={{ width: `${(audioPosition / totalSeconds) * 100}%` }}
            />
          </div>
          <span className={styles.audioTime}>{fmtTime(totalSeconds)}</span>
        </div>

        {/* 전사 텍스트 */}
        <div className={styles.centerBody}>
          {selected.transcript.length === 0 ? (
            <div style={{ color: "var(--mock-text-dim)", fontSize: 13, padding: "24px 0" }}>
              전사 내용을 불러오는 중...
            </div>
          ) : (
            selected.transcript.map((seg, i) => (
              <div key={seg.id ?? i} className={styles.segment}>
                <span className={styles.segTime}>{fmtMs(seg.startMs)}</span>
                <span
                  className={`${styles.segSpeaker} ${seg.speakerTone === "teacher" ? styles.segTeacher : styles.segStudent}`}
                >
                  {seg.speakerLabel}
                </span>
                <span className={styles.segText}>{seg.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
}
