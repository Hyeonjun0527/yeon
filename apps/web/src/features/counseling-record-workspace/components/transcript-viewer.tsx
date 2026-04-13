import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Check, ClipboardCopy, Search, X } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type {
  CounselingRecordDetail,
  CounselingRecordListItem,
} from "@yeon/api-contract/counseling-records";
import {
  formatTranscriptTime,
  getNextSpeaker,
  getSpeakerToneClass,
  isTranscriptSegmentActive,
  renderHighlightedText,
} from "../utils";
import styles from "../counseling-record-workspace.module.css";
import {
  buildTranscriptDisplayBlocks,
  isTranscriptDisplayBlockMatched,
} from "@/lib/counseling-transcript-display";

const EMPTY_TRANSCRIPT_DISPLAY_BLOCKS: ReturnType<
  typeof buildTranscriptDisplayBlocks
> = [];
const DISPLAY_BLOCK_ROW_GAP = 10;
const DISPLAY_BLOCK_BASE_HEIGHT = 84;
const DISPLAY_BLOCK_CHUNK_HEIGHT = 42;
const DISPLAY_BLOCK_RAW_SEGMENT_HEIGHT = 92;
const DISPLAY_BLOCK_EDITING_BONUS_HEIGHT = 56;

export interface TranscriptViewerProps {
  selectedRecord: CounselingRecordListItem;
  selectedRecordDetail: CounselingRecordDetail | null;
  isLoadingDetail: boolean;
  transcriptQuery: string;
  setTranscriptQuery: (value: string) => void;
  normalizedTranscriptQuery: string;
  transcriptMatchCount: number;
  isAutoScrollEnabled: boolean;
  setIsAutoScrollEnabled: Dispatch<SetStateAction<boolean>>;
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
  seekAudioToTime: (startMs: number | null) => void;
}

function isDisplayBlockActive(
  block: (typeof EMPTY_TRANSCRIPT_DISPLAY_BLOCKS)[number],
  currentAudioTimeMs: number | null,
) {
  return block.segments.some((segment, index, segments) =>
    isTranscriptSegmentActive({
      currentTimeMs: currentAudioTimeMs,
      startMs: segment.startMs,
      endMs: segment.endMs,
      nextStartMs: segments[index + 1]?.startMs ?? null,
    }),
  );
}

