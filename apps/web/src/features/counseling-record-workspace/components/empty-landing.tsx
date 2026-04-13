import { Download, Mic, Upload } from "lucide-react";
import type { RecordingPhase } from "../types";
import {
  formatCompactDuration,
  formatFileSize,
  formatDurationLabel,
} from "../utils";
import { AUDIO_SAMPLE_TEST_DATA } from "@/lib/test-data-downloads";

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
  onCancelRecording: () => void;
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
  onCancelRecording,
  onGoToUploadPanel,
}: EmptyLandingProps) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioFileChange}
      />

      <div className="flex flex-col items-center gap-4 text-center max-w-[360px]">
        <div
          className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-[20px] mb-1"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <Mic size={32} strokeWidth={1.5} />
        </div>
        <h2
          className="m-0 text-[22px] font-bold tracking-[-0.02em]"
          style={{ color: "var(--text-primary)" }}
        >
          첫 상담 기록을 만들어 보세요
        </h2>
        <p
          className="m-0 text-sm leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          음성 파일을 업로드하거나 브라우저에서 바로 녹음할 수 있습니다.
        </p>

        {recordingPhase === "idle" && !hasAudioReady ? (
          <div className="mt-2 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-[14px] px-7 border border-transparent rounded-xl text-[15px] font-bold cursor-pointer transition-[opacity,box-shadow,background,border-color] duration-150 hover:opacity-90"
                style={{ background: "var(--accent)", color: "white" }}
                onClick={onFileInputClick}
              >
                <Upload size={16} strokeWidth={2.2} />
                파일 업로드
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-[14px] px-7 rounded-xl text-[15px] font-bold cursor-pointer transition-[opacity,box-shadow,background,border-color] duration-150"
                style={{
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text-primary)",
                }}
                onClick={onStartRecording}
              >
                <Mic size={16} strokeWidth={2.2} />
                바로 녹음하기
              </button>
            </div>
            <a
              href={AUDIO_SAMPLE_TEST_DATA.href}
              download={AUDIO_SAMPLE_TEST_DATA.downloadName}
              className="inline-flex items-center justify-center gap-2 py-[13px] px-7 rounded-xl border text-[14px] font-semibold transition-[background-color,border-color,color] duration-150"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-secondary)",
              }}
            >
              <Download size={15} strokeWidth={2.1} />
              {AUDIO_SAMPLE_TEST_DATA.label}
            </a>
          </div>
        ) : null}

        {recordingPhase !== "idle" ? (
          <div
            className="grid gap-[10px] p-[14px] rounded-[10px] border w-full"
            style={{
              borderColor: "rgba(191,51,61,0.12)",
              background: "rgba(191,51,61,0.04)",
            }}
          >
            <div className="flex flex-wrap justify-center gap-2">
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
          <div
            className="grid gap-2 p-[14px] rounded-[10px] border max-w-[380px] w-full"
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
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-[14px] px-7 border border-transparent rounded-xl text-[15px] font-bold cursor-pointer transition-[opacity,box-shadow,background,border-color] duration-150 hover:opacity-90"
                style={{ background: "var(--accent)", color: "white" }}
                onClick={onGoToUploadPanel}
              >
                저장하러 가기
              </button>
            </div>
          </div>
        ) : null}

        {recordingError ? (
          <p
            className="m-0 py-[11px] px-3 rounded-[14px] text-[13px] leading-relaxed w-full"
            style={{
              background: "rgba(191,51,61,0.08)",
              color: "var(--danger-text)",
            }}
          >
            {recordingError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
