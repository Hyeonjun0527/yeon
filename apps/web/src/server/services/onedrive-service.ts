import { eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { onedriveTokens } from "@/server/db/schema";

import { ServiceError } from "./service-error";

/* ── Microsoft OAuth 설정 ── */

const AUTH_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_URL = "https://graph.microsoft.com/v1.0";
const SCOPES = ["Files.ReadWrite.All", "offline_access", "User.Read"].join(" ");

function getClientId(): string {
  const id = process.env.MICROSOFT_CLIENT_ID;
  if (!id)
    throw new ServiceError(500, "MICROSOFT_CLIENT_ID가 설정되지 않았습니다.");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!secret)
    throw new ServiceError(
      500,
      "MICROSOFT_CLIENT_SECRET가 설정되지 않았습니다.",
    );
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

export async function exchangeCode(code: string): Promise<{
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
    if (res.status === 403 || res.status === 401) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: { code?: string };
      };
      if (body.error?.code === "accessDenied") {
        throw new ServiceError(
          403,
          "이 폴더는 Personal Vault로 보호되어 있어 접근할 수 없습니다. OneDrive 앱에서 직접 잠금을 해제한 뒤 다시 시도해 주세요.",
        );
      }
      throw new ServiceError(
        403,
        "OneDrive 접근 권한이 없습니다. 다시 연결해 주세요.",
      );
    }
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
  const res = await fetch(`${GRAPH_URL}/me/drive/items/${fileId}/content`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new ServiceError(502, "OneDrive 파일 다운로드 실패");
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
