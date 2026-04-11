import { google } from "googleapis";

import { ServiceError } from "./service-error";

export type OCRWord = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OCRTableResult = {
  fullText: string;
  rows: string[][];
  rowCount: number;
  maxColumnCount: number;
  confidence: number;
};

type OCRCellCandidate = {
  text: string;
  startX: number;
  endX: number;
  centerX: number;
  width: number;
};

type Vertex = { x?: number | null; y?: number | null };

function getBoundingBoxMetrics(vertices: Vertex[] | undefined) {
  const xs = (vertices ?? []).map((vertex) => vertex.x ?? 0);
  const ys = (vertices ?? []).map((vertex) => vertex.y ?? 0);
  const minX = xs.length > 0 ? Math.min(...xs) : 0;
  const maxX = xs.length > 0 ? Math.max(...xs) : 0;
  const minY = ys.length > 0 ? Math.min(...ys) : 0;
  const maxY = ys.length > 0 ? Math.max(...ys) : 0;

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function buildWord(
  symbols:
    | Array<{
        text?: string | null;
        property?: { detectedBreak?: { type?: string } };
      }>
    | undefined,
  vertices: Vertex[] | undefined,
): OCRWord | null {
  const text = (symbols ?? [])
    .map((symbol) => symbol.text ?? "")
    .join("")
    .trim();
  if (!text) {
    return null;
  }

  const metrics = getBoundingBoxMetrics(vertices);
  return {
    text,
    ...metrics,
  };
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function groupWordsIntoRows(words: OCRWord[]) {
  const sorted = [...words].sort((a, b) => a.y - b.y || a.x - b.x);
  const rowHeightMedian = median(sorted.map((word) => word.height)) || 18;
  const tolerance = Math.max(8, rowHeightMedian * 0.75);

  const rows: OCRWord[][] = [];

  for (const word of sorted) {
    const currentRow = rows.at(-1);
    if (!currentRow) {
      rows.push([word]);
      continue;
    }

    const currentY = median(currentRow.map((item) => item.y + item.height / 2));
    const nextY = word.y + word.height / 2;

    if (Math.abs(currentY - nextY) <= tolerance) {
      currentRow.push(word);
      continue;
    }

    rows.push([word]);
  }

  return rows.map((row) => row.sort((a, b) => a.x - b.x));
}

function convertRowWordsToCellCandidates(row: OCRWord[]) {
  if (row.length === 0) return [];

  const widths = row.map((word) => word.width);
  const threshold = Math.max(18, median(widths) * 1.4);
  const cells: OCRCellCandidate[] = [];
  let buffer = row[0]!.text;
  let startX = row[0]!.x;
  let endX = row[0]!.x + row[0]!.width;
  let previous = row[0]!;

  for (const word of row.slice(1)) {
    const gap = word.x - (previous.x + previous.width);
    if (gap > threshold) {
      const text = buffer.trim();
      if (text) {
        cells.push({
          text,
          startX,
          endX,
          centerX: (startX + endX) / 2,
          width: Math.max(1, endX - startX),
        });
      }
      buffer = word.text;
      startX = word.x;
      endX = word.x + word.width;
    } else {
      buffer = `${buffer} ${word.text}`;
      endX = Math.max(endX, word.x + word.width);
    }
    previous = word;
  }

  const text = buffer.trim();
  if (text) {
    cells.push({
      text,
      startX,
      endX,
      centerX: (startX + endX) / 2,
      width: Math.max(1, endX - startX),
    });
  }

  return cells;
}

function inferColumnAnchors(rows: OCRCellCandidate[][]) {
  const centers = rows
    .flat()
    .map((cell) => cell.centerX)
    .sort((a, b) => a - b);

  if (centers.length === 0) {
    return [];
  }

  const widths = rows.flat().map((cell) => cell.width);
  const tolerance = Math.max(16, median(widths) * 0.9);
  const clusters: number[][] = [];

  for (const center of centers) {
    const currentCluster = clusters.at(-1);
    if (!currentCluster) {
      clusters.push([center]);
      continue;
    }

    const clusterCenter = median(currentCluster);
    if (Math.abs(clusterCenter - center) <= tolerance) {
      currentCluster.push(center);
      continue;
    }

    clusters.push([center]);
  }

  return clusters.map((cluster) => median(cluster));
}

function assignCellsToAnchors(rows: OCRCellCandidate[][], anchors: number[]) {
  if (anchors.length === 0) {
    return [];
  }

  return rows.map((row) => {
    const assigned = Array.from({ length: anchors.length }, () => "");
    const usedIndexes = new Set<number>();

    for (const cell of row) {
      const closestAnchor = anchors
        .map((anchor, index) => ({
          index,
          distance: Math.abs(anchor - cell.centerX),
        }))
        .sort((left, right) => left.distance - right.distance)
        .find((candidate) => !usedIndexes.has(candidate.index));

      if (!closestAnchor) {
        continue;
      }

      assigned[closestAnchor.index] = cell.text;
      usedIndexes.add(closestAnchor.index);
    }

    return assigned;
  });
}

function normalizeRows(rows: string[][]) {
  return rows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
}

function scoreTable(rows: string[][]) {
  if (rows.length === 0) return 0;

  const header = rows[0]?.join(" ").toLowerCase() ?? "";
  const hasNameHeader = /이름|성명|name/.test(header);
  const hasOtherHeader =
    /전화|연락처|email|이메일|기수|github|전공|등록일|상태|성별/.test(header);
  const multiColumnRows = rows.filter(
    (row) => row.filter((cell) => cell.trim().length > 0).length >= 3,
  ).length;
  const score =
    (hasNameHeader ? 0.35 : 0) +
    (hasOtherHeader ? 0.2 : 0) +
    Math.min(0.25, (multiColumnRows / Math.max(rows.length, 1)) * 0.25) +
    Math.min(0.2, (rows.length / 15) * 0.2);

  return Math.max(0, Math.min(1, score));
}

async function getGoogleVisionAccessToken() {
  if (process.env.GOOGLE_VISION_API_KEY) {
    return { apiKey: process.env.GOOGLE_VISION_API_KEY, accessToken: null };
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  if (!accessToken.token) {
    throw new ServiceError(
      500,
      "Google Vision OCR 인증 토큰을 가져오지 못했습니다. GOOGLE_VISION_API_KEY 또는 GCP 인증 정보를 확인해주세요.",
    );
  }

  return { apiKey: null, accessToken: accessToken.token };
}

export async function extractTableFromImageWithGoogleVision(params: {
  buffer: Buffer;
  mimeType: string;
}): Promise<OCRTableResult> {
  const { apiKey, accessToken } = await getGoogleVisionAccessToken();
  const endpoint = apiKey
    ? `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`
    : "https://vision.googleapis.com/v1/images:annotate";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      requests: [
        {
          image: { content: params.buffer.toString("base64") },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["ko", "en"] },
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(502, `Google Vision OCR 호출 실패: ${text}`);
  }

  const data = (await res.json()) as {
    responses?: Array<{
      error?: { message?: string };
      fullTextAnnotation?: {
        text?: string;
        pages?: Array<{
          blocks?: Array<{
            paragraphs?: Array<{
              words?: Array<{
                symbols?: Array<{
                  text?: string | null;
                  property?: { detectedBreak?: { type?: string } };
                }>;
                boundingBox?: { vertices?: Vertex[] };
              }>;
            }>;
          }>;
        }>;
      };
    }>;
  };

  const response = data.responses?.[0];
  if (response?.error?.message) {
    throw new ServiceError(
      502,
      `Google Vision OCR 오류: ${response.error.message}`,
    );
  }

  const fullText = response?.fullTextAnnotation?.text?.trim() ?? "";
  const words: OCRWord[] = [];

  for (const page of response?.fullTextAnnotation?.pages ?? []) {
    for (const block of page.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        for (const word of paragraph.words ?? []) {
          const built = buildWord(word.symbols, word.boundingBox?.vertices);
          if (built) {
            words.push(built);
          }
        }
      }
    }
  }

  const groupedRows = groupWordsIntoRows(words);
  const rowCellCandidates = groupedRows.map(convertRowWordsToCellCandidates);
  const anchors = inferColumnAnchors(rowCellCandidates);
  const rows = normalizeRows(assignCellsToAnchors(rowCellCandidates, anchors));
  const confidence = scoreTable(rows);

  return {
    fullText,
    rows,
    rowCount: rows.length,
    maxColumnCount: rows.reduce((max, row) => Math.max(max, row.length), 0),
    confidence,
  };
}
