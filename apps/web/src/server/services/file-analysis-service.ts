import { ServiceError } from "./service-error";
import { analyzeFileWithAI, parseExcelToText } from "./onedrive-service";
import type { ImportPreview, RefineContext } from "./onedrive-service";
import type { FileKind } from "@/features/cloud-import/file-kind";

export type { ImportPreview, RefineContext };

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

  const basePrompt = `이 이미지에서 수강생/학생 목록을 추출해라.
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
            {
              type: "text",
              text: textPrompt,
            },
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

  try {
    return JSON.parse(raw) as ImportPreview;
  } catch {
    throw new ServiceError(500, "AI 응답 JSON 파싱 실패");
  }
}

async function parsePdfToText(buffer: Buffer): Promise<string> {
  // pdf-parse v1 은 CommonJS default export
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return result.text;
}

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
