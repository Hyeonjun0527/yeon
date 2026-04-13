import { ChevronDown, LoaderCircle, RefreshCcw, Trash2 } from "lucide-react";
import type {
  CounselingRecordDetail,
  CounselingRecordListItem,
} from "@yeon/api-contract/counseling-records";
import type { UploadTone } from "../types";
import {
  formatDateTimeLabel,
  formatDurationLabel,
  formatFileSize,
} from "../utils";
import styles from "../counseling-record-workspace.module.css";

interface StatusMetaEntry {
  label: string;
  className: string;
  detail: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

export interface RecordDetailHeaderProps {
  selectedRecord: CounselingRecordListItem;
  selectedRecordDetail: CounselingRecordDetail | null;
  statusMeta: Record<CounselingRecordListItem["status"], StatusMetaEntry>;
  isDeleteConfirmOpen: boolean;
  setIsDeleteConfirmOpen: (value: boolean) => void;
  isDeleting: boolean;
  handleDeleteRecord: () => void;
  isDetailMetaOpen: boolean;
  setIsDetailMetaOpen: React.Dispatch<React.SetStateAction<boolean>>;
  retryState: {
    isSubmitting: boolean;
    message: string | null;
    tone: UploadTone;
  };
  audioPlayerRef: React.RefObject<HTMLAudioElement | null>;
  audioLoadError: string | null;
  setAudioLoadError: (value: string | null) => void;
  handleAudioTimeUpdate: () => void;
  refreshRecordDetail: (recordId: string) => void;
  retryTranscription: (recordId: string) => void;
  retryAnalysis: (recordId: string) => void;
}

export function RecordDetailHeader({
  selectedRecord,
  selectedRecordDetail,
  statusMeta,
  isDeleteConfirmOpen,
  setIsDeleteConfirmOpen,
  isDeleting,
  handleDeleteRecord,
  isDetailMetaOpen,
  setIsDetailMetaOpen,
  retryState,
  audioPlayerRef,
  audioLoadError,
  setAudioLoadError,
  handleAudioTimeUpdate,
  refreshRecordDetail,
  retryTranscription,
  retryAnalysis,
}: RecordDetailHeaderProps) {
  const isAnalysisProcessing =
    selectedRecord.analysisStatus === "queued" ||
    selectedRecord.analysisStatus === "processing";
  const isAudioUploadRecord = selectedRecord.recordSource === "audio_upload";
  const isTextMemoRecord = selectedRecord.recordSource === "text_memo";
  const isPartialTranscriptReady =
    selectedRecord.status === "processing" &&
    selectedRecord.processingStage === "partial_transcript_ready";
  const analysisStatusLabel =
    selectedRecord.analysisStatus === "error"
      ? "AI 분석 실패"
      : selectedRecord.analysisStatus === "ready"
        ? "AI 분석 완료"
        : selectedRecord.analysisStatus === "idle"
          ? "AI 분석 대기"
          : "AI 분석 진행 중";

  return (
    <header
      className="grid gap-[10px] py-[14px] px-4 border rounded-xl"
      style={{
        borderColor: "var(--border-primary)",
        background: "var(--surface-primary)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div
        className={`flex items-start justify-between gap-3 ${styles.detailHeaderTop}`}
      >
        <div className="min-w-0 grid gap-1">
          <h2
            className="m-0 font-bold tracking-[-0.04em] leading-[1.1]"
            style={{ fontSize: "clamp(22px, 2.5vw, 28px)" }}
          >
            {selectedRecord.studentName}
          </h2>
          <p
            className="m-0 text-sm leading-relaxed overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ color: "var(--text-secondary)" }}
          >
            {selectedRecord.sessionTitle}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`inline-flex items-center gap-1 py-[3px] px-2 rounded-full text-[11px] font-semibold leading-none whitespace-nowrap ${statusMeta[selectedRecord.status].className}`}
          >
            {(() => {
              const StatusIcon = statusMeta[selectedRecord.status].icon;
              return <StatusIcon size={12} strokeWidth={2.2} />;
            })()}
            {statusMeta[selectedRecord.status].label}
          </span>
          {selectedRecord.status === "ready" ? (
            <span
              className="inline-flex items-center gap-1 py-[3px] px-2 rounded-full text-[11px] font-semibold leading-none whitespace-nowrap"
              style={{
                background:
                  selectedRecord.analysisStatus === "error"
                    ? "rgba(191,51,61,0.08)"
                    : selectedRecord.analysisStatus === "ready"
                      ? "rgba(17,132,91,0.08)"
                      : selectedRecord.analysisStatus === "idle"
                        ? "var(--surface-secondary)"
                        : "rgba(99,102,241,0.1)",
                color:
                  selectedRecord.analysisStatus === "error"
                    ? "var(--danger-text)"
                    : selectedRecord.analysisStatus === "ready"
                      ? "var(--success-text)"
                      : selectedRecord.analysisStatus === "idle"
                        ? "var(--text-secondary)"
                        : "var(--accent)",
              }}
            >
              {analysisStatusLabel}
            </span>
          ) : null}
          <button
            type="button"
            className="inline-flex items-center justify-center w-8 h-8 border border-transparent rounded-lg bg-transparent cursor-pointer transition-[color,background-color,border-color] duration-[120ms] hover:border-[var(--danger-text)]"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setIsDeleteConfirmOpen(true)}
            title="기록 삭제"
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      {isDeleteConfirmOpen ? (
        <div
          className="flex items-center justify-between gap-3 py-[10px] px-[14px] rounded-lg border"
          style={{
            background: "var(--danger-soft)",
            borderColor: "rgba(248,113,113,0.2)",
          }}
        >
          <p
            className="m-0 text-[13px]"
            style={{ color: "var(--danger-text)" }}
          >
            이 기록을 삭제하시겠습니까? 음성 파일도 함께 삭제됩니다.
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              className="inline-flex items-center gap-[6px] min-h-9 px-3 border rounded-[10px] bg-transparent text-[13px] font-semibold cursor-pointer transition-[background-color,border-color] duration-[180ms]"
              style={{
                borderColor: "var(--border-soft)",
                color: "var(--text-secondary)",
              }}
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              취소
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-[6px] min-h-8 px-[14px] border-none rounded-lg text-[13px] font-semibold cursor-pointer transition-opacity duration-[120ms] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "var(--danger-text)", color: "#ffffff" }}
              onClick={handleDeleteRecord}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <LoaderCircle
                    size={14}
                    strokeWidth={2.1}
                    className={styles.spinningIcon}
                  />
                  삭제 중
                </>
              ) : (
                "삭제"
              )}
            </button>
          </div>
        </div>
      ) : null}

      {/* 핵심 3개 메타만 인라인 */}
      <div className="flex flex-wrap items-center gap-[6px]">
        <span
          className="inline-flex items-center min-h-[26px] py-[6px] px-[10px] rounded-full text-xs leading-none"
          style={{
            background: "var(--surface-secondary)",
            color: "var(--text-secondary)",
          }}
        >
          {formatDateTimeLabel(selectedRecord.createdAt)}
        </span>
        <span
          className="inline-flex items-center min-h-[26px] py-[6px] px-[10px] rounded-full text-xs leading-none"
          style={{
            background: "var(--surface-secondary)",
            color: "var(--text-secondary)",
          }}
        >
          {formatDurationLabel(selectedRecord.audioDurationMs)}
        </span>
        <span
          className="inline-flex items-center min-h-[26px] py-[6px] px-[10px] rounded-full text-xs leading-none"
          style={{
            background: "var(--surface-secondary)",
            color: "var(--text-secondary)",
          }}
        >
          {selectedRecord.counselingType}
        </span>

        <button
          type="button"
          className="inline-flex items-center gap-1 min-h-[26px] px-2 border rounded-full bg-transparent text-[11px] font-semibold cursor-pointer transition-[border-color,background-color] duration-[180ms] hover:bg-[var(--surface-soft)] hover:border-[var(--border-primary)]"
          style={{
            borderColor: "var(--border-soft)",
            color: "var(--text-muted)",
          }}
          onClick={() => setIsDetailMetaOpen((prev) => !prev)}
          aria-expanded={isDetailMetaOpen}
          aria-controls="detail-extra-meta"
        >
          상세
          <ChevronDown
            size={12}
            strokeWidth={2.4}
            className="transition-transform duration-[180ms]"
            style={{
              transform: isDetailMetaOpen ? "rotate(180deg)" : undefined,
            }}
          />
        </button>
      </div>

      {isDetailMetaOpen ? (
        <div
          id="detail-extra-meta"
          className="flex flex-wrap items-center gap-[6px]"
        >
          <span
            className="inline-flex items-center min-h-[26px] py-[6px] px-[10px] rounded-full text-xs leading-none"
            style={{
              background: "var(--surface-secondary)",
              color: "var(--text-secondary)",
            }}
          >
            세그먼트 {selectedRecord.transcriptSegmentCount}개
          </span>
          <span
            className="inline-flex items-center min-h-[26px] py-[6px] px-[10px] rounded-full text-xs leading-none"
            style={{
              background: "var(--surface-secondary)",
              color: "var(--text-secondary)",
            }}
          >
            원문 {selectedRecord.transcriptTextLength.toLocaleString("ko-KR")}자
          </span>
          {selectedRecord.sttModel ? (
            <span
              className="inline-flex items-center min-h-[26px] py-[6px] px-[10px] rounded-full text-xs leading-none"
              style={{
                background: "var(--surface-secondary)",
                color: "var(--text-secondary)",
              }}
            >
              {selectedRecord.sttModel}
            </span>
          ) : null}
          <span
            className="inline-flex items-center min-h-[26px] py-[6px] px-[10px] rounded-full text-xs leading-none"
            style={{
              background: "var(--surface-secondary)",
              color: "var(--text-secondary)",
            }}
          >
            진행률{" "}
            {selectedRecord.status === "processing"
              ? `${selectedRecord.processingProgress}%`
              : `${selectedRecord.analysisProgress}%`}
          </span>
          {selectedRecord.processingChunkCount > 0 ? (
            <span
              className="inline-flex items-center min-h-[26px] py-[6px] px-[10px] rounded-full text-xs leading-none"
              style={{
                background: "var(--surface-secondary)",
                color: "var(--text-secondary)",
              }}
            >
              구간 {selectedRecord.processingChunkCompletedCount}/
              {selectedRecord.processingChunkCount}
            </span>
          ) : null}
        </div>
      ) : null}

      {selectedRecord.processingMessage ? (
        <p
          className="m-0 py-[11px] px-3 rounded-[14px] text-[13px] leading-relaxed"
          style={{
            background: "rgba(99,102,241,0.08)",
            color: "var(--text-secondary)",
          }}
        >
          {selectedRecord.processingMessage}
        </p>
      ) : null}

      {selectedRecord.analysisErrorMessage ? (
        <p
          className="m-0 py-[11px] px-3 rounded-[14px] text-[13px] leading-relaxed"
          style={{
            background: "rgba(191,51,61,0.08)",
            color: "var(--danger-text)",
          }}
        >
          {selectedRecord.analysisErrorMessage}
        </p>
      ) : null}

      {/* 오디오 패널 슬림 */}
      <section
        className="grid gap-2 p-3 rounded-[10px] border"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "var(--surface-secondary)",
        }}
      >
        <p
          className="m-0 text-xs leading-[1.4] overflow-hidden text-ellipsis whitespace-nowrap"
          style={{ color: "var(--text-muted)" }}
        >
          {isTextMemoRecord
            ? "텍스트 메모 · 원본 음성 없음"
            : `${selectedRecord.audioOriginalName} · ${formatFileSize(
                selectedRecord.audioByteSize,
              )}`}
        </p>

        {selectedRecordDetail?.audioUrl ? (
          <audio
            ref={audioPlayerRef}
            className={styles.audioPlayer}
            controls
            preload="metadata"
            src={selectedRecordDetail.audioUrl}
            onTimeUpdate={handleAudioTimeUpdate}
            onLoadedMetadata={handleAudioTimeUpdate}
            onError={() =>
              setAudioLoadError(
                "원본 음성을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
              )
            }
          />
        ) : (
          <p
            className="m-0 text-[13px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {isAudioUploadRecord
              ? "원본 음성을 불러오는 중입니다."
              : "텍스트 메모에는 재생할 원본 음성이 없습니다."}
          </p>
        )}

        {audioLoadError ? (
          <p
            className="m-0 py-[11px] px-3 rounded-[14px] text-[13px] leading-relaxed"
            style={{
              background: "rgba(191,51,61,0.08)",
              color: "var(--danger-text)",
            }}
          >
            {audioLoadError}
          </p>
        ) : null}
      </section>

      {retryState.message ? (
        <p
          className="m-0 py-[11px] px-3 rounded-[14px] text-[13px] leading-relaxed"
          style={
            retryState.tone === "error"
              ? {
                  background: "rgba(191,51,61,0.08)",
                  color: "var(--danger-text)",
                }
              : retryState.tone === "success"
                ? {
                    background: "rgba(17,132,91,0.08)",
                    color: "var(--success-text)",
                  }
                : { background: "rgba(99,102,241,0.1)", color: "var(--accent)" }
          }
        >
          {retryState.message}
        </p>
      ) : null}

      {/* 상태에 맞는 액션만 노출 */}
      {selectedRecord.status === "processing" ||
      selectedRecord.status === "error" ||
      isAnalysisProcessing ||
      selectedRecord.analysisStatus === "error" ? (
        <div
          className={`flex items-start justify-between gap-3 flex-wrap ${styles.panelActionRow}`}
        >
          {selectedRecord.status === "processing" ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 min-h-11 px-4 border rounded-[10px] font-bold cursor-pointer transition-[transform,opacity,border-color,background-color] duration-[180ms] hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]"
              style={{
                borderColor: "var(--border-primary)",
                background: "var(--surface-secondary)",
                color: "var(--text-primary)",
              }}
              onClick={() => refreshRecordDetail(selectedRecord.id)}
              disabled={retryState.isSubmitting}
            >
              {retryState.isSubmitting ? (
                <LoaderCircle
                  size={16}
                  strokeWidth={2.1}
                  className={styles.spinningIcon}
                />
              ) : (
                <RefreshCcw size={16} strokeWidth={2.1} />
              )}
              최신 상태 확인
            </button>
          ) : null}

          {isPartialTranscriptReady && isAudioUploadRecord ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 min-h-11 px-4 border-none rounded-[10px] font-bold cursor-pointer transition-[transform,opacity,background-color] duration-[180ms] hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]"
              style={{ background: "var(--accent)", color: "#ffffff" }}
              onClick={() => retryTranscription(selectedRecord.id)}
              disabled={retryState.isSubmitting}
            >
              {retryState.isSubmitting ? (
                <>
                  <LoaderCircle
                    size={16}
                    strokeWidth={2.1}
                    className={styles.spinningIcon}
                  />
                  누락 구간 재시도 중
                </>
              ) : (
                <>
                  <RefreshCcw size={16} strokeWidth={2.1} />
                  누락 구간 다시 시도
                </>
              )}
            </button>
          ) : null}

          {isAnalysisProcessing ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 min-h-11 px-4 border rounded-[10px] font-bold cursor-pointer transition-[transform,opacity,border-color,background-color] duration-[180ms] hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]"
              style={{
                borderColor: "var(--border-primary)",
                background: "var(--surface-secondary)",
                color: "var(--text-primary)",
              }}
              onClick={() => refreshRecordDetail(selectedRecord.id)}
              disabled={retryState.isSubmitting}
            >
              <RefreshCcw size={16} strokeWidth={2.1} />
              AI 분석 상태 확인
            </button>
          ) : null}

          {selectedRecord.status === "error" && isAudioUploadRecord ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 min-h-11 px-4 border-none rounded-[10px] font-bold cursor-pointer transition-[transform,opacity,background-color] duration-[180ms] hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]"
              style={{ background: "var(--accent)", color: "#ffffff" }}
              onClick={() => retryTranscription(selectedRecord.id)}
              disabled={retryState.isSubmitting}
            >
              {retryState.isSubmitting ? (
                <>
                  <LoaderCircle
                    size={16}
                    strokeWidth={2.1}
                    className={styles.spinningIcon}
                  />
                  재전사 요청 중
                </>
              ) : (
                <>
                  <RefreshCcw size={16} strokeWidth={2.1} />
                  전사 다시 시도
                </>
              )}
            </button>
          ) : null}

          {selectedRecord.analysisStatus === "error" ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 min-h-11 px-4 border-none rounded-[10px] font-bold cursor-pointer transition-[transform,opacity,background-color] duration-[180ms] hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]"
              style={{ background: "var(--accent)", color: "#ffffff" }}
              onClick={() => retryAnalysis(selectedRecord.id)}
              disabled={retryState.isSubmitting}
            >
              {retryState.isSubmitting ? (
                <>
                  <LoaderCircle
                    size={16}
                    strokeWidth={2.1}
                    className={styles.spinningIcon}
                  />
                  분석 재시작 중
                </>
              ) : (
                <>
                  <RefreshCcw size={16} strokeWidth={2.1} />
                  AI 분석 다시 시도
                </>
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
