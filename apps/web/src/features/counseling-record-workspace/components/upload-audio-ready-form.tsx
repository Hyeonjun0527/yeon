import type { UploadFormState, UploadTone } from "../types";
import { COUNSELING_TYPE_OPTIONS } from "../constants";
import { formatDurationLabel, formatFileSize } from "../utils";
import styles from "../counseling-record-workspace.module.css";

export interface UploadAudioReadyFormProps {
  selectedAudioFile: File;
  selectedAudioDurationMs: number | null;
  selectedAudioPreviewUrl: string | null;
  formState: UploadFormState;
  updateFormState: <K extends keyof UploadFormState>(
    key: K,
    value: UploadFormState[K],
  ) => void;
  isAdditionalInfoOpen: boolean;
  setIsAdditionalInfoOpen: React.Dispatch<React.SetStateAction<boolean>>;
  uploadState: {
    isUploading: boolean;
    message: string | null;
    tone: UploadTone;
  };
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onStartRecording: () => void;
}

export function UploadAudioReadyForm({
  selectedAudioFile,
  selectedAudioDurationMs,
  selectedAudioPreviewUrl,
  formState,
  updateFormState,
  isAdditionalInfoOpen,
  setIsAdditionalInfoOpen,
  uploadState,
  fileInputRef,
  onStartRecording,
}: UploadAudioReadyFormProps) {
  return (
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
  );
}
