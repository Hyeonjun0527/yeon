import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getMemberById } from "@/server/services/members-service";
import { ServiceError } from "@/server/services/service-error";
import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";

export const runtime = "nodejs";

const OPENAI_CHAT_COMPLETIONS_URL =
  "https://api.openai.com/v1/chat/completions";
const AI_MODEL = "gpt-4.1-mini";
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

/* ── AI가 추출할 프로필 제안 타입 ── */
export interface ProfileSuggestions {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: "active" | "withdrawn" | "graduated" | null;
  initialRiskLevel?: "low" | "medium" | "high" | null;
  confidence: Record<string, "high" | "medium" | "low">;
  rawContext?: string;
}

async function extractTextFromFile(file: File): Promise<string> {
  const text = await file.text();
  // 최대 8000자로 잘라서 AI 토큰 낭비 방지
  return text.slice(0, 8000);
}

async function analyzeProfileFromText(
  fileText: string,
  currentMember: { name: string; email?: string | null; phone?: string | null },
): Promise<ProfileSuggestions> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ServiceError(500, "AI 서비스가 설정되지 않았습니다.");
  }

  const systemPrompt = `당신은 교육 프로그램 수강생 정보를 파일에서 추출하는 AI입니다.
주어진 파일 내용을 분석하여 수강생 프로필 필드를 JSON으로 반환하세요.

추출할 필드:
- name: 수강생 이름 (한국어 또는 영어)
- email: 이메일 주소
- phone: 전화번호 (숫자와 하이픈만, 예: 010-1234-5678)
- status: 수강 상태 ("active"=수강중, "withdrawn"=중도포기, "graduated"=수료)
- initialRiskLevel: 위험도 ("low"=낮음, "medium"=보통, "high"=높음)

현재 수강생 이름: ${currentMember.name}
파일에서 이 수강생과 관련된 정보를 우선적으로 찾으세요.

반환 형식 (JSON만 반환, 다른 텍스트 없음):
{
  "name": "이름 또는 null",
  "email": "이메일 또는 null",
  "phone": "전화번호 또는 null",
  "status": "active/withdrawn/graduated 또는 null",
  "initialRiskLevel": "low/medium/high 또는 null",
  "confidence": {
    "name": "high/medium/low",
    "email": "high/medium/low",
    "phone": "high/medium/low",
    "status": "high/medium/low",
    "initialRiskLevel": "high/medium/low"
  },
  "rawContext": "추출 근거가 된 원문 (최대 200자)"
}

찾을 수 없는 필드는 null로 설정하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요.`;

  const userPrompt = `다음 파일 내용에서 수강생 프로필을 추출해주세요:\n\n${fileText}`;

  const res = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    throw new ServiceError(502, "AI 분석 요청에 실패했습니다.");
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };

  const raw = data.choices?.[0]?.message?.content?.trim() ?? "";

  try {
    const parsed = JSON.parse(raw) as ProfileSuggestions;
    return parsed;
  } catch {
    throw new ServiceError(502, "AI 응답을 파싱하지 못했습니다.");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; memberId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { memberId } = await params;

  /* ── 멤버 존재 확인 ── */
  let member: Awaited<ReturnType<typeof getMemberById>>;
  try {
    member = await getMemberById(memberId);
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    return jsonError("수강생 정보를 불러오지 못했습니다.", 500);
  }

  /* ── 파일 파싱 ── */
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("파일을 읽지 못했습니다.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("파일이 포함되지 않았습니다.", 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonError("파일 크기는 1MB 이하여야 합니다.", 400);
  }

  const supportedTypes = [
    "text/csv",
    "text/plain",
    "application/csv",
    "text/tab-separated-values",
  ];
  const isSupported =
    supportedTypes.includes(file.type) ||
    file.name.endsWith(".csv") ||
    file.name.endsWith(".txt") ||
    file.name.endsWith(".tsv");

  if (!isSupported) {
    return jsonError("CSV 또는 텍스트 파일만 지원합니다.", 400);
  }

  /* ── 텍스트 추출 ── */
  let fileText: string;
  try {
    fileText = await extractTextFromFile(file);
  } catch {
    return jsonError("파일 내용을 읽지 못했습니다.", 400);
  }

  if (!fileText.trim()) {
    return jsonError("파일이 비어 있습니다.", 400);
  }

  /* ── AI 분석 ── */
  try {
    const suggestions = await analyzeProfileFromText(fileText, {
      name: member.name,
      email: member.email,
      phone: member.phone,
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("AI 분석에 실패했습니다.", 500);
  }
}
