import { Loader2, Link2, Link2Off } from "lucide-react";
import styles from "../home.module.css";
import type { AnalysisResult, RecordItem, RecordPhase } from "../_lib/types";
import { fmtTime, fmtMs } from "../_lib/utils";

function AnalysisCards({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* 핵심 요약 */}
      <div className="bg-surface-2 border border-border rounded-lg p-4">
        <h3 className="text-[13px] font-semibold text-accent mb-2">핵심 요약</h3>
        <p className="text-[13px] leading-relaxed text-text-secondary m-0">{analysis.summary}</p>
      </div>

      {/* 수강생 정보 */}
      {analysis.member.name && (
        <div className="bg-surface-2 border border-border rounded-lg p-4">
          <h3 className="text-[13px] font-semibold text-accent mb-2">수강생 정보</h3>
          <div className="flex flex-col gap-1 text-[13px]">
            <div><span className="text-text-dim">이름:</span> <span className="text-text font-medium">{analysis.member.name}</span></div>
            {analysis.member.traits.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {analysis.member.traits.map((trait) => (
                  <span key={trait} className="px-2 py-0.5 bg-surface-3 rounded text-[11px] text-text-secondary">{trait}</span>
                ))}
              </div>
            )}
            <div className="mt-1"><span className="text-text-dim">감정/태도:</span> <span className="text-text-secondary">{analysis.member.emotion}</span></div>
          </div>
        </div>
      )}

      {/* 주요 이슈 */}
      {analysis.issues.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-lg p-4">
          <h3 className="text-[13px] font-semibold text-accent mb-2">주요 이슈</h3>
          <div className="flex flex-col gap-2">
            {analysis.issues.map((issue, i) => (
              <div key={i} className="flex gap-2 text-[13px]">
                <span className="text-accent font-semibold flex-shrink-0">{i + 1}.</span>
                <div>
                  <div className="font-medium text-text">{issue.title}</div>
                  <div className="text-text-secondary leading-relaxed mt-0.5">{issue.detail}</div>
                  {issue.timestamp && <span className="text-[11px] text-text-dim font-mono">{issue.timestamp}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 후속 조치 */}
      <div className="bg-surface-2 border border-border rounded-lg p-4">
        <h3 className="text-[13px] font-semibold text-accent mb-2">후속 조치</h3>
        <div className="flex flex-col gap-3 text-[13px]">
          {analysis.actions.mentor.length > 0 && (
            <div>
              <div className="text-text-dim font-medium mb-1">멘토 액션</div>
              <ul className="m-0 pl-4 flex flex-col gap-0.5">
                {analysis.actions.mentor.map((a, i) => <li key={i} className="text-text-secondary">{a}</li>)}
              </ul>
            </div>
          )}
          {analysis.actions.member.length > 0 && (
            <div>
              <div className="text-text-dim font-medium mb-1">수강생 과제</div>
              <ul className="m-0 pl-4 flex flex-col gap-0.5">
                {analysis.actions.member.map((a, i) => <li key={i} className="text-text-secondary">{a}</li>)}
              </ul>
            </div>
          )}
          {analysis.actions.nextSession.length > 0 && (
            <div>
              <div className="text-text-dim font-medium mb-1">다음 상담 방향</div>
              <ul className="m-0 pl-4 flex flex-col gap-0.5">
                {analysis.actions.nextSession.map((a, i) => <li key={i} className="text-text-secondary">{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 키워드 */}
      {analysis.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {analysis.keywords.map((kw) => (
            <span key={kw} className="px-2 py-0.5 bg-accent-dim border border-accent-border rounded text-[11px] text-accent font-medium">{kw}</span>
          ))}
        </div>
      )}
    </div>
  );
}

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
  analyzing: boolean;
  /* 오디오 */
  isPlaying: boolean;
  audioPosition: number;
  totalSeconds: number;
  onTogglePlay: () => void;
  onSeek: (pct: number) => void;
  onLinkMember: () => void;
}

export function CenterPanel({
  phase,
  selected,
  processingStep,
  transcriptLoading,
  analyzing,
  isPlaying,
  audioPosition,
  totalSeconds,
  onTogglePlay,
  onSeek,
  onLinkMember,
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
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h1 className="text-[15px] font-semibold tracking-[-0.3px] truncate">
              {selected.title}
            </h1>
            <div className="text-[11px] text-text-dim flex items-center gap-1.5 flex-wrap">
              <span>{selected.studentName || "수강생 미지정"}</span>
              <span>·</span>
              <span>{selected.type}</span>
              <span>·</span>
              <span>{selected.duration}</span>
              <span>·</span>
              <span>원문 완료</span>
            </div>
          </div>
          <button
            onClick={onLinkMember}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border flex-shrink-0 transition-all duration-150 ${
              selected.memberId
                ? "bg-accent-dim border-accent-border text-accent hover:bg-accent hover:text-bg"
                : "bg-surface-2 border-border text-text-secondary hover:border-accent hover:text-accent"
            }`}
          >
            {selected.memberId ? (
              <Link2 size={12} />
            ) : (
              <Link2Off size={12} />
            )}
            {selected.memberId ? "연결됨" : "수강생 연결"}
          </button>
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

        {/* AI 분석 결과 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {analyzing && !selected.analysisResult && (
            <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-accent-dim border border-accent-border rounded-lg text-accent text-[13px] font-medium">
              <Loader2 size={14} className="animate-spin" />
              AI 분석 중...
            </div>
          )}

          {selected.analysisResult && (
            <AnalysisCards analysis={selected.analysisResult} />
          )}

          {/* 전사 텍스트 */}
          <details className="mt-4" open={!selected.analysisResult}>
            <summary className="text-[13px] font-semibold text-text-secondary cursor-pointer select-none mb-3 hover:text-text transition-colors">
              전사 원문 {selected.transcript.length > 0 && `(${selected.transcript.length}개 세그먼트)`}
            </summary>
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
          </details>
        </div>
      </div>
    );
  }

  return null;
}
