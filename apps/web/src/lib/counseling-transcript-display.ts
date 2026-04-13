import type {
  CounselingRecordSpeakerTone,
  CounselingTranscriptSegment,
} from "@yeon/api-contract/counseling-records";

const DISPLAY_CHUNK_TARGET_LENGTH = 110;
const DISPLAY_CHUNK_MIN_BREAKPOINT = 30;
const SENTENCE_BREAK_REGEX = /(?<=[.!?。！？])\s+/u;
const SENTENCE_END_REGEX = /[.!?。！？]$/u;

export interface CounselingTranscriptDisplayChunk {
  id: string;
  text: string;
  sourceSegmentIds: string[];
}

export interface CounselingTranscriptDisplayBlock {
  id: string;
  speakerLabel: string;
  speakerTone: CounselingRecordSpeakerTone;
  startMs: number | null;
  endMs: number | null;
  segments: CounselingTranscriptSegment[];
  sourceSegmentIds: string[];
  segmentCount: number;
  totalTextLength: number;
  chunks: CounselingTranscriptDisplayChunk[];
}

export function normalizeCounselingTranscriptSegments(
  segments: readonly CounselingTranscriptSegment[],
) {
  return [...segments]
    .filter((segment) => segment.text.trim().length > 0)
    .sort((left, right) => {
      if (left.segmentIndex !== right.segmentIndex) {
        return left.segmentIndex - right.segmentIndex;
      }

      if (left.startMs === null && right.startMs === null) {
        return 0;
      }

      if (left.startMs === null) {
        return 1;
      }

      if (right.startMs === null) {
        return -1;
      }

      return left.startMs - right.startMs;
    });
}

export function buildTranscriptDisplayBlocks(
  rawSegments: readonly CounselingTranscriptSegment[],
) {
  const segments = normalizeCounselingTranscriptSegments(rawSegments);

  if (segments.length === 0) {
    return [] as CounselingTranscriptDisplayBlock[];
  }

  const blocks: CounselingTranscriptDisplayBlock[] = [];
  let currentTurn: CounselingTranscriptSegment[] = [];

  for (const segment of segments) {
    if (
      currentTurn.length > 0 &&
      !isSameSpeaker(currentTurn[currentTurn.length - 1], segment)
    ) {
      blocks.push(buildTranscriptDisplayBlock(currentTurn));
      currentTurn = [];
    }

    currentTurn.push(segment);
  }

  if (currentTurn.length > 0) {
    blocks.push(buildTranscriptDisplayBlock(currentTurn));
  }

  return blocks;
}

function isSameSpeaker(
  left: CounselingTranscriptSegment,
  right: CounselingTranscriptSegment,
) {
  return (
    left.speakerLabel === right.speakerLabel &&
    left.speakerTone === right.speakerTone
  );
}

function buildTranscriptDisplayBlock(
  segments: CounselingTranscriptSegment[],
): CounselingTranscriptDisplayBlock {
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  const chunks = buildTranscriptDisplayChunks(segments);
  const totalTextLength = chunks.reduce(
    (sum, chunk) => sum + chunk.text.length,
    0,
  );

  return {
    id: `turn:${firstSegment.id}:${lastSegment.id}`,
    speakerLabel: firstSegment.speakerLabel,
    speakerTone: firstSegment.speakerTone,
    startMs: firstSegment.startMs,
    endMs: lastSegment.endMs,
    segments,
    sourceSegmentIds: segments.map((segment) => segment.id),
    segmentCount: segments.length,
    totalTextLength,
    chunks,
  };
}

function buildTranscriptDisplayChunks(segments: CounselingTranscriptSegment[]) {
  const chunks: CounselingTranscriptDisplayChunk[] = [];
  let currentText = "";
  let currentSourceSegmentIds: string[] = [];
  let currentChunkIndex = 0;

  const flushCurrentChunk = () => {
    if (!currentText.trim()) {
      currentText = "";
      currentSourceSegmentIds = [];
      return;
    }

    chunks.push({
      id: `chunk:${segments[0]?.id ?? "empty"}:${currentChunkIndex}`,
      text: currentText.trim(),
      sourceSegmentIds: dedupeStrings(currentSourceSegmentIds),
    });

    currentChunkIndex += 1;
    currentText = "";
    currentSourceSegmentIds = [];
  };

  for (const segment of segments) {
    const readableUnits = splitReadableUnits(segment.text);

    for (const unit of readableUnits) {
      const nextText = currentText ? `${currentText} ${unit}` : unit;

      if (
        currentText &&
        nextText.length > DISPLAY_CHUNK_TARGET_LENGTH &&
        currentText.length >= DISPLAY_CHUNK_MIN_BREAKPOINT
      ) {
        flushCurrentChunk();
      }

      currentText = currentText ? `${currentText} ${unit}` : unit;
      currentSourceSegmentIds.push(segment.id);

      if (
        currentText.length >= DISPLAY_CHUNK_MIN_BREAKPOINT &&
        SENTENCE_END_REGEX.test(unit)
      ) {
        flushCurrentChunk();
      }
    }
  }

  flushCurrentChunk();

  return chunks;
}

function splitReadableUnits(text: string) {
  const normalizedText = normalizeText(text);

  if (!normalizedText) {
    return [] as string[];
  }

  const sentenceUnits = normalizedText
    .split(SENTENCE_BREAK_REGEX)
    .map((unit) => unit.trim())
    .filter(Boolean);

  const baseUnits = sentenceUnits.length > 0 ? sentenceUnits : [normalizedText];
  const readableUnits: string[] = [];

  for (const unit of baseUnits) {
    if (unit.length <= DISPLAY_CHUNK_TARGET_LENGTH) {
      readableUnits.push(unit);
      continue;
    }

    splitOversizedUnit(unit, readableUnits);
  }

  return readableUnits;
}

function splitOversizedUnit(text: string, collector: string[]) {
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= DISPLAY_CHUNK_TARGET_LENGTH) {
      collector.push(remaining);
      return;
    }

    let breakpoint = remaining.lastIndexOf(" ", DISPLAY_CHUNK_TARGET_LENGTH);

    if (breakpoint < DISPLAY_CHUNK_MIN_BREAKPOINT) {
      breakpoint = DISPLAY_CHUNK_TARGET_LENGTH;
    }

    collector.push(remaining.slice(0, breakpoint).trim());
    remaining = remaining.slice(breakpoint).trim();
  }
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function dedupeStrings(values: string[]) {
  return [...new Set(values)];
}

export function isTranscriptDisplayBlockMatched(
  block: CounselingTranscriptDisplayBlock,
  normalizedQuery: string,
) {
  if (!normalizedQuery) {
    return false;
  }

  return block.segments.some((segment) =>
    `${segment.speakerLabel} ${segment.text}`
      .toLowerCase()
      .includes(normalizedQuery),
  );
}
