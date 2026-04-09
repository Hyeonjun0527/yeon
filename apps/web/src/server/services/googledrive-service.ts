import { eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { googledriveTokens } from "@/server/db/schema";
import { ServiceError } from "./service-error";
import { analyzeFileWithAI, parseExcelToText } from "./onedrive-service";

export { analyzeFileWithAI, parseExcelToText };
export type { ImportPreview } from "./onedrive-service";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_URL = "https://www.googleapis.com/drive/v3";
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";

function getClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new ServiceError(500, "GOOGLE_CLIENT_ID가 설정되지 않았습니다.");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new ServiceError(500, "GOOGLE_CLIENT_SECRET가 설정되지 않았습니다.");
  return secret;
}

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/api/v1/integrations/googledrive/auth/callback`;
}

export function getOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SCOPE,
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

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
    throw new ServiceError(502, `Google 토큰 교환 실패: ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  if (!data.refresh_token) {
    throw new ServiceError(502, "Google refresh token을 받지 못했습니다. 다시 연결해주세요.");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(502, `Google 토큰 갱신 실패: ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function saveTokens(
  userId: string,
  tokens: { accessToken: string; refreshToken: string; expiresAt: Date },
): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db
    .insert(googledriveTokens)
    .values({
      userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: googledriveTokens.userId,
      set: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        updatedAt: now,
      },
    });
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const db = getDb();

  const [row] = await db
    .select()
    .from(googledriveTokens)
    .where(eq(googledriveTokens.userId, userId))
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

export async function isConnected(userId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: googledriveTokens.id })
    .from(googledriveTokens)
    .where(eq(googledriveTokens.userId, userId))
    .limit(1);
  return !!row;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  size: number;
  lastModifiedAt: string;
  mimeType: string;
}

export async function listFiles(
  accessToken: string,
  folderId?: string,
): Promise<GoogleDriveFile[]> {
  const parent = folderId ? `'${folderId}' in parents` : "'root' in parents";
  const mimeFilter =
    "(mimeType='application/vnd.google-apps.folder'" +
    " or mimeType='application/vnd.google-apps.spreadsheet'" +
    " or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'" +
    " or mimeType='application/vnd.ms-excel')";
  const q = `${mimeFilter} and ${parent} and trashed=false`;

  const params = new URLSearchParams({
    q,
    fields: "files(id,name,size,modifiedTime,mimeType)",
    pageSize: "200",
    orderBy: "folder,name",
  });

  const res = await fetch(`${DRIVE_URL}/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new ServiceError(502, "Google Drive 파일 목록 조회 실패");
  }

  const data = (await res.json()) as {
    files: Array<{
      id: string;
      name: string;
      size?: string;
      modifiedTime: string;
      mimeType: string;
    }>;
  };

  return data.files.map((f) => ({
    id: f.id,
    name: f.name,
    size: f.size ? parseInt(f.size, 10) : 0,
    lastModifiedAt: f.modifiedTime,
    mimeType: f.mimeType,
  }));
}

export async function downloadFile(
  accessToken: string,
  fileId: string,
  mimeType: string,
): Promise<Buffer> {
  const isGoogleSheet = mimeType === "application/vnd.google-apps.spreadsheet";

  const url = isGoogleSheet
    ? `${DRIVE_URL}/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
    : `${DRIVE_URL}/files/${fileId}?alt=media`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new ServiceError(502, "Google Drive 파일 다운로드 실패");
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
