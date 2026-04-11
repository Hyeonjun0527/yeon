import * as XLSX from "xlsx";
import { z } from "zod";
import { ServiceError } from "./service-error";
import type { FileKind } from "@/lib/file-kind";

/* ── Validation ── */

const StudentSchema = z.object({
  name: z.string(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  status: z.string().nullish(),
  customFields: z.record(z.string(), z.string().nullish()).nullish(),
});

const ImportPreviewSchema = z.object({
  cohorts: z.array(
    z.object({
      name: z.string(),
      students: z.array(StudentSchema),
    }),
  ),
});

function parseImportPreview(raw: string): ImportPreview {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ServiceError(500, "AI 응답 JSON 파싱 실패");
  }
  const result = ImportPreviewSchema.safeParse(parsed);
  if (!result.success) {
    throw new ServiceError(500, `AI 응답 구조 검증 실패: ${result.error.message}`);
  }
  return result.data;
}

/* ── Types ── */

export interface FieldSchemaHint {
  name: string;
  fieldType: string;
}

export interface ImportPreview {
  cohorts: Array<{
    name: string;
    students: Array<{
      name: string;
      email?: string | null;
      phone?: string | null;
      status?: string | null;
      customFields?: Record<string, string | null | undefined> | null;
    }>;
  }>;
}

export interface RefineContext {
  instruction: string;
  previousResult: ImportPreview;
}

/* ── Excel → 텍스트 변환 ── */

export function parseExcelToText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet);
    parts.push(`=== 시트: ${sheetName} ===\n${csv}`);
  }

  return parts.join("\n\n");
}

/* ── Excel → 구조화 행 데이터 ── */

interface SheetRows {
  sheetName: string;
  rows: string[][];
}

function parseExcelToRows(buffer: Buffer): SheetRows[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const result: SheetRows[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
    if (rows.length > 0) {
      result.push({ sheetName, rows: rows as string[][] });
    }
  }

  return result;
}

function parseCsvToRows(text: string): SheetRows[] {
  const rows = text.split("\n").map((line) =>
    line.split(/[,\t]/).map((cell) => cell.replace(/^"|"$/g, "").trim()),
  );
  return [{ sheetName: "데이터", rows }];
}

function getTotalRowCount(sheets: SheetRows[]): number {
  return sheets.reduce((sum, s) => sum + s.rows.length, 0);
}

/* ── Phase 1: AI 컬럼 식별 ── */

const ColumnMappingSchema = z.object({
  extractable: z.boolean(),
  reason: z.string().nullable(),
  nameColumn: z.number(),
  emailColumn: z.number().nullable(),
  phoneColumn: z.number().nullable(),
  statusColumn: z.number().nullable(),
  cohortStrategy: z.enum(["by_sheet", "by_column", "single"]),
  cohortColumn: z.number().nullable(),
  cohortName: z.string().nullable(),
  headerRow: z.number(),
  dirtyColumns: z.array(z.number()).nullable(),
});

type ColumnMapping = z.infer<typeof ColumnMappingSchema>;

function buildSampleText(sheets: SheetRows[], sampleSize = 20): string {
  const parts: string[] = [];
  for (const { sheetName, rows } of sheets) {
    const sample = rows.slice(0, sampleSize + 2); // 헤더 + 여유분
    const csv = sample.map((r) => r.join(",")).join("\n");
    parts.push(`=== 시트: ${sheetName} (총 ${rows.length}행) ===\n${csv}`);
  }
  return parts.join("\n\n");
}

async function identifyColumnsWithAI(sampleText: string): Promise<ColumnMapping> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ServiceError(500, "OPENAI_API_KEY가 설정되지 않았습니다.");

  const model =
    process.env.OPENAI_AI_IMPORT_MODEL ??
    process.env.OPENAI_AI_CHAT_MODEL ??
    "gpt-4.1-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `이 스프레드시트 샘플을 분석하고 컬럼 매핑 정보를 JSON으로 반환해라.

