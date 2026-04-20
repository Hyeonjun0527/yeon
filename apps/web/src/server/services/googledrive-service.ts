import { eq } from "drizzle-orm";

import { resolveApiHrefForBasePath } from "@/lib/app-route-paths";
import { DEFAULT_PLATFORM_SERVICE_HREF } from "@/lib/platform-services";
import { getDb } from "@/server/db";
import { googledriveTokens } from "@/server/db/schema";
import { ServiceError } from "./service-error";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const DRIVE_URL = "https://www.googleapis.com/drive/v3";

const GOOGLE_DRIVE_READONLY_SCOPE =
  "https://www.googleapis.com/auth/drive.readonly";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const GOOGLE_DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const OAUTH_SCOPES = [
  GOOGLE_DRIVE_READONLY_SCOPE,
  GOOGLE_SHEETS_SCOPE,
] as const;
const SHEETS_REQUIRED_SCOPES = [
  GOOGLE_SHEETS_SCOPE,
  GOOGLE_DRIVE_FILE_SCOPE,
  GOOGLE_DRIVE_SCOPE,
] as const;
const SCOPE = OAUTH_SCOPES.join(" ");

type GoogleDriveTokenRow = typeof googledriveTokens.$inferSelect;

function parseScopeSet(scopeText: string | undefined): Set<string> {
  return new Set(
    (scopeText ?? "")
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter(Boolean),
  );
}

function hasAnyRequiredScope(
  grantedScopes: Set<string>,
  requiredScopes: readonly string[],
): boolean {
  return requiredScopes.some((scope) => grantedScopes.has(scope));
}

async function getSavedTokenRow(
  userId: string,
): Promise<GoogleDriveTokenRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(googledriveTokens)
    .where(eq(googledriveTokens.userId, userId))
    .limit(1);

  return row ?? null;
}

async function fetchGrantedScopes(accessToken: string): Promise<Set<string>> {
  const params = new URLSearchParams({ access_token: accessToken });
  const res = await fetch(`${TOKEN_INFO_URL}?${params.toString()}`);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(
      502,
      `Google 권한 범위를 확인하지 못했습니다: ${text || res.status}`,
    );
  }

  const data = (await res.json()) as { scope?: string };
  return parseScopeSet(data.scope);
}

function getClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id)
    throw new ServiceError(500, "GOOGLE_CLIENT_ID가 설정되지 않았습니다.");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret)
    throw new ServiceError(500, "GOOGLE_CLIENT_SECRET가 설정되지 않았습니다.");
  return secret;
}

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const callbackPath = resolveApiHrefForBasePath(
    DEFAULT_PLATFORM_SERVICE_HREF,
    "/api/v1/integrations/googledrive/auth/callback",
  );

  return new URL(callbackPath, base).toString();
}

export function getOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SCOPE,
    state,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}>;
export async function exchangeCode(
  code: string,
  existingRefreshToken: string | null,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}>;
export async function exchangeCode(
  code: string,
  existingRefreshToken: string | null = null,
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
    throw new ServiceError(502, `Google 토큰 교환 실패: ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  if (!data.refresh_token && !existingRefreshToken) {
    // prompt=consent + access_type=offline 사용 중에도 refresh_token이 없으면
    // 이전에 연동했던 권한을 Google 계정에서 직접 제거 후 재시도 필요
    // 참고: https://developers.google.com/identity/protocols/oauth2/web-server#offline
    throw new ServiceError(
      502,
      "Google이 refresh_token을 반환하지 않았습니다. Google 계정 > 보안 > 타사 앱 접근에서 이 앱의 접근 권한을 제거한 뒤 다시 연결해주세요.",
    );
  }

  const refreshToken = data.refresh_token ?? existingRefreshToken;
  if (!refreshToken) {
    throw new ServiceError(
      502,
      "Google refresh token을 확인하지 못했습니다. 다시 연결해주세요.",
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken,
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

export async function getSavedRefreshToken(
  userId: string,
): Promise<string | null> {
  const row = await getSavedTokenRow(userId);
  return row?.refreshToken ?? null;
}

export async function getValidAccessToken(
  userId: string,
): Promise<string | null> {
  const row = await getSavedTokenRow(userId);

  if (!row) return null;

  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (row.expiresAt > fiveMinutesFromNow) {
    return row.accessToken;
  }

  const refreshed = await refreshAccessToken(row.refreshToken);
  await saveTokens(userId, refreshed);
  return refreshed.accessToken;
}

export async function hasGoogleSheetsAccess(userId: string): Promise<boolean> {
  const accessToken = await getValidAccessToken(userId);

  if (!accessToken) {
    return false;
  }

  const grantedScopes = await fetchGrantedScopes(accessToken);
  return hasAnyRequiredScope(grantedScopes, SHEETS_REQUIRED_SCOPES);
}

export async function getValidSheetsAccessToken(
  userId: string,
): Promise<string | null> {
  const accessToken = await getValidAccessToken(userId);

  if (!accessToken) {
    return null;
  }

  const grantedScopes = await fetchGrantedScopes(accessToken);
  if (hasAnyRequiredScope(grantedScopes, SHEETS_REQUIRED_SCOPES)) {
    return accessToken;
  }

  throw new ServiceError(
    401,
    "Google Sheets 권한이 부족합니다. Google 계정을 다시 연결한 뒤 다시 시도해주세요.",
  );
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
  const q = `${parent} and trashed=false`;

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
