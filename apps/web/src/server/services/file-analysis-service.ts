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
    throw new ServiceError(
      500,
      `AI 응답 구조 검증 실패: ${result.error.message}`,
    );
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

function normalizeSheetCell(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  return typeof cell === "string" ? cell : String(cell);
}

function parseExcelToRows(buffer: Buffer): SheetRows[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const result: SheetRows[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils
      .sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
      })
      .map((row) => row.map(normalizeSheetCell));
    if (rows.length > 0) {
      result.push({ sheetName, rows });
    }
  }

  return result;
}

function parseCsvToRows(text: string): SheetRows[] {
  const rows = text
    .split("\n")
    .map((line) =>
      line.split(/[,\t]/).map((cell) => cell.replace(/^"|"$/g, "").trim()),
    );
  return [{ sheetName: "데이터", rows }];
}

function _getTotalRowCount(sheets: SheetRows[]): number {
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

const SheetPlanSchema = z.object({
  sheetName: z.string(),
  role: z.enum(["aggregate", "dedicated", "ignore"]),
  headerRows: z.array(z.number().int().min(0)).min(1),
  dataStartRow: z.number().int().min(0),
  nameColumn: z.number().int().min(0),
  emailColumn: z.number().int().min(0).nullable(),
  phoneColumn: z.number().int().min(0).nullable(),
  statusColumn: z.number().int().min(0).nullable(),
  spaceColumn: z.number().int().min(0).nullable(),
  notes: z.string().nullable(),
});

const WorkbookPlanSchema = z.object({
  primarySource: z.enum(["aggregate", "dedicated"]),
  sheets: z.array(SheetPlanSchema),
});

type SheetPlan = z.infer<typeof SheetPlanSchema>;
type WorkbookPlan = z.infer<typeof WorkbookPlanSchema>;

function getMaxColumnCount(rows: string[][]) {
  return rows.reduce((max, row) => Math.max(max, row.length), 0);
}

function normalizeHeaderLabelPart(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function combineHeaderRows(rows: string[][], headerRows: number[]): string[] {
  const maxColumnCount = getMaxColumnCount(rows);

  return Array.from({ length: maxColumnCount }, (_, columnIndex) => {
    const parts = headerRows
      .map((rowIndex) =>
        normalizeHeaderLabelPart(rows[rowIndex]?.[columnIndex] ?? ""),
      )
      .filter(Boolean);

    const dedupedParts = parts.filter(
      (part, index) =>
        parts.findIndex((candidate) => candidate === part) === index,
    );

    return dedupedParts.join(" ").trim();
  });
}

function buildUniqueHeaderLabels(labels: string[]) {
  const counts = new Map<string, number>();

  return labels.map((rawLabel, index) => {
    const base = rawLabel.trim() || `컬럼${index + 1}`;
    const current = counts.get(base) ?? 0;
    counts.set(base, current + 1);
    return current === 0 ? base : `${base}__${current + 1}`;
  });
}

function normalizeStatusValue(value: string | null) {
  if (!value) return null;

  const normalized = value.replace(/\s+/g, "").toLowerCase();

  if (["active", "수강중", "재학", "진행중"].includes(normalized)) {
    return "active";
  }

  if (["withdrawn", "중도포기", "휴학", "중단", "대기"].includes(normalized)) {
    return "withdrawn";
  }

  if (["graduated", "수료", "졸업", "완료"].includes(normalized)) {
    return "graduated";
  }

  return value.trim() || null;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isMeaninglessCustomFieldName(name: string) {
  const normalized = normalizeWhitespace(name).toLowerCase();

  if (!normalized) return true;

  return [
    /^unnamed/i,
    /^column\d+$/i,
    /^col\d+$/i,
    /^컬럼\d+$/,
    /^항목\d+$/,
    /^source(sheet|row)$/,
  ].some((pattern) => pattern.test(normalized));
}

function compactTrackLabel(raw: string): string | null {
  const candidates = [
    { pattern: /백엔드|backend/i, label: "백엔드" },
    { pattern: /프론트엔드|프론트|frontend/i, label: "프론트" },
    { pattern: /풀스택|full\s*stack/i, label: "풀스택" },
    { pattern: /클라우드|cloud/i, label: "클라우드" },
    { pattern: /데이터|data/i, label: "데이터" },
    { pattern: /ai|인공지능/, label: "AI" },
    { pattern: /디자인|design/i, label: "디자인" },
    { pattern: /모바일|앱|android|ios/i, label: "모바일" },
  ];

  return candidates.find(({ pattern }) => pattern.test(raw))?.label ?? null;
}

function normalizeCohortName(rawName: string, fallbackOrder: number) {
  const normalized = normalizeWhitespace(rawName);
  const ordinalMatch = normalized.match(/(\d+)\s*기/);
  const trackLabel = compactTrackLabel(normalized);

  if (ordinalMatch) {
    const ordinal = `${ordinalMatch[1]}기`;
    return trackLabel ? `${ordinal}(${trackLabel})` : ordinal;
  }

  const fallbackOrdinal = `${fallbackOrder}기`;
  return trackLabel ? `${fallbackOrdinal}(${trackLabel})` : fallbackOrdinal;
}

function normalizeImportPreview(preview: ImportPreview): ImportPreview {
  const cohortMap = new Map<string, ImportPreview["cohorts"][number]>();
  let fallbackOrder = 1;

  for (const cohort of preview.cohorts) {
    const normalizedName = normalizeCohortName(cohort.name, fallbackOrder);
    fallbackOrder += 1;

    const normalizedStudents = cohort.students.map((student) => {
      const customFields = Object.entries(student.customFields ?? {}).reduce<
        Record<string, string | null>
      >((acc, [rawKey, rawValue]) => {
        const key = normalizeWhitespace(rawKey);
        if (isMeaninglessCustomFieldName(key)) return acc;

        const value =
          typeof rawValue === "string"
            ? normalizeWhitespace(rawValue) || null
            : null;
        if (value === null) return acc;

        acc[key] = value;
        return acc;
      }, {});

      return {
        ...student,
        name: normalizeWhitespace(student.name),
        email:
          typeof student.email === "string"
            ? normalizeWhitespace(student.email) || null
            : (student.email ?? null),
        phone:
          typeof student.phone === "string"
            ? normalizeWhitespace(student.phone) || null
            : (student.phone ?? null),
        status: normalizeStatusValue(student.status ?? null),
        customFields:
          Object.keys(customFields).length > 0 ? customFields : null,
      };
    });

    const existing = cohortMap.get(normalizedName);
    if (existing) {
      existing.students.push(...normalizedStudents);
      continue;
    }

    cohortMap.set(normalizedName, {
      name: normalizedName,
      students: normalizedStudents,
    });
  }

  return { cohorts: Array.from(cohortMap.values()) };
}

function buildWorkbookLayoutSample(sheets: SheetRows[], sampleSize = 12) {
  return sheets
    .map(({ sheetName, rows }) => {
      const previewRows = rows
        .slice(0, sampleSize)
        .map(
          (row, rowIndex) =>
            `${rowIndex}: ${row.map((cell) => cell || "∅").join(" | ")}`,
        );

      return [
        `=== 시트: ${sheetName} ===`,
        `총행수: ${rows.length}`,
        ...previewRows,
      ].join("\n");
    })
    .join("\n\n");
}

async function identifyWorkbookPlanWithAI(
  sheets: SheetRows[],
): Promise<WorkbookPlan> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ServiceError(500, "OPENAI_API_KEY가 설정되지 않았습니다.");
  }

  const model =
    process.env.OPENAI_AI_IMPORT_MODEL ??
    process.env.OPENAI_AI_CHAT_MODEL ??
    "gpt-4.1-mini";

  const sampleText = buildWorkbookLayoutSample(sheets);

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
          content: `너는 다양한 형태의 XLSX 구조를 읽는 분석기다. 최종 행 데이터나 스페이스명을 창작하지 말고, 오직 워크북 구조 해석만 수행해라.

목표:
- 각 시트가 aggregate(통합표), dedicated(개별 스페이스 시트), ignore(메모/설명/잡시트) 중 무엇인지 판단
- 헤더가 시작되는 행이 여러 줄일 수 있으니 headerRows 배열로 반환
- dataStartRow는 실제 데이터가 시작되는 첫 행 인덱스
- name/email/phone/status/space 의미를 가진 컬럼 인덱스를 찾아 반환
- 명시적 값이 있으면 반드시 그 값을 source of truth로 삼게 해야 하므로, spaceColumn이 있으면 그 컬럼을 사용하고 임의 이름을 만들지 마라
- exact string match에 의존하지 말고 의미적으로 판단해라

반환 JSON 형식:
{
  "primarySource": "aggregate" | "dedicated",
  "sheets": [
    {
      "sheetName": "시트명",
      "role": "aggregate" | "dedicated" | "ignore",
      "headerRows": [0,1],
      "dataStartRow": 2,
      "nameColumn": 3,
      "emailColumn": 4 | null,
      "phoneColumn": 5 | null,
      "statusColumn": 6 | null,
      "spaceColumn": 0 | null,
      "notes": "판단 근거 또는 null"
    }
  ]
}

규칙:
- aggregate 시트에 명시적 space/cohort 컬럼이 있으면 primarySource를 aggregate로 둬라
- dedicated 시트는 시트명 자체가 스페이스명 source of truth가 될 수 있다
- spaceColumn이 없을 때만 시트명을 사용할 수 있다
- '적절한 이름' 같은 창작 금지
- 헤더가 두 줄 이상이면 합리적인 모든 헤더 행을 headerRows에 포함해라
- 중간 빈 줄/설명 줄/소계 줄은 dataStartRow 이전으로 넘기거나 ignore 처리해라`,
        },
        { role: "user", content: sampleText },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(
      502,
      `OpenAI API 호출 실패 (워크북 구조 식별): ${text}`,
    );
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const raw = data.choices[0]?.message?.content;
  if (!raw)
    throw new ServiceError(500, "AI 워크북 구조 식별 응답이 비어 있습니다.");

  const parsed = WorkbookPlanSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new ServiceError(
      500,
      `워크북 구조 검증 실패: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}

function extractStudentsFromSheet(
  sheet: SheetRows,
  plan: SheetPlan,
): ImportPreview["cohorts"] {
  const headerLabels = buildUniqueHeaderLabels(
    combineHeaderRows(sheet.rows, plan.headerRows),
  );
  const reservedColumns = new Set<number>([
    plan.nameColumn,
    ...(plan.emailColumn != null ? [plan.emailColumn] : []),
    ...(plan.phoneColumn != null ? [plan.phoneColumn] : []),
    ...(plan.statusColumn != null ? [plan.statusColumn] : []),
    ...(plan.spaceColumn != null ? [plan.spaceColumn] : []),
  ]);

  const cohortMap = new Map<string, ImportPreview["cohorts"][number]>();

  for (
    let rowIndex = plan.dataStartRow;
    rowIndex < sheet.rows.length;
    rowIndex += 1
  ) {
    const row = sheet.rows[rowIndex] ?? [];
    const name = (row[plan.nameColumn] ?? "").trim();
    if (!name) continue;

    const cohortName =
      (plan.spaceColumn != null
        ? (row[plan.spaceColumn] ?? "")
        : sheet.sheetName
      ).trim() || sheet.sheetName;

    const customFields: Record<string, string | null> = {};

    headerLabels.forEach((label, columnIndex) => {
      if (
        reservedColumns.has(columnIndex) ||
        isMeaninglessCustomFieldName(label)
      ) {
        return;
      }
      const value = (row[columnIndex] ?? "").trim() || null;
      if (value === null) return;
      customFields[label] = value;
    });

    const student = {
      name,
      email:
        plan.emailColumn != null
          ? (row[plan.emailColumn] ?? "").trim() || null
          : null,
      phone:
        plan.phoneColumn != null
          ? (row[plan.phoneColumn] ?? "").trim() || null
          : null,
      status: normalizeStatusValue(
        plan.statusColumn != null
          ? (row[plan.statusColumn] ?? "").trim() || null
          : null,
      ),
      customFields: Object.keys(customFields).length > 0 ? customFields : null,
    };

    const existingCohort = cohortMap.get(cohortName);
    if (existingCohort) {
      existingCohort.students.push(student);
      continue;
    }

    cohortMap.set(cohortName, {
      name: cohortName,
      students: [student],
    });
  }

  return Array.from(cohortMap.values());
}

async function analyzeStructuredSheets(
  sheets: SheetRows[],
  refine?: RefineContext,
  fieldHints?: FieldSchemaHint[],
): Promise<ImportPreview> {
  const workbookPlan = await identifyWorkbookPlanWithAI(sheets);

  const activePlans = workbookPlan.sheets.filter(
    (plan) => plan.role !== "ignore",
  );
  const candidatePlans = activePlans.filter(
    (plan) => plan.role === workbookPlan.primarySource,
  );
  const plansToUse = candidatePlans.length > 0 ? candidatePlans : activePlans;

  if (plansToUse.length === 0) {
    const fallbackText = buildSampleText(sheets, 40);
    return analyzeFileWithAI(fallbackText, refine, fieldHints);
  }

  const cohorts = plansToUse.flatMap((plan) => {
    const sheet = sheets.find(
      (candidate) => candidate.sheetName === plan.sheetName,
    );
    if (!sheet) return [];
    return extractStudentsFromSheet(sheet, plan);
  });

  if (cohorts.length === 0) {
    const fallbackText = buildSampleText(sheets, 40);
    return analyzeFileWithAI(fallbackText, refine, fieldHints);
  }

  const normalizedPreview = normalizeImportPreview({ cohorts });

  if (!refine) {
    return normalizedPreview;
  }

  return refineStructuredPreviewWithAI(
    normalizeImportPreview(refine.previousResult),
    sheets,
    refine,
    fieldHints,
  );
}

async function refineStructuredPreviewWithAI(
  preview: ImportPreview,
  sheets: SheetRows[],
  refine: RefineContext,
  fieldHints?: FieldSchemaHint[],
): Promise<ImportPreview> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    throw new ServiceError(500, "OPENAI_API_KEY가 설정되지 않았습니다.");

  const model =
    process.env.OPENAI_AI_IMPORT_MODEL ??
    process.env.OPENAI_AI_CHAT_MODEL ??
    "gpt-4.1-mini";

  const fieldHintSection =
    fieldHints && fieldHints.length > 0
      ? `\n가능한 커스텀 필드 후보: ${fieldHints.map((f) => `${f.name}(${f.fieldType})`).join(", ")}`
      : "";

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
          content: `너는 이미 구조화된 수강생 가져오기 미리보기를 후처리하는 편집기다.
JSON 형식으로만 반환: { "cohorts": [{ "name": "코호트명", "students": [{ "name": "이름", "email": "이메일 또는 null", "phone": "전화번호 또는 null", "status": "active|withdrawn|graduated 또는 null", "customFields": {} 또는 null }] }] }
- source of truth는 현재 미리보기 JSON이다. 사용자의 수정 요청을 이 JSON에 반영한 결과만 반환해라.
- 요청과 무관한 수강생/코호트는 임의로 추가, 삭제, 재정렬하지 마라.
- 컬럼 제거 요청이면 해당 필드를 모든 수강생에서 제거해라. 고정 필드(email/phone/status) 제거 요청이면 값을 null로 비워라.
- 컬럼명 변경 요청이면 값은 유지하고 새 이름으로 옮겨라. 고정 필드를 임의 이름으로 바꾸라는 요청이면 해당 값을 customFields의 새 키로 옮기고 원래 고정 필드는 null로 둬라.
- 값이 비어 있는 customFields 키는 남기지 마라.
- 요청을 반영할 근거가 부족하면 입력 JSON을 최대한 그대로 반환해라.${fieldHintSection}`,
        },
        {
          role: "user",
          content: `현재 미리보기 JSON:\n${JSON.stringify(preview, null, 2)}\n\n원본 파일 샘플:\n${buildSampleText(sheets, 12)}\n\n사용자 수정 요청: ${refine.instruction}`,
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

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const raw = data.choices[0]?.message?.content;
  if (!raw) throw new ServiceError(500, "AI 응답이 비어 있습니다.");

  return normalizeImportPreview(parseImportPreview(raw));
}

function getRelevantColumnIndexes(
  headerRow: string[] | undefined,
  mapping: ColumnMapping,
) {
  const indexes = new Set<number>();

  indexes.add(mapping.nameColumn);
  if (mapping.emailColumn != null) indexes.add(mapping.emailColumn);
  if (mapping.phoneColumn != null) indexes.add(mapping.phoneColumn);
  if (mapping.statusColumn != null) indexes.add(mapping.statusColumn);
  if (mapping.cohortStrategy === "by_column" && mapping.cohortColumn != null) {
    indexes.add(mapping.cohortColumn);
  }

  headerRow?.forEach((cell, index) => {
    if ((cell ?? "").trim()) {
      indexes.add(index);
    }
  });

  return Array.from(indexes).sort((a, b) => a - b);
}

function buildCustomFieldsFromRow(
  row: string[],
  headerRow: string[] | undefined,
  mapping: ColumnMapping,
): Record<string, string | null> | null {
  if (!headerRow) return null;

  const reservedColumns = new Set<number>([
    mapping.nameColumn,
    ...(mapping.emailColumn != null ? [mapping.emailColumn] : []),
    ...(mapping.phoneColumn != null ? [mapping.phoneColumn] : []),
    ...(mapping.statusColumn != null ? [mapping.statusColumn] : []),
    ...(mapping.cohortStrategy === "by_column" && mapping.cohortColumn != null
      ? [mapping.cohortColumn]
      : []),
  ]);

  const customFields: Record<string, string | null> = {};

  headerRow.forEach((headerCell, index) => {
    const fieldName = normalizeWhitespace(headerCell ?? "");
    if (
      !fieldName ||
      reservedColumns.has(index) ||
      isMeaninglessCustomFieldName(fieldName)
    ) {
      return;
    }
    const value = (row[index] ?? "").trim() || null;
    if (value === null) return;
    customFields[fieldName] = value;
  });

  return Object.keys(customFields).length > 0 ? customFields : null;
}

function buildSampleText(sheets: SheetRows[], sampleSize = 20): string {
  const parts: string[] = [];
  for (const { sheetName, rows } of sheets) {
    const sample = rows.slice(0, sampleSize + 2); // 헤더 + 여유분
    const csv = sample.map((r) => r.join(",")).join("\n");
    parts.push(`=== 시트: ${sheetName} (총 ${rows.length}행) ===\n${csv}`);
  }
  return parts.join("\n\n");
}

async function identifyColumnsWithAI(
  sampleText: string,
): Promise<ColumnMapping> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    throw new ServiceError(500, "OPENAI_API_KEY가 설정되지 않았습니다.");

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
  "cohortName": <단일 코호트일 때 compact 이름 또는 null>,
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
- 코호트 구분이 없으면 cohortStrategy: "single", cohortName은 가능하면 'N기' 같은 compact 이름으로 반환하고 근거 없으면 시트명을 유지해라`,
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

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
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
  const parts: string[] = [];
  for (const { sheetName, rows } of sheets) {
    const headerRow = rows[mapping.headerRow];
    const cols = getRelevantColumnIndexes(headerRow, mapping);
    const header = headerRow
      ? cols.map((c) => headerRow[c] ?? "").join(",")
      : "";

    const dataRows = rows
      .slice(mapping.headerRow + 1)
      .map((row) => cols.map((c) => row[c] ?? "").join(","));

    const csv = [header, ...dataRows].join("\n");
    parts.push(`=== 시트: ${sheetName} ===\n${csv}`);
  }
  return parts.join("\n\n");
}

/* ── 대용량 파일 파이프라인 ── */

const _LARGE_FILE_THRESHOLD = 100;

async function _analyzeLargeFile(
  sheets: SheetRows[],
  refine?: RefineContext,
  fieldHints?: FieldSchemaHint[],
): Promise<ImportPreview> {
  // Phase 1: 샘플로 컬럼 식별 + 추출 가능성 판단
  const sampleText = buildSampleText(sheets);
  const mapping = await identifyColumnsWithAI(sampleText);

  if (!mapping.extractable) {
    // AI가 "비정형 데이터"로 판단 → 컬럼 축소만 하고 AI가 직접 추출
    const reducedText = buildReducedText(sheets, mapping);
    return analyzeFileWithAI(reducedText, refine, fieldHints);
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
    const headerRow = rows[mapping.headerRow];
    const dataRows = rows.slice(mapping.headerRow + 1);

    for (const row of dataRows) {
      const nameRaw = row[mapping.nameColumn] ?? "";
      if (!nameRaw.trim()) continue; // 빈 행 스킵

      const student: ImportPreview["cohorts"][number]["students"][number] = {
        name: nameRaw.trim(),
        email:
          mapping.emailColumn != null
            ? (row[mapping.emailColumn] ?? "").trim() || null
            : null,
        phone:
          mapping.phoneColumn != null
            ? (row[mapping.phoneColumn] ?? "").trim() || null
            : null,
        status:
          mapping.statusColumn != null
            ? (row[mapping.statusColumn] ?? "").trim() || null
            : null,
        customFields: buildCustomFieldsFromRow(row, headerRow, mapping),
      };

      // 코호트 결정
      let cohortName: string;
      if (mapping.cohortStrategy === "by_sheet") {
        cohortName = sheetName;
      } else if (
        mapping.cohortStrategy === "by_column" &&
        mapping.cohortColumn != null
      ) {
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
        const values = rows
          .slice(mapping.headerRow + 1)
          .map((r, i) => `${i}: ${r[colIdx] ?? ""}`)
          .filter((v) => !v.endsWith(": "));
        if (values.length > 0) {
          dirtyData.push(
            `=== ${colName} (컬럼 ${colIdx}) ===\n${values.join("\n")}`,
          );
        }
      }
    }

    if (dirtyData.length > 0) {
      const cleanupResult = await analyzeFileWithAI(
        `프로그래밍 추출 결과:\n${JSON.stringify(preview, null, 2)}\n\n아래 컬럼은 데이터가 지저분해서 AI 정제가 필요합니다:\n${dirtyData.join("\n\n")}\n\n위 raw 데이터를 참고해서 추출 결과를 보정해 주세요.`,
        refine,
        fieldHints,
      );
      return normalizeImportPreview(cleanupResult);
    }
  }

  return normalizeImportPreview(preview);
}

/* ── AI 텍스트 분석 ── */

export async function analyzeFileWithAI(
  content: string,
  refine?: RefineContext,
  fieldHints?: FieldSchemaHint[],
): Promise<ImportPreview> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    throw new ServiceError(500, "OPENAI_API_KEY가 설정되지 않았습니다.");

  const model =
    process.env.OPENAI_AI_IMPORT_MODEL ??
    process.env.OPENAI_AI_CHAT_MODEL ??
    "gpt-4.1-mini";

  const fieldHintSection =
    fieldHints && fieldHints.length > 0
      ? `\n\n추가 커스텀 필드 목록 (가능하면 각 수강생에 대해 추출):
${fieldHints.map((f) => `- ${f.name} (타입: ${f.fieldType})`).join("\n")}
추출된 커스텀 필드는 각 student 객체의 "customFields" 키에 { "필드이름": "값" } 형식으로 포함해라. 값이 없으면 null.`
      : "";

  const systemPrompt = `아래 스프레드시트 데이터에서 코호트/기수 정보와 수강생 목록을 추출해라.
JSON 형식으로 반환: { "cohorts": [{ "name": "코호트명", "students": [{ "name": "이름", "email": "이메일", "phone": "전화번호", "status": "active|withdrawn|graduated", "customFields": {} }] }] }
- status 기본값은 "active"
- 이메일, 전화번호 없으면 null
- 하나의 코호트면 배열에 하나만 넣어라
- 코호트명은 장문 홍보식 이름보다 compact 이름을 우선한다. 예: '1기', '2기', 필요하면 '1기(백엔드)'
- 근거 없는 창작 이름은 금지한다${refine ? "\n- 이전 분석 결과를 참고하고 사용자 보완 요청을 반영해 개선된 결과를 반환해라" : ""}${fieldHintSection}`;

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

  return normalizeImportPreview(parseImportPreview(raw));
}