반환 형식:
{
  "extractable": <true|false — 프로그래밍적으로 깔끔하게 추출 가능한지>,
  "reason": <extractable이 false일 때 이유 (예: "셀 병합", "이름+상태 혼합", "비정형 레이아웃")>,
  "nameColumn": <이름 컬럼 인덱스 (0부터)>,
  "emailColumn": <이메일 컬럼 인덱스 또는 null>,
  "phoneColumn": <전화번호 컬럼 인덱스 또는 null>,
  "statusColumn": <상태/수강상태 컬럼 인덱스 또는 null>,
  "cohortStrategy": "by_sheet" | "by_column" | "single",
  "cohortColumn": <코호트/기수 구분 컬럼 인덱스 (by_column일 때) 또는 null>,
  "cohortName": <단일 코호트일 때 이름 또는 null>,
  "headerRow": <헤더 행 번호 (0부터)>,
  "dirtyColumns": <값이 지저분해서 AI가 직접 해석해야 하는 컬럼 인덱스 배열 또는 null>
}

extractable 판단 기준:
- true: 헤더가 명확하고, 한 행에 한 명의 데이터가 있고, 컬럼별로 한 종류의 데이터만 들어있는 정형 데이터
- false: 셀 병합, 한 셀에 여러 정보 혼합(예: "김민지(휴학)"), 헤더가 여러 줄, 행 중간에 소계/메모 삽입 등 비정형 구조

dirtyColumns: extractable이 true여도 특정 컬럼만 지저분할 수 있음 (예: "김민지 (휴학)" 같은 혼합 데이터). 이 컬럼은 프로그래밍 추출이 아닌 AI가 직접 해석해야 함

