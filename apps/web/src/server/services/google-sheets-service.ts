import { google } from "googleapis";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { activityLogs, members, sheetIntegrations } from "@/server/db/schema";

import { ServiceError } from "./service-error";

export type SheetIntegration = typeof sheetIntegrations.$inferSelect;

type ColumnMapping = {
  nameColumn?: number;
  dateColumn?: number;
  statusColumn?: number;
  typeColumn?: number;
};

function getServiceAccountKey(): object {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!raw) {
    throw new ServiceError(
      500,
      "GOOGLE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다. 서비스 계정 JSON을 환경변수로 등록해 주세요.",
    );
  }

  try {
    return JSON.parse(raw) as object;
  } catch {
    throw new ServiceError(
      500,
      "GOOGLE_SERVICE_ACCOUNT_KEY 환경변수가 올바른 JSON 형식이 아닙니다.",
    );
  }
}

export function extractSheetId(sheetUrl: string): string {
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);

  if (!match || !match[1]) {
    throw new ServiceError(
      400,
      "구글 시트 URL에서 시트 ID를 추출하지 못했습니다. URL 형식을 확인해 주세요.",
    );
  }

  return match[1];
}

export async function fetchSheetData(
  sheetId: string,
  range = "A1:Z1000",
): Promise<string[][]> {
  const credentials = getServiceAccountKey();

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const rows = response.data.values;

  if (!rows || rows.length === 0) {
    return [];
  }

  return rows.map((row: unknown[]) =>
    row.map((cell: unknown) => (cell != null ? String(cell) : "")),
  );
}

export async function syncSheetToActivityLogs(
  integration: SheetIntegration,
): Promise<{ synced: number; errors: number }> {
  const db = getDb();

  const rows = await fetchSheetData(integration.sheetId);

  if (rows.length === 0) {
    return { synced: 0, errors: 0 };
  }

  const mapping: ColumnMapping =
    (integration.columnMapping as ColumnMapping) ?? {};

  const nameColIdx = mapping.nameColumn ?? 0;
  const dateColIdx = mapping.dateColumn ?? 1;
  const statusColIdx = mapping.statusColumn ?? 2;
  const typeColIdx = mapping.typeColumn ?? null;

  // 헤더 행 건너뜀 (첫 번째 행)
  const dataRows = rows.slice(1);

  let synced = 0;
  let errors = 0;

  for (const row of dataRows) {
    const memberName = row[nameColIdx]?.trim();
    const dateValue = row[dateColIdx]?.trim();
    const statusValue = row[statusColIdx]?.trim() || null;
    const typeValue =
      typeColIdx !== null ? row[typeColIdx]?.trim() : integration.dataType;

    if (!memberName || !dateValue) {
      errors++;
      continue;
    }

    const recordedAt = new Date(dateValue);

    if (isNaN(recordedAt.getTime())) {
      errors++;
      continue;
    }

    // members 테이블에서 이름으로 memberId 조회
    const [member] = await db
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.spaceId, integration.spaceId),
          eq(members.name, memberName),
        ),
      )
      .limit(1);

    if (!member) {
      errors++;
      continue;
    }

    const logType = typeValue || "attendance";

    // 중복 확인: 같은 memberId + recordedAt + type이면 건너뜀
    const [existing] = await db
      .select({ id: activityLogs.id })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.memberId, member.id),
          eq(activityLogs.recordedAt, recordedAt),
          eq(activityLogs.type, logType),
        ),
      )
      .limit(1);

    if (existing) {
      continue;
    }

    await db.insert(activityLogs).values({
      memberId: member.id,
      spaceId: integration.spaceId,
      type: logType,
      status: statusValue,
      recordedAt,
      source: "google_sheet",
    });

    synced++;
  }

  // lastSyncedAt 업데이트
  await db
    .update(sheetIntegrations)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(sheetIntegrations.id, integration.id));

  return { synced, errors };
}