/* ── AI 이미지 분석 (Vision) ── */

export async function analyzeImageWithAI(
  base64Data: string,
  mimeType: string,
  refine?: RefineContext,
  fieldHints?: FieldSchemaHint[],
): Promise<ImportPreview> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    throw new ServiceError(500, "OPENAI_API_KEY가 설정되지 않았습니다.");

  const model =
    process.env.OPENAI_AI_VISION_MODEL ??
    process.env.OPENAI_AI_IMPORT_MODEL ??
    process.env.OPENAI_AI_CHAT_MODEL ??
    "gpt-4.1-nano";

  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const imgFieldHintSection =
    fieldHints && fieldHints.length > 0
      ? `\n추가 커스텀 필드 목록 (가능하면 추출): ${fieldHints.map((f) => `${f.name}(${f.fieldType})`).join(", ")}\n추출된 커스텀 필드는 "customFields": { "필드이름": "값" } 으로 포함해라.`
      : "";

  const basePrompt = `이 이미지에서 수강생 목록을 추출해라.
JSON 형식으로만 반환: { "cohorts": [{ "name": "코호트명", "students": [{ "name": "이름", "email": "이메일 또는 null", "phone": "전화번호 또는 null", "status": "active", "customFields": {} }] }] }
- status 기본값은 "active"
- 이메일, 전화번호 없으면 null
- 수강생 정보가 없으면 cohorts를 빈 배열로 반환
- 이름을 명확히 식별할 수 없는 데이터는 포함하지 마라
- 코호트명은 가능하면 '1기', '2기', 필요하면 '1기(백엔드)'처럼 compact하게 반환해라${imgFieldHintSection}`;

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

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const raw = data.choices[0]?.message?.content;
  if (!raw) throw new ServiceError(500, "AI 응답이 비어 있습니다.");

  return normalizeImportPreview(parseImportPreview(raw));
}

/* ── PDF → 텍스트 변환 ── */

async function parsePdfToText(buffer: Buffer): Promise<string> {
  // pdf-parse v1 은 CommonJS default export
  const pdfParse = (await import("pdf-parse")).default as (
    buf: Buffer,
  ) => Promise<{ text: string }>;
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
      return analyzeStructuredSheets(sheets, refine, fieldHints);
    }
    case "csv":
    case "txt": {
      const text = buffer.toString("utf-8");
      const sheets = parseCsvToRows(text);
      return analyzeStructuredSheets(sheets, refine, fieldHints);
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
      return analyzeImageWithAI(
        base64,
        mimeType || "image/png",
        refine,
        fieldHints,
      );
    }
    default:
      throw new ServiceError(400, "분석을 지원하지 않는 파일 형식입니다.");
  }
}