cohort 규칙:
- 시트가 여러 개이고 각 시트가 다른 코호트/기수를 나타내면 cohortStrategy: "by_sheet"
- 하나의 시트에서 특정 컬럼이 코호트/기수를 구분하면 cohortStrategy: "by_column"
- 코호트 구분이 없으면 cohortStrategy: "single", cohortName에 적절한 이름`,
        },
        { role: "user", content: sampleText },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(502, `OpenAI API 호출 실패 (컬럼 식별): ${text}`);
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const raw = data.choices[0]?.message?.content;
  if (!raw) throw new ServiceError(500, "AI 컬럼 식별 응답이 비어 있습니다.");

  const parsed = ColumnMappingSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new ServiceError(500, `컬럼 매핑 검증 실패: ${parsed.error.message}`);
  }
  return parsed.data;
}

/* ── Phase 2: 컬럼 축소 → 텍스트 ── */

function buildReducedText(sheets: SheetRows[], mapping: ColumnMapping): string {
  const cols = [mapping.nameColumn];
  if (mapping.emailColumn != null) cols.push(mapping.emailColumn);
  if (mapping.phoneColumn != null) cols.push(mapping.phoneColumn);
  if (mapping.statusColumn != null) cols.push(mapping.statusColumn);
  if (mapping.cohortStrategy === "by_column" && mapping.cohortColumn != null) {
    cols.push(mapping.cohortColumn);
  }

  const parts: string[] = [];
  for (const { sheetName, rows } of sheets) {
    const headerRow = rows[mapping.headerRow];
    const header = headerRow ? cols.map((c) => headerRow[c] ?? "").join(",") : "";

    const dataRows = rows.slice(mapping.headerRow + 1).map((row) =>
      cols.map((c) => row[c] ?? "").join(","),
    );

    const csv = [header, ...dataRows].join("\n");
    parts.push(`=== 시트: ${sheetName} ===\n${csv}`);
  }
  return parts.join("\n\n");
}

/* ── 대용량 파일 파이프라인 ── */

const LARGE_FILE_THRESHOLD = 100;

async function analyzeLargeFile(
  sheets: SheetRows[],
  refine?: RefineContext,
): Promise<ImportPreview> {
  // Phase 1: 샘플로 컬럼 식별 + 추출 가능성 판단
  const sampleText = buildSampleText(sheets);
  const mapping = await identifyColumnsWithAI(sampleText);

  if (!mapping.extractable) {
    // AI가 "비정형 데이터"로 판단 → 컬럼 축소만 하고 AI가 직접 추출
    const reducedText = buildReducedText(sheets, mapping);
    return analyzeFileWithAI(reducedText, refine);
  }

  // Phase 2: 프로그래밍 추출
  const dirtySet = new Set(mapping.dirtyColumns || []);
  const preview: ImportPreview = { cohorts: [] };
  const cohortMap = new Map<string, ImportPreview["cohorts"][number]>();

  function getOrCreateCohort(name: string) {
    let cohort = cohortMap.get(name);
    if (!cohort) {
      cohort = { name, students: [] };
      cohortMap.set(name, cohort);
      preview.cohorts.push(cohort);
    }
    return cohort;
  }

  for (const { sheetName, rows } of sheets) {
    const dataRows = rows.slice(mapping.headerRow + 1);

    for (const row of dataRows) {
      const nameRaw = row[mapping.nameColumn] ?? "";
      if (!nameRaw.trim()) continue; // 빈 행 스킵

      const student: ImportPreview["cohorts"][number]["students"][number] = {
        name: nameRaw.trim(),
        email: mapping.emailColumn != null ? (row[mapping.emailColumn] ?? "").trim() || null : null,
        phone: mapping.phoneColumn != null ? (row[mapping.phoneColumn] ?? "").trim() || null : null,
        status: mapping.statusColumn != null ? (row[mapping.statusColumn] ?? "").trim() || null : null,
      };

      // 코호트 결정
      let cohortName: string;
      if (mapping.cohortStrategy === "by_sheet") {
        cohortName = sheetName;
      } else if (mapping.cohortStrategy === "by_column" && mapping.cohortColumn != null) {
        cohortName = (row[mapping.cohortColumn] ?? "").trim() || sheetName;
      } else {
        cohortName = mapping.cohortName || sheetName;
      }

      getOrCreateCohort(cohortName).students.push(student);
    }
  }

  // Phase 3: dirtyColumns가 있으면 AI에게 후처리 요청
  if (dirtySet.size > 0) {
    // 지저분한 컬럼의 raw 데이터를 뽑아서 AI에게 정제 요청
    const dirtyData: string[] = [];
    for (const { rows } of sheets) {
      const header = rows[mapping.headerRow];
      if (!header) continue;
      for (const colIdx of dirtySet) {
        const colName = header[colIdx] ?? `컬럼${colIdx}`;
        const values = rows.slice(mapping.headerRow + 1)
          .map((r, i) => `${i}: ${r[colIdx] ?? ""}`)
          .filter((v) => !v.endsWith(": "));
        if (values.length > 0) {
          dirtyData.push(`=== ${colName} (컬럼 ${colIdx}) ===\n${values.join("\n")}`);
        }
      }
    }

    if (dirtyData.length > 0) {
      const cleanupResult = await analyzeFileWithAI(
        `프로그래밍 추출 결과:\n${JSON.stringify(preview, null, 2)}\n\n아래 컬럼은 데이터가 지저분해서 AI 정제가 필요합니다:\n${dirtyData.join("\n\n")}\n\n위 raw 데이터를 참고해서 추출 결과를 보정해 주세요.`,
        refine,
      );
      return cleanupResult;
    }
  }

  return preview;
}

/* ── AI 텍스트 분석 ── */

export async function analyzeFileWithAI(
  content: string,
  refine?: RefineContext,
  fieldHints?: FieldSchemaHint[],
): Promise<ImportPreview> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ServiceError(500, "OPENAI_API_KEY가 설정되지 않았습니다.");

  const model =
    process.env.OPENAI_AI_IMPORT_MODEL ??
    process.env.OPENAI_AI_CHAT_MODEL ??
    "gpt-4.1-mini";

  const fieldHintSection = fieldHints && fieldHints.length > 0
    ? `\n\n추가 커스텀 필드 목록 (가능하면 각 수강생에 대해 추출):
${fieldHints.map((f) => `- ${f.name} (타입: ${f.fieldType})`).join("\n")}
추출된 커스텀 필드는 각 student 객체의 "customFields" 키에 { "필드이름": "값" } 형식으로 포함해라. 값이 없으면 null.`
    : "";

  const systemPrompt = `아래 스프레드시트 데이터에서 코호트/기수 정보와 수강생 목록을 추출해라.
JSON 형식으로 반환: { "cohorts": [{ "name": "코호트명", "students": [{ "name": "이름", "email": "이메일", "phone": "전화번호", "status": "active|withdrawn|graduated", "customFields": {} }] }] }
- status 기본값은 "active"
- 이메일, 전화번호 없으면 null
- 하나의 코호트면 배열에 하나만 넣어라${refine ? "\n- 이전 분석 결과를 참고하고 사용자 보완 요청을 반영해 개선된 결과를 반환해라" : ""}${fieldHintSection}`;

  const userContent = refine
    ? `${content}\n\n---\n이전 분석 결과:\n${JSON.stringify(refine.previousResult, null, 2)}\n\n사용자 보완 요청: ${refine.instruction}`
    : content;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(502, `OpenAI API 호출 실패: ${text}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const raw = data.choices[0]?.message?.content;
  if (!raw) throw new ServiceError(500, "AI 응답이 비어 있습니다.");

  return parseImportPreview(raw);
}

