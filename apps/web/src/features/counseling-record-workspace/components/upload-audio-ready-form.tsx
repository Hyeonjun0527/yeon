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
      <div
        className="grid gap-2 p-[14px] rounded-[10px] border"
        style={{
          borderColor: "var(--border-soft)",
          background: "var(--surface-soft)",
        }}
      >
        <p className="m-0 text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
          선택한 오디오
        </p>
        <p className="m-0 text-[15px] font-bold leading-[1.35]">
          {selectedAudioFile.name}
        </p>
        <p className="m-0 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {formatFileSize(selectedAudioFile.size)} ·{" "}
          {formatDurationLabel(selectedAudioDurationMs)} · 저장 준비
        </p>
        {selectedAudioPreviewUrl ? (
          <audio className="w-full" controls src={selectedAudioPreviewUrl} />
        ) : null}
      </div>

      <label className="grid gap-[6px]">
        <span className="text-xs font-bold tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
          수강생 이름
        </span>
        <input
          value={formState.studentName}
          onChange={(event) => updateFormState("studentName", event.target.value)}
          className="w-full min-h-[44px] px-[14px] rounded-[10px] border outline-none transition-[border-color,background-color] duration-[180ms]"
          style={{
            borderColor: "var(--border-primary)",
            background: "var(--surface-secondary)",
            color: "var(--text-primary)",
          }}
          placeholder="예: 김민수"
        />
      </label>

      <div className="grid gap-0">
        <button
          type="button"
          className="flex items-center justify-between gap-2 h-11 px-3 border rounded-xl bg-transparent cursor-pointer transition-[background-color,border-color] duration-[180ms]"
          style={{ borderColor: "var(--border-soft)" }}
          aria-expanded={isAdditionalInfoOpen}
          aria-controls="create-record-additional-fields"
          onClick={() => setIsAdditionalInfoOpen((current) => !current)}
        >
          <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
            추가 정보
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            제목, 상담 유형
          </span>
        </button>

        {isAdditionalInfoOpen ? (
          <div id="create-record-additional-fields" className="grid gap-3 pt-3">
            <label className="grid gap-2">
              <span className="text-xs font-bold tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
                상담 제목
              </span>
              <input
                value={formState.sessionTitle}
                onChange={(event) => updateFormState("sessionTitle", event.target.value)}
                className="w-full min-h-[44px] px-[14px] rounded-[10px] border outline-none transition-[border-color,background-color] duration-[180ms]"
                style={{
                  borderColor: "var(--border-primary)",
                  background: "var(--surface-secondary)",
                  color: "var(--text-primary)",
                }}
                placeholder="자동으로 채워집니다"
              />
            </label>
            <div className={styles.additionalInfoGrid}>
              <label className="grid gap-2">
                <span className="text-xs font-bold tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
                  상담 유형
                </span>
                <select
                  value={formState.counselingType}
                  onChange={(event) => updateFormState("counselingType", event.target.value)}
                  className="w-full min-h-[44px] px-[14px] rounded-[10px] border outline-none transition-[border-color,background-color] duration-[180ms]"
                  style={{
                    borderColor: "var(--border-primary)",
                    background: "var(--surface-secondary)",
                    color: "var(--text-primary)",
                  }}
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

      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-[6px] min-h-9 px-3 border rounded-[10px] bg-transparent text-[13px] font-semibold cursor-pointer transition-[background-color,border-color] duration-[180ms]"
          style={{
            borderColor: "var(--border-soft)",
            color: "var(--text-secondary)",
          }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadState.isUploading}
        >
          다른 파일 선택
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-[6px] min-h-9 px-3 border rounded-[10px] bg-transparent text-[13px] font-semibold cursor-pointer transition-[background-color,border-color] duration-[180ms]"
          style={{
            borderColor: "var(--border-soft)",
            color: "var(--text-secondary)",
          }}
          onClick={onStartRecording}
          disabled={uploadState.isUploading}
        >
          바로 녹음하기
        </button>
      </div>
    </>
  );
}
