import { Check, ClipboardCopy, Search, X } from "lucide-react";
import type {
  CounselingRecordDetail,
  CounselingRecordListItem,
} from "@yeon/api-contract/counseling-records";
import {
  formatTranscriptTime,
  getNextSpeaker,
  getSpeakerToneClass,
  isTranscriptSegmentActive,
  isTranscriptSegmentMatched,
  renderHighlightedText,
} from "../utils";
import styles from "../counseling-record-workspace.module.css";

export interface TranscriptViewerProps {
  selectedRecord: CounselingRecordListItem;
  selectedRecordDetail: CounselingRecordDetail | null;
  isLoadingDetail: boolean;
  transcriptQuery: string;
  setTranscriptQuery: (value: string) => void;
  normalizedTranscriptQuery: string;
  transcriptMatchCount: number;
  isAutoScrollEnabled: boolean;
  setIsAutoScrollEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  handleExportClipboard: () => void;
  editingSegmentId: string | null;
  editingSegmentText: string;
  setEditingSegmentText: (value: string) => void;
  editingSegmentSaving: boolean;
  startEditingSegment: (segmentId: string, currentText: string) => void;
  cancelEditingSegment: () => void;
  saveEditingSegment: () => void;
  handleSpeakerLabelChange: (
    segmentId: string,
    newLabel: string,
    newTone: string,
  ) => void;
  currentAudioTimeMs: number | null;
  activeSegmentRef: React.RefObject<HTMLElement | null>;
  seekAudioToTime: (startMs: number | null) => void;
}