function estimateDisplayBlockSize(
  block: (typeof EMPTY_TRANSCRIPT_DISPLAY_BLOCKS)[number] | undefined,
  isExpanded: boolean,
  editingSegmentId: string | null,
) {
  if (!block) {
    return DISPLAY_BLOCK_BASE_HEIGHT;
  }

  const isEditingInsideBlock = block.segments.some(
    (segment) => segment.id === editingSegmentId,
  );

  return (
    DISPLAY_BLOCK_BASE_HEIGHT +
    block.chunks.length * DISPLAY_BLOCK_CHUNK_HEIGHT +
    (isExpanded ? block.segmentCount * DISPLAY_BLOCK_RAW_SEGMENT_HEIGHT : 0) +
    (isExpanded && isEditingInsideBlock
      ? DISPLAY_BLOCK_EDITING_BONUS_HEIGHT
      : 0)
  );
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
  seekAudioToTime,
}: TranscriptViewerProps) {
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setExpandedBlockId(null);
  }, [selectedRecordDetail?.id]);

  const transcriptDisplayBlocks = useMemo(
    () =>
      selectedRecordDetail
        ? buildTranscriptDisplayBlocks(selectedRecordDetail.transcriptSegments)
        : EMPTY_TRANSCRIPT_DISPLAY_BLOCKS,
    [selectedRecordDetail],
  );
  const transcriptSegmentCount =
    selectedRecordDetail?.transcriptSegments.length ??
    selectedRecord.transcriptSegmentCount;
  const transcriptSummaryText =
    transcriptDisplayBlocks.length > 0
      ? `화자 턴 ${transcriptDisplayBlocks.length}개 · 구간 ${transcriptSegmentCount}개`
      : `구간 ${transcriptSegmentCount}개`;
  const activeBlockIndex = useMemo(
    () =>
      transcriptDisplayBlocks.findIndex((block) =>
        isDisplayBlockActive(block, currentAudioTimeMs),
      ),
    [currentAudioTimeMs, transcriptDisplayBlocks],
  );
  const rowVirtualizer = useVirtualizer({
    count: transcriptDisplayBlocks.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: (index) => {
      const block = transcriptDisplayBlocks[index];
      const isExpanded =
        expandedBlockId === block?.id ||
        block?.segments.some((segment) => segment.id === editingSegmentId) ||
        false;

      return (
        estimateDisplayBlockSize(block, isExpanded, editingSegmentId) +
        DISPLAY_BLOCK_ROW_GAP
      );
    },
    getItemKey: (index) =>
      transcriptDisplayBlocks[index]?.id ?? `transcript-block-${index}`,
    overscan: 10,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [
    expandedBlockId,
    editingSegmentId,
    rowVirtualizer,
    transcriptDisplayBlocks,
  ]);

  useEffect(() => {
    if (!isAutoScrollEnabled || activeBlockIndex < 0) {
      return;
    }

    rowVirtualizer.scrollToIndex(activeBlockIndex, {
      align: "auto",
    });
  }, [activeBlockIndex, isAutoScrollEnabled, rowVirtualizer]);

  return (
    <section className={styles.viewerPanel}>
      <div className={styles.viewerToolbar}>
        <div className={styles.viewerTools}>
          <span
            className="text-xs whitespace-nowrap"
            style={{ color: "var(--text-muted)" }}
          >
            {`${transcriptSummaryText}${normalizedTranscriptQuery ? ` · 일치 ${transcriptMatchCount}개` : ""}`}
          </span>

          <label
            className={`relative flex items-center ${styles.transcriptSearchField}`}
          >
            <Search
              size={15}
              strokeWidth={2.1}
              className="absolute left-[14px]"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              value={transcriptQuery}
              onChange={(event) => setTranscriptQuery(event.target.value)}
              className="w-full h-[38px] pl-9 pr-3 rounded-full border outline-none transition-[border-color,background-color] duration-[180ms]"
              style={{
                borderColor: "var(--border-primary)",
                background: "var(--surface-secondary)",
                color: "var(--text-primary)",
              }}
              placeholder="원문 검색"
              aria-label="원문 내 단어 검색"
            />
          </label>
          <button
            type="button"
            className="min-h-7 px-[10px] border rounded-full bg-transparent text-[11px] font-semibold cursor-pointer whitespace-nowrap transition-[border-color,background-color,color] duration-[120ms]"
            style={
              isAutoScrollEnabled
                ? {
                    borderColor: "rgba(99,102,241,0.22)",
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                  }
                : {
                    borderColor: "var(--border-soft)",
                    color: "var(--text-muted)",
                  }
            }
            onClick={() => setIsAutoScrollEnabled((prev) => !prev)}
            aria-pressed={isAutoScrollEnabled}
            title="재생 시 자동 스크롤"
          >
            따라가기
          </button>
          <button
            type="button"
            className="min-h-7 px-[10px] border rounded-full bg-transparent text-[11px] font-semibold cursor-pointer whitespace-nowrap transition-[border-color,background-color,color] duration-[120ms]"
            style={{
              borderColor: "var(--border-soft)",
              color: "var(--text-muted)",
            }}
            onClick={handleExportClipboard}
            title="원문 클립보드 복사"
          >
            <ClipboardCopy size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={`scrollbar-subtle ${styles.transcriptViewport}`}
      >
        {isLoadingDetail && !selectedRecordDetail ? (
          <div className="grid gap-4 p-5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div
                  className={styles.skeletonLine}
                  style={{ width: "50px" }}
                />
                <div
                  className={styles.skeletonLine}
                  style={{ width: "60px" }}
                />
                <div
                  className={styles.skeletonLine}
                  style={{ width: `${60 + (i % 3) * 15}%` }}
                />
              </div>
            ))}
          </div>
        ) : selectedRecordDetail &&
          selectedRecordDetail.transcriptSegments.length > 0 ? (
          <div
            className={styles.transcriptVirtualList}
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const block = transcriptDisplayBlocks[virtualRow.index];

              if (!block) {
                return null;
              }

              const isMatched = isTranscriptDisplayBlockMatched(
                block,
                normalizedTranscriptQuery,
              );
              const isActive = activeBlockIndex === virtualRow.index;
              const isSeekable =
                Boolean(selectedRecordDetail.audioUrl) &&
                block.startMs !== null;
              const blockClassName = `${styles.displayBlock} ${
                isMatched ? styles.displayBlockMatched : ""
              } ${isActive ? styles.displayBlockActive : ""} ${
                isSeekable
                  ? styles.displayBlockSeekable
                  : styles.displayBlockStatic
              }`;
              const isExpanded =
                expandedBlockId === block.id ||
                block.segments.some(
                  (segment) => segment.id === editingSegmentId,
                );
              const blockBody = (
                <>
                  <div className={styles.displayBlockHeader}>
                    <div className={styles.displayBlockMeta}>
                      <div className={styles.displayBlockTime}>
                        {formatTranscriptTime(block.startMs)}
                      </div>
                      <div
                        className={`${styles.displayBlockSpeaker} ${getSpeakerToneClass(block.speakerTone, styles)}`}
                      >
                        {block.speakerLabel}
                      </div>
                      <span className={styles.displayBlockCount}>
                        원본 {block.segmentCount}개
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.displayBlockAction}
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpandedBlockId((current) =>
                          current === block.id ? null : block.id,
                        );
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      {isExpanded ? "원본 닫기" : "원본 수정"}
                    </button>
                  </div>
                  <div className={styles.displayBlockChunks}>
                    {block.chunks.map((chunk) => (
                      <p key={chunk.id} className={styles.displayBlockChunk}>
                        {renderHighlightedText(
                          chunk.text,
                          normalizedTranscriptQuery,
                          styles,
                        )}
                      </p>
                    ))}
                  </div>
                  {isExpanded ? (
                    <div
                      className={styles.rawSegmentPanel}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      {block.segments.map((segment, index, segments) => {
                        const rawIsMatched = isTranscriptDisplayBlockMatched(
                          {
                            ...block,
                            segments: [segment],
                          },
                          normalizedTranscriptQuery,
                        );
                        const rawIsActive = isTranscriptSegmentActive({
                          currentTimeMs: currentAudioTimeMs,
                          startMs: segment.startMs,
                          endMs: segment.endMs,
                          nextStartMs: segments[index + 1]?.startMs ?? null,
                        });
                        const rawIsEditing = editingSegmentId === segment.id;
                        const rawRowClassName = `${styles.rawSegmentRow} ${
                          rawIsMatched ? styles.rawSegmentMatched : ""
                        } ${rawIsActive ? styles.rawSegmentActive : ""}`;

                        return (
                          <article key={segment.id} className={rawRowClassName}>
                            <div className={styles.rawSegmentHeader}>
                              <div className={styles.rawSegmentMeta}>
                                <div className={styles.segmentTime}>
                                  {formatTranscriptTime(segment.startMs)}
                                </div>
                                <button
                                  type="button"
                                  className={`${styles.segmentSpeaker} ${styles.segmentSpeakerClickable} ${getSpeakerToneClass(segment.speakerTone, styles)}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const next = getNextSpeaker(
                                      segment.speakerTone,
                                    );
                                    handleSpeakerLabelChange(
                                      segment.id,
                                      next.label,
                                      next.tone,
                                    );
                                  }}
                                  title="원본 세그먼트 화자 변경"
                                >
                                  {segment.speakerLabel}
                                </button>
                              </div>
                              {!rawIsEditing ? (
                                <button
                                  type="button"
                                  className={styles.rawSegmentEditTrigger}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    startEditingSegment(
                                      segment.id,
                                      segment.text,
                                    );
                                  }}
                                >
                                  수정
                                </button>
                              ) : null}
                            </div>
                            {rawIsEditing ? (
                              <div className={styles.segmentEditArea}>
                                <textarea
                                  className={styles.segmentEditInput}
                                  value={editingSegmentText}
                                  onChange={(event) =>
                                    setEditingSegmentText(event.target.value)
                                  }
                                  onKeyDown={(event) => {
                                    if (
                                      event.key === "Enter" &&
                                      !event.shiftKey
                                    ) {
                                      event.preventDefault();
                                      saveEditingSegment();
                                    }
                                    if (event.key === "Escape") {
                                      cancelEditingSegment();
                                    }
                                  }}
                                  rows={2}
                                  autoFocus
                                  disabled={editingSegmentSaving}
                                />
                                <div className={styles.segmentEditActions}>
                                  <button
                                    type="button"
                                    className={styles.segmentEditSave}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      saveEditingSegment();
                                    }}
                                    disabled={editingSegmentSaving}
                                    aria-label="저장"
                                  >
                                    <Check size={14} strokeWidth={2.5} />
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.segmentEditCancel}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      cancelEditingSegment();
                                    }}
                                    disabled={editingSegmentSaving}
                                    aria-label="취소"
                                  >
                                    <X size={14} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p
                                className={styles.rawSegmentText}
                                onDoubleClick={() =>
                                  startEditingSegment(segment.id, segment.text)
                                }
                              >
                                {renderHighlightedText(
                                  segment.text,
                                  normalizedTranscriptQuery,
                                  styles,
                                )}
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </>
              );

              return (
                <div
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  className={styles.transcriptVirtualRow}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {isSeekable ? (
                    <article
                      className={blockClassName}
                      onClick={() => seekAudioToTime(block.startMs)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          seekAudioToTime(block.startMs);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {blockBody}
                    </article>
                  ) : (
                    <article className={blockClassName}>{blockBody}</article>
                  )}
                </div>
              );
            })}
          </div>
        ) : selectedRecord.status === "processing" ? (
          <div className="grid place-items-center content-center gap-[6px] min-h-[160px] p-5 text-center">
            <p className="m-0 text-[15px] font-bold leading-[1.4]">
              한국어 전사를 백그라운드에서 처리하고 있습니다.
            </p>
            <p
              className="m-0 text-[13px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {selectedRecord.processingMessage ||
                "길이가 긴 상담은 서버에서 분할 전사한 뒤 자동으로 갱신합니다."}
            </p>
            {selectedRecord.processingChunkCount > 0 ? (
              <p
                className="m-0 text-xs leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                전사 구간 {selectedRecord.processingChunkCompletedCount}/
                {selectedRecord.processingChunkCount} ·{" "}
                {selectedRecord.processingProgress}%
              </p>
            ) : null}
          </div>
        ) : selectedRecord.analysisStatus === "processing" ||
          selectedRecord.analysisStatus === "queued" ? (
          <div className="grid place-items-center content-center gap-[6px] min-h-[160px] p-5 text-center">
            <p className="m-0 text-[15px] font-bold leading-[1.4]">
              원문은 준비되었고 AI 분석을 생성하고 있습니다.
            </p>
            <p
              className="m-0 text-[13px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {selectedRecord.processingMessage ||
                "화면을 떠나도 괜찮습니다. 나중에 다시 열면 진행 상태를 이어서 확인할 수 있습니다."}
            </p>
            <p
              className="m-0 text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              AI 분석 진행률 {selectedRecord.analysisProgress}%
            </p>
          </div>
        ) : selectedRecord.status === "error" ? (
          <div className="grid place-items-center content-center gap-[6px] min-h-[160px] p-5 text-center">
            <p className="m-0 text-[15px] font-bold leading-[1.4]">
              원문 저장에 실패했습니다.
            </p>
            <p
              className="m-0 text-[13px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {selectedRecord.errorMessage ??
                "원본 음성은 남아 있으므로 전사를 다시 시도할 수 있습니다."}
            </p>
            <ul
              className="mt-2 mb-0 pl-[18px] text-[13px] leading-[1.7] list-disc text-left"
              style={{ color: "var(--text-secondary)" }}
            >
              <li>파일이 손상된 경우 → 다른 파일로 교체 후 재시도</li>
              <li>서버 시간초과 → 잠시 후 전사 다시 시도</li>
              <li>형식 미지원 → mp3, wav, m4a 등 일반 형식 사용</li>
            </ul>
          </div>
        ) : (
          <div className="grid place-items-center content-center gap-[6px] min-h-[160px] p-5 text-center">
            <p className="m-0 text-[15px] font-bold leading-[1.4]">
              표시할 원문 세그먼트가 없습니다.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
