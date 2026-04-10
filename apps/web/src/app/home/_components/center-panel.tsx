import { Loader2 } from "lucide-react";
import styles from "../home.module.css";
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
  transcriptLoading: boolean;
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
  transcriptLoading,
  isPlaying,
  audioPosition,
  totalSeconds,
  onTogglePlay,
  onSeek,
}: CenterPanelProps) {
  /* 기록 목록은 있지만 아직 선택하지 않은 상태 */
  if (!selected) {
    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${styles.centerFadeIn}`}>
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="flex flex-col items-center gap-4 text-center max-w-[360px]">
            <p className="text-base font-medium">
              좌측 목록에서 기록을 선택하세요
            </p>
            <p className="m-0 text-sm leading-relaxed text-text-secondary">
              기록을 클릭하면 전사 원문과 AI 분석 결과를 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* 에러 */
  if (selected.status === "error") {
    return (
      <div key={selected.id} className={`flex-1 flex flex-col overflow-hidden ${styles.centerFadeIn}`}>
        <div className="px-5 py-4 border-b border-border flex items-start justify-between">
          <h1 className="text-[15px] font-semibold tracking-[-0.3px]">{selected.title}</h1>
          <div className="text-[11px] text-text-secondary mt-[3px] flex items-center gap-2">{selected.duration} · 전사 실패</div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col items-center justify-center px-10 py-20 text-center">
            <p style={{ fontWeight: 500, fontSize: 16, color: "var(--error, #e53e3e)" }}>
              음성 분석에 실패했습니다
            </p>
            <p className="text-text-dim text-[13px] mt-2">
              {selected.errorMessage || "알 수 없는 오류가 발생했습니다."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* 처리 중 */
  if (phase === "processing" && selected.status === "processing") {
    return (
      <div key={selected.id} className={`flex-1 flex flex-col overflow-hidden ${styles.centerFadeIn}`}>
        <div className="px-5 py-4 border-b border-border flex items-start justify-between">
          <h1 className="text-[15px] font-semibold tracking-[-0.3px]">{selected.title}</h1>
          <div className="text-[11px] text-text-secondary mt-[3px]">{selected.duration} · AI 분석 중</div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col items-center justify-center px-10 py-20 text-center">
            <Loader2 size={36} className="animate-spin text-accent mb-4" />
            <p className="font-medium mt-4">음성을 분석하고 있습니다</p>
            <p className="text-text-dim text-[13px] mt-1">
              화자 분리 → 전사 → 화자 식별 → 상담 분석
            </p>
            <div className="mt-6 w-full max-w-[300px]">
              {PROCESSING_STEPS.map((step, i) => (
                <div
                  key={step.label}
                  className="flex items-center gap-2 py-[6px] text-[13px]"
                  style={{
                    color: i < processingStep ? "var(--accent)" : "var(--text-dim)",
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
      <div key={selected.id} className={`flex-1 flex flex-col overflow-hidden ${styles.centerFadeIn}`}>
        <div className="px-5 py-4 border-b border-border flex items-start justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold tracking-[-0.3px] border-b border-dashed border-text-dim cursor-pointer transition-[border-color] duration-150 hover:border-accent">
              {selected.title}
            </h1>
          </div>
          <div className="text-[11px] text-text-secondary mt-[3px] flex items-center gap-2">
            <span className="border-b border-dashed border-text-dim cursor-pointer transition-[border-color] duration-150 hover:border-accent">{selected.studentName}</span>
            {" · "}
            <span className="border-b border-dashed border-text-dim cursor-pointer transition-[border-color] duration-150 hover:border-accent">{selected.type}</span>
            {" · "}
            {selected.duration}
            {" · 원문 완료"}
          </div>
        </div>

        {/* 오디오 플레이어 */}
        <div className="flex items-center gap-[10px] bg-surface-2 border border-border rounded-lg px-[14px] py-2 mb-4 mx-5 mt-4">
          <button
            className="w-[30px] h-[30px] rounded-full bg-text text-bg flex items-center justify-center border-none cursor-pointer flex-shrink-0"
            onClick={onTogglePlay}
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="2" y="1" width="4" height="12" rx="1" />
                <rect x="8" y="1" width="4" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M3 1.5L12 7L3 12.5V1.5Z" />
              </svg>
            )}
          </button>
          <span className="font-mono text-[11px] text-text-secondary">{fmtTime(audioPosition)}</span>
          <div
            className="flex-1 h-[3px] bg-surface-4 rounded-[2px] relative cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              onSeek(pct);
            }}
          >
            <div
              className="absolute left-0 top-0 bottom-0 bg-accent rounded-[2px]"
              style={{ width: `${totalSeconds > 0 ? (audioPosition / totalSeconds) * 100 : 0}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-text-secondary">{fmtTime(totalSeconds)}</span>
        </div>

        {/* 전사 텍스트 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {transcriptLoading ? (
            <div className="text-text-dim text-[13px] py-6">
              전사 내용을 불러오는 중...
            </div>
          ) : selected.transcript.length === 0 ? (
            <div className="text-text-dim text-[13px] py-6">
              전사 내용이 없습니다.
            </div>
          ) : (
            selected.transcript.map((seg, i) => (
              <div key={seg.id ?? i} className="flex gap-[10px] py-2 border-b border-[rgba(255,255,255,0.03)] text-[13px]">
                <span className="font-mono text-[10px] text-text-dim min-w-[38px] pt-[3px]">
                  {fmtMs(seg.startMs)}
                </span>
                <span
                  className={`text-[10px] font-semibold min-w-[32px] pt-[3px] ${
                    seg.speakerTone === "teacher" ? "text-[#60a5fa]" : "text-green"
                  }`}
                >
                  {seg.speakerLabel}
                </span>
                <span className="flex-1 text-text">{seg.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
}