export function TranscriptViewer({
  selectedRecord,
  selectedRecordDetail,
  isLoadingDetail,
  transcriptQuery,
  setTranscriptQuery,
  normalizedTranscriptQuery,
  transcriptMatchCount,
  isAutoScrollEnabled,
  setIsAutoScrollEnabled,
  handleExportClipboard,
  editingSegmentId,
  editingSegmentText,
  setEditingSegmentText,
  editingSegmentSaving,
  startEditingSegment,
  cancelEditingSegment,
  saveEditingSegment,
  handleSpeakerLabelChange,
  currentAudioTimeMs,
  activeSegmentRef,
  seekAudioToTime,
}: TranscriptViewerProps) {
  return (
    <section className={styles.viewerPanel}>
      <div className={styles.viewerToolbar}>
        <div className={styles.viewerTools}>
          <span className={styles.viewerMeta}>
            {`구간 ${selectedRecordDetail ? selectedRecordDetail.transcriptSegments.length : selectedRecord.transcriptSegmentCount}개${normalizedTranscriptQuery ? ` · 일치 ${transcriptMatchCount}개` : ""}`}
          </span>

          <label className={styles.transcriptSearchField}>
            <Search
              size={15}
              strokeWidth={2.1}
              className={styles.transcriptSearchIcon}
            />
            <input
              value={transcriptQuery}
              onChange={(event) =>
                setTranscriptQuery(event.target.value)
              }
              className={styles.transcriptSearchInput}
              placeholder="원문 검색"
              aria-label="원문 내 단어 검색"
            />
          </label>
          <button
            type="button"
            className={`${styles.autoScrollToggle} ${isAutoScrollEnabled ? styles.autoScrollToggleActive : ""}`}
            onClick={() =>
              setIsAutoScrollEnabled((prev) => !prev)
            }
            aria-pressed={isAutoScrollEnabled}
            title="재생 시 자동 스크롤"
          >
            따라가기
          </button>
          <button
            type="button"
            className={styles.autoScrollToggle}
            onClick={handleExportClipboard}
            title="원문 클립보드 복사"
          >
            <ClipboardCopy size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className={styles.transcriptViewport}>
          {isLoadingDetail && !selectedRecordDetail ? (
            <div className={styles.skeletonTranscript}>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className={styles.skeletonSegment}>
                  <div className={styles.skeletonLine} style={{ width: "50px" }} />
                  <div className={styles.skeletonLine} style={{ width: "60px" }} />
                  <div className={styles.skeletonLine} style={{ width: `${60 + (i % 3) * 15}%` }} />
                </div>
              ))}
            </div>
          ) : selectedRecordDetail &&
            selectedRecordDetail.transcriptSegments.length > 0 ? (
            selectedRecordDetail.transcriptSegments.map(
              (segment, index, segments) => {
                const isMatched = isTranscriptSegmentMatched(
                  segment,
                  normalizedTranscriptQuery,
                );
                const isActive = isTranscriptSegmentActive({
                  currentTimeMs: currentAudioTimeMs,
                  startMs: segment.startMs,
                  endMs: segment.endMs,
                  nextStartMs: segments[index + 1]?.startMs ?? null,
                });
                const isSeekable =
                  Boolean(selectedRecordDetail.audioUrl) &&
                  segment.startMs !== null;
                const segmentClassName = `${styles.segmentRow} ${
                  isMatched ? styles.segmentMatched : ""
                } ${isActive ? styles.segmentActive : ""} ${
                  isSeekable
                    ? styles.segmentSeekable
                    : styles.segmentStatic
                }`;
                const isEditing = editingSegmentId === segment.id;
                const segmentContent = isEditing ? (
                  <>
                    <div className={styles.segmentTime}>
                      {formatTranscriptTime(segment.startMs)}
                    </div>
                    <div className={`${styles.segmentSpeaker} ${getSpeakerToneClass(segment.speakerTone, styles)}`}>
                      {segment.speakerLabel}
                    </div>
                    <div className={styles.segmentEditArea}>
                      <textarea
                        className={styles.segmentEditInput}
                        value={editingSegmentText}
                        onChange={(e) => setEditingSegmentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEditingSegment(); }
                          if (e.key === "Escape") { cancelEditingSegment(); }
                        }}
                        rows={2}
                        autoFocus
                        disabled={editingSegmentSaving}
                      />
                      <div className={styles.segmentEditActions}>
                        <button type="button" className={styles.segmentEditSave} onClick={(e) => { e.stopPropagation(); saveEditingSegment(); }} disabled={editingSegmentSaving} aria-label="저장">
                          <Check size={14} strokeWidth={2.5} />
                        </button>
                        <button type="button" className={styles.segmentEditCancel} onClick={(e) => { e.stopPropagation(); cancelEditingSegment(); }} disabled={editingSegmentSaving} aria-label="취소">
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.segmentTime}>
                      {formatTranscriptTime(segment.startMs)}
                    </div>
                    <div
                      className={`${styles.segmentSpeaker} ${styles.segmentSpeakerClickable} ${getSpeakerToneClass(segment.speakerTone, styles)}`}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); const next = getNextSpeaker(segment.speakerTone); handleSpeakerLabelChange(segment.id, next.label, next.tone); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); const next = getNextSpeaker(segment.speakerTone); handleSpeakerLabelChange(segment.id, next.label, next.tone); } }}
                      title="클릭하여 화자 변경"
                    >
                      {segment.speakerLabel}
                    </div>
                    <p className={styles.segmentText} onDoubleClick={(e) => { e.stopPropagation(); startEditingSegment(segment.id, segment.text); }}>
                      {renderHighlightedText(segment.text, normalizedTranscriptQuery, styles)}
                    </p>
                  </>
                );

                if (isSeekable && !isEditing) {
                  return (
                    <button
                      key={segment.id}
                      ref={isActive ? activeSegmentRef as React.RefObject<HTMLButtonElement> : undefined}
                      type="button"
                      className={segmentClassName}
                      onClick={() =>
                        seekAudioToTime(segment.startMs)
                      }
                    >
                      {segmentContent}
                    </button>
                  );
                }

                return (
                  <article
                    key={segment.id}
                    ref={isActive ? activeSegmentRef as React.RefObject<HTMLElement> : undefined}
                    className={segmentClassName}
                  >
                    {segmentContent}
                  </article>
                );
              },
            )
          ) : selectedRecord.status === "processing" ? (
            <div className={styles.viewerEmptyState}>
              <p className={styles.emptyPanelTitle}>
                한국어 전사를 처리하고 있습니다.
              </p>
              <p className={styles.emptyPanelDescription}>
                길이가 긴 상담은 서버에서 분할 전사한 뒤 자동으로
                갱신합니다.
              </p>
            </div>
          ) : selectedRecord.status === "error" ? (
            <div className={styles.viewerEmptyState}>
              <p className={styles.emptyPanelTitle}>
                원문 저장에 실패했습니다.
              </p>
              <p className={styles.emptyPanelDescription}>
                {selectedRecord.errorMessage ??
                  "원본 음성은 남아 있으므로 전사를 다시 시도할 수 있습니다."}
              </p>
              <ul className={styles.errorGuideList}>
                <li>파일이 손상된 경우 → 다른 파일로 교체 후 재시도</li>
                <li>서버 시간초과 → 잠시 후 전사 다시 시도</li>
                <li>형식 미지원 → mp3, wav, m4a 등 일반 형식 사용</li>
              </ul>
            </div>
          ) : (
            <div className={styles.viewerEmptyState}>
              <p className={styles.emptyPanelTitle}>
                표시할 원문 세그먼트가 없습니다.
              </p>
            </div>
          )}
        </div>
    </section>
  );
}
