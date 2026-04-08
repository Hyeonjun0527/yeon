import { LoaderCircle, Mic, Upload } from "lucide-react";
import type { RecordingPhase, UploadFormState, UploadTone } from "../types";
import { COUNSELING_TYPE_OPTIONS } from "../constants";
import {
  formatCompactDuration,
  formatDurationLabel,
  formatFileSize,
} from "../utils";
import styles from "../counseling-record-workspace.module.css";

export interface UploadPanelProps {
  isUploadPanelOpen: boolean;
  setIsUploadPanelOpen: (value: boolean) => void;
  formState: UploadFormState;
  updateFormState: <K extends keyof UploadFormState>(
    key: K,
    value: UploadFormState[K],
  ) => void;
  uploadState: {
    isUploading: boolean;
    message: string | null;
    tone: UploadTone;
  };
  selectedAudioFile: File | null;
  selectedAudioDurationMs: number | null;
  selectedAudioPreviewUrl: string | null;
  hasAudioReady: boolean;
  isAdditionalInfoOpen: boolean;
  setIsAdditionalInfoOpen: React.Dispatch<React.SetStateAction<boolean>>;
  recordingPhase: RecordingPhase;
  recordingElapsedMs: number;
  recordingError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onStartRecording: () => void;
  onStopRecording: () => void;
  handleUploadSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function UploadPanel({
  setIsUploadPanelOpen,
  formState,
  updateFormState,
  uploadState,
  selectedAudioFile,
  selectedAudioDurationMs,
  selectedAudioPreviewUrl,
  hasAudioReady,
  isAdditionalInfoOpen,
  setIsAdditionalInfoOpen,
  recordingPhase,
  recordingElapsedMs,
  recordingError,
  fileInputRef,
  onStartRecording,
  onStopRecording,
  handleUploadSubmit,
}: UploadPanelProps) {
  return (
    <div className={styles.centerUploadPanel}>
      <form className={styles.createRecordForm} onSubmit={handleUploadSubmit}>
        <header className={styles.createRecordHeader}>
          <div>
            <h2 className={styles.centerUploadTitle}>새 기록 만들기</h2>
            <p className={styles.centerUploadDescription}>
              {hasAudioReady
                ? "선택한 오디오를 확인한 뒤 저장합니다."
                : recordingPhase !== "idle"
                  ? "녹음을 마치면 바로 저장할 수 있습니다."
                  : "파일을 올리거나 바로 녹음해 시작합니다."}
            </p>
          </div>
          <button
            type="button"
            className={styles.topbarGhostButton}
            onClick={() => setIsUploadPanelOpen(false)}
          >
            닫기
          </button>
        </header>

        {!selectedAudioFile && recordingPhase === "idle" ? (
          <div className={styles.primaryCtaStack}>
            <button
              type="button"
              className={styles.primaryCtaTile}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState.isUploading}
            >
              <Upload size={20} strokeWidth={2} />
              <div>
                <span className={styles.primaryCtaTileTitle}>파일 업로드</span>
                <span className={styles.primaryCtaTileDescription}>
                  오디오 파일에서 시작
                </span>
              </div>
            </button>
            <button
              type="button"
              className={styles.primaryCtaTile}
              onClick={onStartRecording}
              disabled={uploadState.isUploading}
            >
              <Mic size={20} strokeWidth={2} />
              <div>
                <span className={styles.primaryCtaTileTitle}>
                  바로 녹음하기
                </span>
                <span className={styles.primaryCtaTileDescription}>
                  지금 바로 녹음 시작
                </span>
              </div>
            </button>
          </div>
        ) : null}

        {recordingPhase !== "idle" ? (
          <div className={styles.recordingStateBlock}>
            <button
              type="button"
              className={styles.recordingActionButton}
              onClick={
                recordingPhase === "recording" ? onStopRecording : undefined
              }
              disabled={recordingPhase === "finalizing"}
            >
              <Mic size={16} strokeWidth={2.1} />
              {recordingPhase === "recording" ? "녹음 중지" : "녹음 정리 중"}
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
          <>
            <div className={styles.selectedAudioCard}>
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
            </div>

            <label className={styles.minimalField}>
              <span>학생 이름</span>
              <input
                value={formState.studentName}
                onChange={(event) =>
                  updateFormState("studentName", event.target.value)
                }
                className={styles.formInput}
                placeholder="예: 김민수"
              />
            </label>

            <div className={styles.additionalInfoSection}>
              <button
                type="button"
                className={styles.additionalInfoToggle}
                aria-expanded={isAdditionalInfoOpen}
                aria-controls="create-record-additional-fields"
                onClick={() => setIsAdditionalInfoOpen((current) => !current)}
              >
                <span className={styles.additionalInfoLabel}>추가 정보</span>
                <span className={styles.additionalInfoSummary}>
                  제목, 상담 유형
                </span>
              </button>

              {isAdditionalInfoOpen ? (
                <div
                  id="create-record-additional-fields"
                  className={styles.additionalInfoBody}
                >
                  <label className={styles.fieldLabel}>
                    <span>상담 제목</span>
                    <input
                      value={formState.sessionTitle}
                      onChange={(event) =>
                        updateFormState("sessionTitle", event.target.value)
                      }
                      className={styles.formInput}
                      placeholder="자동으로 채워집니다"
                    />
                  </label>
                  <div className={styles.additionalInfoGrid}>
                    <label className={styles.fieldLabel}>
                      <span>상담 유형</span>
                      <select
                        value={formState.counselingType}
                        onChange={(event) =>
                          updateFormState("counselingType", event.target.value)
                        }
                        className={styles.formSelect}
                      >
                        {COUNSELING_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ) : null}
            </div>

            <div className={styles.supportActionRow}>
              <button
                type="button"
                className={styles.topbarGhostButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadState.isUploading}
              >
                다른 파일 선택
              </button>
              <button
                type="button"
                className={styles.topbarGhostButton}
                onClick={onStartRecording}
                disabled={uploadState.isUploading}
              >
                바로 녹음하기
              </button>
            </div>
          </>
        ) : null}

        {recordingError ? (
          <p className={`${styles.inlineMessage} ${styles.inlineError}`}>
            {recordingError}
          </p>
        ) : null}

        {uploadState.message ? (
          <p
            className={`${styles.inlineMessage} ${
              uploadState.tone === "error"
                ? styles.inlineError
                : uploadState.tone === "success"
                  ? styles.inlineSuccess
                  : styles.inlineNeutral
            }`}
          >
            {uploadState.message}
          </p>
        ) : null}

        {hasAudioReady ? (
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={uploadState.isUploading}
          >
            {uploadState.isUploading ? (
              <>
                <LoaderCircle
                  size={16}
                  strokeWidth={2.1}
                  className={styles.spinningIcon}
                />
                저장 후 전사 큐 등록 중
              </>
            ) : (
              "기록 저장"
            )}
          </button>
        ) : null}
      </form>
    </div>
  );
}