/* ── AI 이미지 분석 (Vision) ── */

export async function analyzeImageWithAI(
  base64Data: string,
  mimeType: string,
  refine?: RefineContext,
  fieldHints?: FieldSchemaHint[],
): Promise<ImportPreview> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ServiceError(500, "OPENAI_API_KEY가 설정되지 않았습니다.");

  const model =
    process.env.OPENAI_AI_VISION_MODEL ??
    process.env.OPENAI_AI_IMPORT_MODEL ??
    process.env.OPENAI_AI_CHAT_MODEL ??
    "gpt-4.1-nano";

  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const imgFieldHintSection = fieldHints && fieldHints.length > 0
    ? `\n추가 커스텀 필드 목록 (가능하면 추출): ${fieldHints.map((f) => `${f.name}(${f.fieldType})`).join(", ")}\n추출된 커스텀 필드는 "customFields": { "필드이름": "값" } 으로 포함해라.`
    : "";

  const basePrompt = `이 이미지에서 수강생 목록을 추출해라.
JSON 형식으로만 반환: { "cohorts": [{ "name": "코호트명", "students": [{ "name": "이름", "email": "이메일 또는 null", "phone": "전화번호 또는 null", "status": "active", "customFields": {} }] }] }
- status 기본값은 "active"
- 이메일, 전화번호 없으면 null
- 수강생 정보가 없으면 cohorts를 빈 배열로 반환
- 이름을 명확히 식별할 수 없는 데이터는 포함하지 마라${imgFieldHintSection}`;

  const textPrompt = refine
    ? `${basePrompt}\n\n이전 분석 결과:\n${JSON.stringify(refine.previousResult, null, 2)}\n\n사용자 보완 요청: ${refine.instruction}`
    : basePrompt;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: dataUrl } },
            { type: "text", text: textPrompt },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(502, `OpenAI API 호출 실패: ${text}`);
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const raw = data.choices[0]?.message?.content;
  if (!raw) throw new ServiceError(500, "AI 응답이 비어 있습니다.");

  return parseImportPreview(raw);
}

/* ── PDF → 텍스트 변환 ── */

async function parsePdfToText(buffer: Buffer): Promise<string> {
  // pdf-parse v1 은 CommonJS default export
  const pdfParse = (await import("pdf-parse")).default as (buf: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return result.text;
}

/* ── 버퍼 분석 진입점 ── */

export async function analyzeBuffer(
  buffer: Buffer,
  _fileName: string,
  mimeType: string,
  kind: FileKind,
  refine?: RefineContext,
  fieldHints?: FieldSchemaHint[],
): Promise<ImportPreview> {
  switch (kind) {
    case "spreadsheet": {
      const sheets = parseExcelToRows(buffer);
      const totalRows = getTotalRowCount(sheets);
      if (totalRows > LARGE_FILE_THRESHOLD) {
        return analyzeLargeFile(sheets, refine);
      }
      const text = parseExcelToText(buffer);
      return analyzeFileWithAI(text, refine, fieldHints);
    }
    case "csv":
    case "txt": {
      const text = buffer.toString("utf-8");
      const sheets = parseCsvToRows(text);
      const totalRows = getTotalRowCount(sheets);
      if (totalRows > LARGE_FILE_THRESHOLD) {
        return analyzeLargeFile(sheets, refine);
      }
      return analyzeFileWithAI(text, refine, fieldHints);
    }
    case "pdf": {
      let text = "";
      try {
        text = await parsePdfToText(buffer);
      } catch {
        // 암호화되거나 손상된 PDF → 텍스트 추출 불가
      }
      if (!text.trim()) {
        // 스캔본 PDF 등 텍스트 없음 → 빈 결과 반환 (Vision은 PDF를 지원하지 않음)
        return { cohorts: [] };
      }
      return analyzeFileWithAI(text, refine, fieldHints);
    }
    case "image": {
      const base64 = buffer.toString("base64");
      return analyzeImageWithAI(base64, mimeType || "image/png", refine, fieldHints);
    }
    default:
      throw new ServiceError(400, "분석을 지원하지 않는 파일 형식입니다.");
  }
}
