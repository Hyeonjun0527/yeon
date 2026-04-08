import { LoaderCircle, Mic } from "lucide-react";
import type { RecordingPhase, UploadFormState, UploadTone } from "../types";
import { formatCompactDuration } from "../utils";
import styles from "../counseling-record-workspace.module.css";
import { UploadAudioSourcePicker } from "./upload-audio-source-picker";
import { UploadAudioReadyForm } from "./upload-audio-ready-form";

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
          <UploadAudioSourcePicker
            fileInputRef={fileInputRef}
            onStartRecording={onStartRecording}
            isUploading={uploadState.isUploading}
          />
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
          <UploadAudioReadyForm
            selectedAudioFile={selectedAudioFile}
            selectedAudioDurationMs={selectedAudioDurationMs}
            selectedAudioPreviewUrl={selectedAudioPreviewUrl}
            formState={formState}
            updateFormState={updateFormState}
            isAdditionalInfoOpen={isAdditionalInfoOpen}
            setIsAdditionalInfoOpen={setIsAdditionalInfoOpen}
            uploadState={uploadState}
            fileInputRef={fileInputRef}
            onStartRecording={onStartRecording}
          />
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
