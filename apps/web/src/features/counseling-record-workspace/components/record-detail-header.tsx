import {
  ChevronDown,
  LoaderCircle,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import type {
  CounselingRecordDetail,
  CounselingRecordListItem,
} from "@yeon/api-contract";
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
}: RecordDetailHeaderProps) {
  return (
    <header className={styles.detailHeader}>
      <div className={styles.detailHeaderTop}>
        <div className={styles.detailHeaderCopy}>
          <h2 className={styles.detailTitle}>
            {selectedRecord.studentName}
          </h2>
          <p className={styles.detailSessionTitle}>
            {selectedRecord.sessionTitle}
          </p>
        </div>
        <div className={styles.detailHeaderActions}>
          <span
            className={`${styles.statusBadge} ${
              statusMeta[selectedRecord.status].className
            }`}
          >
            {(() => {
              const StatusIcon =
                statusMeta[selectedRecord.status].icon;
              return <StatusIcon size={12} strokeWidth={2.2} />;
            })()}
            {statusMeta[selectedRecord.status].label}
          </span>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={() => setIsDeleteConfirmOpen(true)}
            title="기록 삭제"
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      {isDeleteConfirmOpen ? (
        <div className={styles.deleteConfirm}>
          <p className={styles.deleteConfirmText}>
            이 기록을 삭제하시겠습니까? 음성 파일도 함께 삭제됩니다.
          </p>
          <div className={styles.deleteConfirmActions}>
            <button
              type="button"
              className={styles.topbarGhostButton}
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              취소
            </button>
            <button
              type="button"
              className={styles.deleteConfirmButton}
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

      {/* 17차: 핵심 3개 메타만 인라인 */}
      <div className={styles.metaChips}>
        <span className={styles.metaChip}>
          {formatDateTimeLabel(selectedRecord.createdAt)}
        </span>
        <span className={styles.metaChip}>
          {formatDurationLabel(selectedRecord.audioDurationMs)}
        </span>
        <span className={styles.metaChip}>
          {selectedRecord.counselingType}
        </span>

        {/* 17차: 나머지는 접힌 상세 정보 토글 */}
        <button
          type="button"
          className={styles.metaExpandButton}
          onClick={() => setIsDetailMetaOpen((prev) => !prev)}
          aria-expanded={isDetailMetaOpen}
          aria-controls="detail-extra-meta"
        >
          상세
          <ChevronDown
            size={12}
            strokeWidth={2.4}
            className={`${styles.filterToggleChevron} ${isDetailMetaOpen ? styles.filterToggleChevronOpen : ""}`}
          />
        </button>
      </div>

      {isDetailMetaOpen ? (
        <div
          id="detail-extra-meta"
          className={styles.metaChips}
        >
          <span className={styles.metaChip}>
            세그먼트 {selectedRecord.transcriptSegmentCount}개
          </span>
          <span className={styles.metaChip}>
            원문{" "}
            {selectedRecord.transcriptTextLength.toLocaleString(
              "ko-KR",
            )}
            자
          </span>
          {selectedRecord.sttModel ? (
            <span className={styles.metaChip}>
              {selectedRecord.sttModel}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* 18차: 오디오 플레이어 슬림 — 1줄 메타 + 플레이어만 */}
      <section className={styles.audioPanel}>
        <p className={styles.audioMeta}>
          {selectedRecord.audioOriginalName}
          <span className={styles.audioMetaSeparator}>·</span>
          {formatFileSize(selectedRecord.audioByteSize)}
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
          <p className={styles.audioPanelHint}>
            원본 음성을 불러오는 중입니다.
          </p>
        )}

        {audioLoadError ? (
          <p
            className={`${styles.inlineMessage} ${styles.inlineError}`}
          >
            {audioLoadError}
          </p>
        ) : null}
      </section>

      {retryState.message ? (
        <p
          className={`${styles.inlineMessage} ${
            retryState.tone === "error"
              ? styles.inlineError
              : retryState.tone === "success"
                ? styles.inlineSuccess
                : styles.inlineNeutral
          }`}
        >
          {retryState.message}
        </p>
      ) : null}

      {/* 19차: 상태에 맞는 액션만 노출 */}
      {selectedRecord.status === "processing" ||
      selectedRecord.status === "error" ? (
        <div className={styles.panelActionRow}>
          {selectedRecord.status === "processing" ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() =>
                refreshRecordDetail(selectedRecord.id)
              }
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

          {selectedRecord.status === "error" ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() =>
                retryTranscription(selectedRecord.id)
              }
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
        </div>
      ) : null}
    </header>
  );
}
