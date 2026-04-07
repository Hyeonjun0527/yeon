import { Mic, Upload } from "lucide-react";
import type { RecordingPhase } from "../types";
import {
  formatCompactDuration,
  formatFileSize,
  formatDurationLabel,
} from "../utils";
import styles from "../counseling-record-workspace.module.css";

export interface EmptyLandingProps {
  recordingPhase: RecordingPhase;
  hasAudioReady: boolean;
  selectedAudioFile: File | null;
  selectedAudioDurationMs: number | null;
  selectedAudioPreviewUrl: string | null;
  recordingElapsedMs: number;
  recordingError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleAudioFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileInputClick: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onGoToUploadPanel: () => void;
}

export function EmptyLanding({
  recordingPhase,
  hasAudioReady,
  selectedAudioFile,
  selectedAudioDurationMs,
  selectedAudioPreviewUrl,
  recordingElapsedMs,
  recordingError,
  fileInputRef,
  handleAudioFileChange,
  onFileInputClick,
  onStartRecording,
  onStopRecording,
  onGoToUploadPanel,
}: EmptyLandingProps) {
  return (
    <div className={styles.emptyLanding}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className={styles.hiddenFileInput}
        onChange={handleAudioFileChange}
      />

      <div className={styles.emptyLandingCta}>
        <div className={styles.emptyLandingIcon}>
          <Mic size={32} strokeWidth={1.5} />
        </div>
        <h2 className={styles.emptyLandingTitle}>
          첫 상담 기록을 만들어 보세요
        </h2>
        <p className={styles.emptyLandingDescription}>
          음성 파일을 업로드하거나 브라우저에서 바로 녹음할 수 있습니다.
        </p>
        {recordingPhase === "idle" && !hasAudioReady ? (
          <div className={styles.emptyLandingActions}>
            <button
              type="button"
              className={styles.emptyLandingButton}
              onClick={onFileInputClick}
            >
              <Upload size={16} strokeWidth={2.2} />
              파일 업로드
            </button>
            <button
              type="button"
              className={styles.emptyLandingButtonSecondary}
              onClick={onStartRecording}
            >
              <Mic size={16} strokeWidth={2.2} />
              바로 녹음하기
            </button>
          </div>
        ) : null}

        {recordingPhase !== "idle" ? (
          <div className={styles.recordingStateBlock}>
            <button
              type="button"
              className={styles.recordingActionButton}
              onClick={
                recordingPhase === "recording"
                  ? onStopRecording
                  : undefined
              }
              disabled={recordingPhase === "finalizing"}
            >
              <Mic size={16} strokeWidth={2.1} />
              {recordingPhase === "recording"
                ? "녹음 중지"
                : "녹음 정리 중"}
            </button>
            <div className={styles.recordingStatusRow}>
              <p className={styles.recordingStatusTitle}>
                {recordingPhase === "recording"
                  ? "현재 녹음 중"
                  : "녹음 정리 중"}
              </p>
              <p className={styles.recordingStatusMeta}>
                {recordingPhase === "recording"
                  ? `${formatCompactDuration(recordingElapsedMs)} 경과 · 중지 후 저장 준비`
                  : "저장 전 확인을 준비하고 있습니다"}
              </p>
            </div>
          </div>
        ) : null}

        {hasAudioReady && selectedAudioFile ? (
          <div className={styles.emptyLandingReadyCard}>
            <p className={styles.selectedAudioLabel}>선택한 오디오</p>
            <p className={styles.selectedAudioTitle}>
              {selectedAudioFile.name}
            </p>
            <p className={styles.selectedAudioMeta}>
              {formatFileSize(selectedAudioFile.size)} ·{" "}
              {formatDurationLabel(selectedAudioDurationMs)} · 저장 준비
            </p>
            {selectedAudioPreviewUrl ? (
              <audio
                className={styles.audioPreview}
                controls
                src={selectedAudioPreviewUrl}
              />
            ) : null}
            <div className={styles.emptyLandingActions}>
              <button
                type="button"
                className={styles.emptyLandingButton}
                onClick={onGoToUploadPanel}
              >
                저장하러 가기
              </button>
            </div>
          </div>
        ) : null}

        {recordingError ? (
          <p
            className={`${styles.inlineMessage} ${styles.inlineError}`}
          >
            {recordingError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
