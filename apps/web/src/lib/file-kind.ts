// 클라이언트/서버 모두에서 사용 가능한 순수 유틸리티
// features/cloud-import/file-kind.ts에서 이동

export type FileKind =
  | "folder"
  | "spreadsheet" // xlsx, xls
  | "csv" // csv
  | "txt" // txt, tsv, md 등
  | "pdf" // pdf
  | "image" // png, jpg, gif 등
  | "unsupported";

const SPREADSHEET_EXTS = [".xlsx", ".xls"];
const SPREADSHEET_MIMES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.google-apps.spreadsheet",
];
const CSV_EXTS = [".csv"];
const CSV_MIMES = ["text/csv", "application/csv"];
const TXT_EXTS = [".txt", ".tsv", ".md", ".markdown"];
const TXT_MIMES = [
  "text/plain",
  "text/tab-separated-values",
  "text/markdown",
  "text/x-markdown",
];
const PDF_EXTS = [".pdf"];
const PDF_MIMES = ["application/pdf"];
const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".heic", ".heif", ".webp", ".gif"];
const IMAGE_MIME_PREFIX = "image/";

export function detectFileKind(name: string, mimeType = ""): FileKind {
  const lower = name.toLowerCase();
  const mime = mimeType.toLowerCase();

  if (
    SPREADSHEET_EXTS.some((e) => lower.endsWith(e)) ||
    SPREADSHEET_MIMES.includes(mime)
  )
    return "spreadsheet";
  if (CSV_EXTS.some((e) => lower.endsWith(e)) || CSV_MIMES.includes(mime))
    return "csv";
  if (
    TXT_EXTS.some((e) => lower.endsWith(e)) ||
    TXT_MIMES.some((m) => mime.startsWith(m))
  )
    return "txt";
  if (PDF_EXTS.some((e) => lower.endsWith(e)) || PDF_MIMES.includes(mime))
    return "pdf";
  if (
    IMAGE_EXTS.some((e) => lower.endsWith(e)) ||
    mime.startsWith(IMAGE_MIME_PREFIX)
  )
    return "image";

  return "unsupported";
}

export function isSelectableKind(kind: FileKind): boolean {
  return kind !== "folder" && kind !== "unsupported";
}

export function isAnalyzableKind(kind: FileKind): boolean {
  return isSelectableKind(kind);
}
