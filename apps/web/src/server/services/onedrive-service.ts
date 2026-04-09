import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";

import { getDb } from "@/server/db";
import { onedriveTokens } from "@/server/db/schema";

import { ServiceError } from "./service-error";

/* ── Microsoft OAuth 설정 ── */

const AUTH_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_URL = "https://graph.microsoft.com/v1.0";
const SCOPES = ["Files.ReadWrite.All", "offline_access", "User.Read"].join(" ");

function getClientId(): string {
  const id = process.env.MICROSOFT_CLIENT_ID;
  if (!id) throw new ServiceError(500, "MICROSOFT_CLIENT_ID가 설정되지 않았습니다.");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!secret)
    throw new ServiceError(500, "MICROSOFT_CLIENT_SECRET가 설정되지 않았습니다.");
  return secret;
}

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/api/v1/integrations/onedrive/auth/callback`;
}

/* ── OAuth URL 생성 ── */

export function getOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    state,
    response_mode: "query",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/* ── 코드 → 토큰 교환 ── */

export async function exchangeCode(
  code: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    code,
    redirect_uri: getRedirectUri(),
    grant_type: "authorization_code",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(502, `Microsoft 토큰 교환 실패: ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/* ── 토큰 갱신 ── */

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: SCOPES,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(502, `Microsoft 토큰 갱신 실패: ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/* ── DB 토큰 저장 ── */

export async function saveTokens(
  userId: string,
  tokens: { accessToken: string; refreshToken: string; expiresAt: Date },
): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db
    .insert(onedriveTokens)
    .values({
      userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: onedriveTokens.userId,
      set: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        updatedAt: now,
      },
    });
}

/* ── DB에서 유효한 토큰 가져오기 (만료 시 자동 갱신) ── */

export async function getValidAccessToken(
  userId: string,
): Promise<string | null> {
  const db = getDb();

  const [row] = await db
    .select()
    .from(onedriveTokens)
    .where(eq(onedriveTokens.userId, userId))
    .limit(1);

  if (!row) return null;

  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (row.expiresAt > fiveMinutesFromNow) {
    return row.accessToken;
  }

  const refreshed = await refreshAccessToken(row.refreshToken);
  await saveTokens(userId, refreshed);
  return refreshed.accessToken;
}

/* ── 연결 여부 확인 ── */

export async function isConnected(userId: string): Promise<boolean> {
  const db = getDb();

  const [row] = await db
    .select({ id: onedriveTokens.id })
    .from(onedriveTokens)
    .where(eq(onedriveTokens.userId, userId))
    .limit(1);

  return !!row;
}

/* ── OneDrive 파일 목록 ── */

export interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  lastModifiedAt: string;
  mimeType?: string;
}

export async function listFiles(
  accessToken: string,
  folderId?: string,
): Promise<OneDriveFile[]> {
  const endpoint = folderId
    ? `${GRAPH_URL}/me/drive/items/${folderId}/children`
    : `${GRAPH_URL}/me/drive/root/children`;

  const res = await fetch(
    `${endpoint}?$select=id,name,size,lastModifiedDateTime,file&$top=200`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    throw new ServiceError(502, "OneDrive 파일 목록 조회 실패");
  }

  const data = (await res.json()) as {
    value: Array<{
      id: string;
      name: string;
      size: number;
      lastModifiedDateTime: string;
      file?: { mimeType: string };
    }>;
  };

  return data.value.map((item) => ({
    id: item.id,
    name: item.name,
    size: item.size,
    lastModifiedAt: item.lastModifiedDateTime,
    mimeType: item.file?.mimeType,
  }));
}

/* ── 파일 다운로드 ── */

export async function downloadFile(
  accessToken: string,
  fileId: string,
): Promise<Buffer> {
  const res = await fetch(
    `${GRAPH_URL}/me/drive/items/${fileId}/content`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    throw new ServiceError(502, "OneDrive 파일 다운로드 실패");
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
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

/* ── AI 분석 ── */

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

export async function analyzeFileWithAI(
  content: string,
): Promise<ImportPreview> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ServiceError(500, "OPENAI_API_KEY가 설정되지 않았습니다.");
  }

  const model = process.env.OPENAI_AI_CHAT_MODEL ?? "gpt-4o-mini";

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
          content: `아래 스프레드시트 데이터에서 코호트/기수 정보와 수강생 목록을 추출해라.
JSON 형식으로 반환: { "cohorts": [{ "name": "코호트명", "students": [{ "name": "이름", "email": "이메일", "phone": "전화번호", "status": "active|withdrawn|graduated" }] }] }
- status 기본값은 "active"
- 이메일, 전화번호 없으면 null
- 하나의 코호트면 배열에 하나만 넣어라`,
        },
        { role: "user", content },
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
  if (!raw) {
    throw new ServiceError(500, "AI 응답이 비어 있습니다.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ServiceError(500, "AI 응답 JSON 파싱 실패");
  }

  return parsed as ImportPreview;
}
