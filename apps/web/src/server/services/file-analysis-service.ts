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

export interface ImportPreview {
  cohorts: Array<{
    name: string;
    students: Array<{
      name: string;
      email?: string | null;
      phone?: string | null;
      status?: string | null;
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

/* ── AI 텍스트 분석 ── */

export async function analyzeFileWithAI(
  content: string,
  refine?: RefineContext,
): Promise<ImportPreview> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ServiceError(500, "OPENAI_API_KEY가 설정되지 않았습니다.");

  const model =
    process.env.OPENAI_AI_IMPORT_MODEL ??
    process.env.OPENAI_AI_CHAT_MODEL ??
    "gpt-4.1-mini";

  const systemPrompt = `아래 스프레드시트 데이터에서 코호트/기수 정보와 수강생 목록을 추출해라.
JSON 형식으로 반환: { "cohorts": [{ "name": "코호트명", "students": [{ "name": "이름", "email": "이메일", "phone": "전화번호", "status": "active|withdrawn|graduated" }] }] }
- status 기본값은 "active"
- 이메일, 전화번호 없으면 null
- 하나의 코호트면 배열에 하나만 넣어라${refine ? "\n- 이전 분석 결과를 참고하고 사용자 보완 요청을 반영해 개선된 결과를 반환해라" : ""}`;

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
): Promise<ImportPreview> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ServiceError(500, "OPENAI_API_KEY가 설정되지 않았습니다.");

  const model =
    process.env.OPENAI_AI_VISION_MODEL ??
    process.env.OPENAI_AI_IMPORT_MODEL ??
    process.env.OPENAI_AI_CHAT_MODEL ??
    "gpt-4.1-nano";

  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const basePrompt = `이 이미지에서 수강생 목록을 추출해라.
JSON 형식으로만 반환: { "cohorts": [{ "name": "코호트명", "students": [{ "name": "이름", "email": "이메일 또는 null", "phone": "전화번호 또는 null", "status": "active" }] }] }
- status 기본값은 "active"
- 이메일, 전화번호 없으면 null
- 수강생 정보가 없으면 cohorts를 빈 배열로 반환
- 이름을 명확히 식별할 수 없는 데이터는 포함하지 마라`;

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
): Promise<ImportPreview> {
  switch (kind) {
    case "spreadsheet": {
      const text = parseExcelToText(buffer);
      return analyzeFileWithAI(text, refine);
    }
    case "csv":
    case "txt": {
      const text = buffer.toString("utf-8");
      return analyzeFileWithAI(text, refine);
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
      return analyzeFileWithAI(text, refine);
    }
    case "image": {
      const base64 = buffer.toString("base64");
      return analyzeImageWithAI(base64, mimeType || "image/png", refine);
    }
    default:
      throw new ServiceError(400, "분석을 지원하지 않는 파일 형식입니다.");
  }
}
