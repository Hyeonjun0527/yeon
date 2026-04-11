import { and, asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/server/db";
import {
  memberFieldDefinitions,
  memberFieldValues,
  memberTabDefinitions,
  members,
  sheetIntegrations,
} from "@/server/db/schema";

import { getValidAccessToken } from "./googledrive-service";
import { ServiceError } from "./service-error";

const SHEETS_URL = "https://sheets.googleapis.com/v4/spreadsheets";

const STATUS_LABEL: Record<string, string> = {
  active: "수강중",
  withdrawn: "중도포기",
  graduated: "수료",
};

const RISK_LABEL: Record<string, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

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

function formatDate(value: Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatFieldValue(
  fieldType: string,
  row: {
    valueText: string | null;
    valueNumber: string | null;
    valueBoolean: boolean | null;
    valueJson: unknown;
  },
): string {
  switch (fieldType) {
    case "number":
      return row.valueNumber ?? "";
    case "checkbox":
      if (row.valueBoolean === null) return "";
      return row.valueBoolean ? "예" : "아니오";
    case "select": {
      const v = row.valueJson;
      if (typeof v === "string") return v;
      return v == null ? "" : String(v);
    }
    case "multi_select": {
      const v = row.valueJson;
      if (Array.isArray(v)) return v.map((item) => String(item)).join(", ");
      return v == null ? "" : String(v);
    }
    default:
      return row.valueText ?? "";
  }
}

async function clearSheet(
  accessToken: string,
  sheetId: string,
): Promise<void> {
  const res = await fetch(
    `${SHEETS_URL}/${encodeURIComponent(sheetId)}/values/A1:ZZ10000:clear`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(
      502,
      `구글 시트 초기화에 실패했습니다: ${text || res.status}`,
    );
  }
}

async function writeSheetValues(
  accessToken: string,
  sheetId: string,
  values: string[][],
): Promise<void> {
  const params = new URLSearchParams({ valueInputOption: "RAW" });
  const res = await fetch(
    `${SHEETS_URL}/${encodeURIComponent(sheetId)}/values/A1?${params.toString()}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(
      502,
      `구글 시트 쓰기에 실패했습니다: ${text || res.status}`,
    );
  }
}

export async function exportSpaceToSheet(
  spaceId: string,
  sheetId: string,
  userId: string,
): Promise<{ exported: number; lastSyncedAt: Date }> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    throw new ServiceError(
      401,
      "Google 계정이 연결되어 있지 않습니다. 먼저 Google 계정을 연결해주세요.",
    );
  }

  const db = getDb();

  /* 1) 스페이스 수강생 목록 */
  const memberRows = await db
    .select()
    .from(members)
    .where(eq(members.spaceId, spaceId))
    .orderBy(asc(members.createdAt));

  /* 2) 커스텀 필드 정의 조회 (tab displayOrder → field displayOrder) */
  const fieldDefRows = await db
    .select({
      id: memberFieldDefinitions.id,
      name: memberFieldDefinitions.name,
      fieldType: memberFieldDefinitions.fieldType,
      tabDisplayOrder: memberTabDefinitions.displayOrder,
      fieldDisplayOrder: memberFieldDefinitions.displayOrder,
    })
    .from(memberFieldDefinitions)
    .innerJoin(
      memberTabDefinitions,
      eq(memberFieldDefinitions.tabId, memberTabDefinitions.id),
    )
    .where(eq(memberFieldDefinitions.spaceId, spaceId))
    .orderBy(
      asc(memberTabDefinitions.displayOrder),
      asc(memberFieldDefinitions.displayOrder),
    );

  /* 3) 필드 값 일괄 조회 */
  const memberIds = memberRows.map((m) => m.id);
  const fieldDefIds = fieldDefRows.map((f) => f.id);

  const valueRows =
    memberIds.length > 0 && fieldDefIds.length > 0
      ? await db
          .select({
            memberId: memberFieldValues.memberId,
            fieldDefinitionId: memberFieldValues.fieldDefinitionId,
            valueText: memberFieldValues.valueText,
            valueNumber: memberFieldValues.valueNumber,
            valueBoolean: memberFieldValues.valueBoolean,
            valueJson: memberFieldValues.valueJson,
          })
          .from(memberFieldValues)
          .where(
            and(
              inArray(memberFieldValues.memberId, memberIds),
              inArray(memberFieldValues.fieldDefinitionId, fieldDefIds),
            ),
          )
      : [];

  const valueIndex = new Map<string, (typeof valueRows)[number]>();
  for (const row of valueRows) {
    valueIndex.set(`${row.memberId}:${row.fieldDefinitionId}`, row);
  }

  /* 4) 행 구성 */
  const header = [
    "이름",
    "이메일",
    "전화번호",
    "수강 상태",
    "위험도",
    "등록일",
    ...fieldDefRows.map((f) => f.name),
  ];

  const dataRows: string[][] = memberRows.map((member) => {
    const base = [
      member.name,
      member.email ?? "",
      member.phone ?? "",
      STATUS_LABEL[member.status] ?? member.status,
      member.initialRiskLevel
        ? (RISK_LABEL[member.initialRiskLevel] ?? member.initialRiskLevel)
        : "",
      formatDate(member.createdAt),
    ];

    const fieldCells = fieldDefRows.map((field) => {
      const row = valueIndex.get(`${member.id}:${field.id}`);
      if (!row) return "";
      return formatFieldValue(field.fieldType, row);
    });

    return [...base, ...fieldCells];
  });

  const values = [header, ...dataRows];

  /* 5) 시트 clear → write */
  await clearSheet(accessToken, sheetId);
  await writeSheetValues(accessToken, sheetId, values);

  /* 6) lastSyncedAt 갱신 */
  const now = new Date();
  await db
    .update(sheetIntegrations)
    .set({ lastSyncedAt: now, updatedAt: now })
    .where(
      and(
        eq(sheetIntegrations.spaceId, spaceId),
        eq(sheetIntegrations.sheetId, sheetId),
        eq(sheetIntegrations.dataType, "export"),
      ),
    );

  return { exported: memberRows.length, lastSyncedAt: now };
}
