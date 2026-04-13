import { Download, LoaderCircle, Mic, Upload } from "lucide-react";
import type { RecordingPhase, UploadFormState, UploadTone } from "../types";
import { COUNSELING_TYPE_OPTIONS } from "../constants";
import {
  formatCompactDuration,
  formatDurationLabel,
  formatFileSize,
} from "../utils";
import styles from "../counseling-record-workspace.module.css";
import { AUDIO_SAMPLE_TEST_DATA } from "@/lib/test-data-downloads";

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
  onCancelRecording: () => void;
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
  onCancelRecording,
  handleUploadSubmit,
}: UploadPanelProps) {
  return (
    <div
      className="grid place-items-center min-h-[400px] p-8 border rounded-xl"
      style={{
        borderColor: "var(--border-primary)",
        background: "var(--surface-primary)",
      }}
    >
      <form
        className="grid gap-[14px] w-[min(480px,100%)]"
        onSubmit={handleUploadSubmit}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-xl font-bold tracking-[-0.03em]">
              새 기록 만들기
            </h2>
            <p
              className="mt-1 mb-0 text-[13px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {hasAudioReady
                ? "선택한 오디오를 확인한 뒤 저장합니다."
                : recordingPhase !== "idle"
                  ? "녹음을 마치면 바로 저장할 수 있습니다."
                  : "파일을 올리거나 바로 녹음해 시작합니다."}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-[6px] min-h-9 px-3 border rounded-[10px] bg-transparent text-[13px] font-semibold cursor-pointer transition-[background-color,border-color] duration-[180ms]"
            style={{
              borderColor: "var(--border-soft)",
              color: "var(--text-secondary)",
            }}
            onClick={() => setIsUploadPanelOpen(false)}
          >
            닫기
          </button>
        </header>

        {!selectedAudioFile && recordingPhase === "idle" ? (
          <div className="grid gap-[10px]">
            <button
              type="button"
              className="flex items-center gap-[14px] min-h-[76px] py-4 px-[18px] border rounded-[10px] text-left cursor-pointer transition-[transform,border-color,background-color,box-shadow] duration-[180ms] hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]"
              style={{
                borderColor: "var(--border-soft)",
                background: "var(--surface-primary)",
              }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState.isUploading}
            >
              <Upload
                size={20}
                strokeWidth={2}
                style={{ flexShrink: 0, color: "var(--accent)" }}
              />
              <div className="grid gap-[2px]">
                <span
                  className="text-[15px] font-bold leading-[1.3]"
                  style={{ color: "var(--text-primary)" }}
                >
                  파일 업로드
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  오디오 파일에서 시작
                </span>
              </div>
            </button>
            <button
              type="button"
              className="flex items-center gap-[14px] min-h-[76px] py-4 px-[18px] border rounded-[10px] text-left cursor-pointer transition-[transform,border-color,background-color,box-shadow] duration-[180ms] hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]"
              style={{
                borderColor: "var(--border-soft)",
                background: "var(--surface-primary)",
              }}
              onClick={onStartRecording}
              disabled={uploadState.isUploading}
            >
              <Mic
                size={20}
                strokeWidth={2}
                style={{ flexShrink: 0, color: "var(--accent)" }}
              />
              <div className="grid gap-[2px]">
                <span
                  className="text-[15px] font-bold leading-[1.3]"
                  style={{ color: "var(--text-primary)" }}
                >
                  바로 녹음하기
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  지금 바로 녹음 시작
                </span>
              </div>
            </button>
            <a
              href={AUDIO_SAMPLE_TEST_DATA.href}
              download={AUDIO_SAMPLE_TEST_DATA.downloadName}
              className="flex items-center gap-[14px] min-h-[64px] py-4 px-[18px] border rounded-[10px] text-left cursor-pointer transition-[transform,border-color,background-color,box-shadow] duration-[180ms] hover:-translate-y-px"
              style={{
                borderColor: "var(--border-soft)",
                background: "var(--surface-primary)",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              <Download
                size={20}
                strokeWidth={2}
                style={{ flexShrink: 0, color: "var(--accent)" }}
              />
              <div className="grid gap-[2px]">
                <span
                  className="text-[15px] font-bold leading-[1.3]"
                  style={{ color: "var(--text-primary)" }}
                >
                  {AUDIO_SAMPLE_TEST_DATA.label}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  20분 분량 샘플 음성 다운로드
                </span>
              </div>
            </a>
          </div>
        ) : null}

        {recordingPhase !== "idle" ? (
          <div
            className="grid gap-[10px] p-[14px] rounded-[10px] border"
            style={{
              borderColor: "rgba(191,51,61,0.12)",
              background: "rgba(191,51,61,0.04)",
            }}
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-[14px] border font-bold cursor-pointer transition-[opacity,background-color] duration-[180ms] disabled:cursor-not-allowed disabled:opacity-[0.62]"
                style={{
                  borderColor: "var(--border-soft)",
                  background: "var(--surface-primary)",
                  color: "var(--text-secondary)",
                }}
                onClick={onCancelRecording}
                disabled={recordingPhase === "finalizing"}
              >
                취소
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-[14px] border font-bold cursor-pointer transition-[opacity,background-color] duration-[180ms] disabled:cursor-not-allowed disabled:opacity-[0.62]"
                style={{
                  borderColor: "rgba(191,51,61,0.2)",
                  background: "rgba(191,51,61,0.08)",
                  color: "var(--danger-text)",
                }}
                onClick={
                  recordingPhase === "recording" ? onStopRecording : undefined
                }
                disabled={recordingPhase === "finalizing"}
              >
                <Mic size={16} strokeWidth={2.1} />
                {recordingPhase === "recording" ? "녹음 종료" : "녹음 정리 중"}
              </button>
            </div>
            <div className="grid gap-[2px]">
              <p className="m-0 text-sm font-semibold leading-[1.3]">
                {recordingPhase === "recording"
                  ? "현재 녹음 중"
                  : "녹음 정리 중"}
              </p>
              <p
                className="m-0 text-xs leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {recordingPhase === "recording"
                  ? `${formatCompactDuration(recordingElapsedMs)} 경과 · 중지 후 저장 준비`
                  : "저장 전 확인을 준비하고 있습니다"}
              </p>
            </div>
          </div>
        ) : null}

        {hasAudioReady && selectedAudioFile ? (
          <>
            <div
              className="grid gap-2 p-[14px] rounded-[10px] border"
              style={{
                borderColor: "var(--border-soft)",
                background: "var(--surface-soft)",
              }}
            >
              <p
                className="m-0 text-[11px] font-semibold"
                style={{ color: "var(--text-muted)" }}
              >
                선택한 오디오
              </p>
              <p className="m-0 text-[15px] font-bold leading-[1.35]">
                {selectedAudioFile.name}
              </p>
              <p
                className="m-0 text-xs leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {formatFileSize(selectedAudioFile.size)} ·{" "}
                {formatDurationLabel(selectedAudioDurationMs)} · 저장 준비
              </p>
              {selectedAudioPreviewUrl ? (
                <audio
                  className="w-full"
                  controls
                  src={selectedAudioPreviewUrl}
                />
              ) : null}
            </div>

            <label className="grid gap-[6px]">
              <span
                className="text-xs font-bold tracking-[0.02em]"
                style={{ color: "var(--text-secondary)" }}
              >
                수강생 이름
              </span>
              <input
                value={formState.studentName}
                onChange={(event) =>
                  updateFormState("studentName", event.target.value)
                }
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
                <span
                  className="text-[13px] font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  추가 정보
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  제목, 상담 유형
                </span>
              </button>

              {isAdditionalInfoOpen ? (
                <div
                  id="create-record-additional-fields"
                  className="grid gap-3 pt-3"
                >
                  <label className="grid gap-2">
                    <span
                      className="text-xs font-bold tracking-[0.02em]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      상담 제목
                    </span>
                    <input
                      value={formState.sessionTitle}
                      onChange={(event) =>
                        updateFormState("sessionTitle", event.target.value)
                      }
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
                      <span
                        className="text-xs font-bold tracking-[0.02em]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        상담 유형
                      </span>
                      <select
                        value={formState.counselingType}
                        onChange={(event) =>
                          updateFormState("counselingType", event.target.value)
                        }
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
        ) : null}

        {recordingError ? (
          <p
            className="m-0 py-[11px] px-3 rounded-[14px] text-[13px] leading-relaxed"
            style={{
              background: "rgba(191,51,61,0.08)",
              color: "var(--danger-text)",
            }}
          >
            {recordingError}
          </p>
        ) : null}

        {uploadState.message ? (
          <p
            className="m-0 py-[11px] px-3 rounded-[14px] text-[13px] leading-relaxed"
            style={
              uploadState.tone === "error"
                ? {
                    background: "rgba(191,51,61,0.08)",
                    color: "var(--danger-text)",
                  }
                : uploadState.tone === "success"
                  ? {
                      background: "rgba(17,132,91,0.08)",
                      color: "var(--success-text)",
                    }
                  : {
                      background: "rgba(99,102,241,0.1)",
                      color: "var(--accent)",
                    }
            }
          >
            {uploadState.message}
          </p>
        ) : null}

        {hasAudioReady ? (
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-[10px] border-none font-bold cursor-pointer transition-[transform,opacity,background-color] duration-[180ms] hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62] disabled:translate-y-0"
            style={{ background: "var(--accent)", color: "#ffffff" }}
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
