import {
  CARD_BULK_IMPORT_MAX_ITEMS,
  CARD_TEXT_MAX_LENGTH,
} from "@yeon/api-contract/card-decks";

export type ParsedBulkCard = {
  frontText: string;
  backText: string;
};

export type BulkCardImportParseResult = {
  cards: ParsedBulkCard[];
  errors: string[];
  warnings: string[];
};

const QUESTION_MARKER = "[[Q]]";
const ANSWER_MARKER = "[[A]]";
const CARD_MARKER = "[[CARD]]";
const ESCAPED_MARKERS = new Map([
  [`\\${QUESTION_MARKER}`, QUESTION_MARKER],
  [`\\${ANSWER_MARKER}`, ANSWER_MARKER],
  [`\\${CARD_MARKER}`, CARD_MARKER],
]);

type ActiveSection = "front" | "back" | null;

type DraftCard = {
  frontLines: string[];
  backLines: string[];
  startLine: number;
};

function normalizeLines(source: string): string[] {
  return source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function hasContent(draft: DraftCard | null): boolean {
  if (!draft) {
    return false;
  }
  return (
    draft.frontLines.some((line) => line.trim().length > 0) ||
    draft.backLines.some((line) => line.trim().length > 0)
  );
}

type MarkerMatch = {
  marker: string;
  content: string;
} | null;

function getMarker(line: string): MarkerMatch {
  for (const marker of [QUESTION_MARKER, ANSWER_MARKER, CARD_MARKER]) {
    if (line === marker) {
      return {
        marker,
        content: "",
      };
    }
  }
  return null;
}

function unescapeMarkerContent(line: string): string {
  const trimmed = line.trim();
  const unescaped = ESCAPED_MARKERS.get(trimmed);
  if (!unescaped) {
    return line;
  }
  return line.replace(`\\${unescaped}`, unescaped);
}

function appendContent(
  draft: DraftCard | null,
  section: ActiveSection,
  line: string,
  lineNumber: number,
  errors: string[],
): DraftCard | null {
  if (!draft || !section) {
    if (line.trim().length > 0) {
      errors.push(
        `${lineNumber}번째 줄: [[Q]] 또는 [[A]] 마커 밖의 내용은 카드로 만들 수 없습니다.`,
      );
    }
    return draft;
  }

  const contentLine = unescapeMarkerContent(line);
  if (section === "front") {
    draft.frontLines.push(contentLine);
    return draft;
  }

  draft.backLines.push(contentLine);
  return draft;
}

function finalizeDraft(params: {
  draft: DraftCard | null;
  lineNumber: number;
  cards: ParsedBulkCard[];
  errors: string[];
  isExplicitCardBoundary: boolean;
}) {
  const { draft, lineNumber, cards, errors, isExplicitCardBoundary } = params;
  if (!draft || !hasContent(draft)) {
    return;
  }

  const frontText = draft.frontLines.join("\n").trim();
  const backText = draft.backLines.join("\n").trim();

  if (!frontText || !backText) {
    errors.push(
      `${draft.startLine}번째 줄에서 시작한 카드: 앞면([[Q]])과 뒷면([[A]])을 모두 입력해주세요.`,
    );
    return;
  }

  if (frontText.length > CARD_TEXT_MAX_LENGTH) {
    errors.push(
      `${draft.startLine}번째 줄에서 시작한 카드: 앞면은 ${CARD_TEXT_MAX_LENGTH}자 이하여야 합니다.`,
    );
    return;
  }

  if (backText.length > CARD_TEXT_MAX_LENGTH) {
    errors.push(
      `${draft.startLine}번째 줄에서 시작한 카드: 뒷면은 ${CARD_TEXT_MAX_LENGTH}자 이하여야 합니다.`,
    );
    return;
  }

  if (cards.length >= CARD_BULK_IMPORT_MAX_ITEMS) {
    errors.push(
      `${lineNumber}번째 줄: 한 번에 최대 ${CARD_BULK_IMPORT_MAX_ITEMS}장까지만 추가할 수 있습니다.`,
    );
    return;
  }

  cards.push({ frontText, backText });

  if (!isExplicitCardBoundary) {
    return;
  }
}

export function parseBulkCardImportInput(
  source: string,
): BulkCardImportParseResult {
  const cards: ParsedBulkCard[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = normalizeLines(source);
  let draft: DraftCard | null = null;
  let section: ActiveSection = null;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const markerMatch = getMarker(line);

    if (!markerMatch) {
      draft = appendContent(draft, section, line, lineNumber, errors);
      return;
    }

    if (markerMatch.marker === QUESTION_MARKER) {
      if (hasContent(draft)) {
        finalizeDraft({
          draft,
          lineNumber,
          cards,
          errors,
          isExplicitCardBoundary: false,
        });
        warnings.push(
          `${lineNumber}번째 줄: 이전 카드 뒤에 [[CARD]]가 없어도 새 [[Q]] 기준으로 카드를 나눴습니다.`,
        );
      }
      draft = { frontLines: [], backLines: [], startLine: lineNumber };
      section = "front";
      if (markerMatch.content.trim().length > 0) {
        draft = appendContent(
          draft,
          section,
          markerMatch.content,
          lineNumber,
          errors,
        );
      }
      return;
    }

    if (markerMatch.marker === ANSWER_MARKER) {
      if (!draft) {
        errors.push(`${lineNumber}번째 줄: [[A]]보다 먼저 [[Q]]가 필요합니다.`);
        return;
      }
      section = "back";
      if (markerMatch.content.trim().length > 0) {
        draft = appendContent(
          draft,
          section,
          markerMatch.content,
          lineNumber,
          errors,
        );
      }
      return;
    }

    if (markerMatch.content.trim().length > 0) {
      errors.push(
        `${lineNumber}번째 줄: [[CARD]] 뒤에는 내용을 붙일 수 없습니다.`,
      );
    }

    finalizeDraft({
      draft,
      lineNumber,
      cards,
      errors,
      isExplicitCardBoundary: true,
    });
    draft = null;
    section = null;
  });

  if (hasContent(draft)) {
    finalizeDraft({
      draft,
      lineNumber: lines.length,
      cards,
      errors,
      isExplicitCardBoundary: false,
    });
  }

  if (source.trim().length > 0 && cards.length === 0 && errors.length === 0) {
    errors.push(
      "추가할 수 있는 카드가 없습니다. [[Q]]와 [[A]] 형식을 확인해주세요.",
    );
  }

  return { cards, errors, warnings };
}
