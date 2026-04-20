import { and, asc, eq, inArray } from "drizzle-orm";
import { createHash } from "node:crypto";

import { getDb } from "@/server/db";
import {
  memberFieldDefinitions,
  memberFieldValues,
  memberTabDefinitions,
  members,
  sheetIntegrationMemberSnapshots,
  sheetIntegrations,
} from "@/server/db/schema";
import { generatePublicId, ID_PREFIX } from "@/server/lib/public-id";

import {
  bulkUpsertFieldValues,
  getFieldValuesForDefinitions,
} from "./member-field-values-service";
import { createMember, updateMember } from "./members-service";
import { getValidSheetsAccessToken } from "./googledrive-service";
import { ServiceError } from "./service-error";
import { requireSpaceInternalIdByPublicId } from "./spaces-service";

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

const STATUS_CODE_BY_LABEL: Record<string, string> = {
  수강중: "active",
  active: "active",
  중도포기: "withdrawn",
  withdrawn: "withdrawn",
  수료: "graduated",
  graduated: "graduated",
};

const RISK_CODE_BY_LABEL: Record<string, string> = {
  낮음: "low",
  low: "low",
  보통: "medium",
  medium: "medium",
  높음: "high",
  high: "high",
};

function formatGoogleSheetsApiError(rawText: string, actionLabel: string) {
  try {
    const parsed = JSON.parse(rawText) as {
      error?: {
        message?: string;
        details?: Array<{
          "@type"?: string;
          reason?: string;
          metadata?: {
            consumer?: string;
            activationUrl?: string;
            serviceTitle?: string;
          };
        }>;
      };
    };

    const serviceDisabled = parsed.error?.details?.find(
      (detail) => detail.reason === "SERVICE_DISABLED",
    );

    if (serviceDisabled) {
      const project =
        serviceDisabled.metadata?.consumer ?? "현재 Google Cloud 프로젝트";
      const activationUrl = serviceDisabled.metadata?.activationUrl;
      const serviceTitle =
        serviceDisabled.metadata?.serviceTitle ?? "Google Sheets API";

      return [
        `${serviceTitle}가 비활성화되어 있어 ${actionLabel}을 진행할 수 없습니다.`,
        `${project}에서 ${serviceTitle}를 활성화한 뒤 몇 분 후 다시 시도해주세요.`,
        activationUrl ? `활성화 링크: ${activationUrl}` : null,
      ]
        .filter(Boolean)
        .join(" ");
    }

    if (parsed.error?.message) {
      return `${actionLabel}에 실패했습니다: ${parsed.error.message}`;
    }
  } catch {
    // raw text fallback
  }

  return `${actionLabel}에 실패했습니다: ${rawText}`;
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

async function clearSheet(accessToken: string, sheetId: string): Promise<void> {
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
      formatGoogleSheetsApiError(
        text || String(res.status),
        "구글 시트 초기화",
      ),
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
      formatGoogleSheetsApiError(text || String(res.status), "구글 시트 쓰기"),
    );
  }
}

async function readSheetValues(
  accessToken: string,
  sheetId: string,
  range = "A1:ZZ10000",
): Promise<string[][]> {
  const res = await fetch(
    `${SHEETS_URL}/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(
      502,
      formatGoogleSheetsApiError(text || String(res.status), "구글 시트 읽기"),
    );
  }

  const data = (await res.json()) as { values?: unknown[][] };
  const rows = data.values;

  if (!rows || rows.length === 0) {
    return [];
  }

  return rows.map((row) =>
    row.map((cell) => (cell != null ? String(cell) : "")),
  );
}

function normalizeHeader(value: string) {
  return value.trim();
}

function parseStatusCode(raw: string | undefined) {
  if (!raw) return undefined;
  return STATUS_CODE_BY_LABEL[raw.trim()] ?? undefined;
}

function parseRiskCode(raw: string | undefined) {
  if (!raw) return undefined;
  return RISK_CODE_BY_LABEL[raw.trim()] ?? undefined;
}

function buildMemberLookupKey(params: {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
}) {
  if (params.email?.trim()) return `email:${params.email.trim().toLowerCase()}`;
  if (params.phone?.trim()) return `phone:${params.phone.trim()}`;
  if (params.name?.trim()) return `name:${params.name.trim()}`;
  return null;
}

const MEMBER_ID_COLUMN = "__yeon_member_id";
const EXPORTED_AT_COLUMN = "__yeon_exported_at";

type MemberSyncPayload = {
  core: {
    name: string;
    email: string | null;
    phone: string | null;
    status: string | null;
    initialRiskLevel: string | null;
  };
  customFields: Record<string, string | null>;
};

type ExportFieldDefinition = {
  id: string;
  name: string;
  fieldType: string;
};

type ExportRowData = {
  memberId: string;
  values: string[];
  payload: MemberSyncPayload;
};

type SheetImportConflictType =
  | "metadata_missing"
  | "duplicate_member_row"
  | "unknown_managed_row"
  | "deleted_on_server"
  | "deleted_in_sheet"
  | "both_sides_changed"
  | "new_row_matches_existing_member";

export type SheetImportConflict = {
  type: SheetImportConflictType;
  rowNumber: number | null;
  memberId: string | null;
  memberName: string | null;
  changedFields: string[];
  message: string;
  base: MemberSyncPayload | null;
  sheet: MemberSyncPayload | null;
  server: MemberSyncPayload | null;
};

export type SheetImportSummary = {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  conflicts: number;
};

export type SheetImportResult =
  | {
      status: "applied";
      summary: SheetImportSummary;
      conflicts: SheetImportConflict[];
      lastSyncedAt: Date;
    }
  | {
      status: "blocked";
      summary: SheetImportSummary;
      conflicts: SheetImportConflict[];
      lastSyncedAt: Date | null;
    };

function normalizeTextValue(raw: string | null | undefined) {
  const value = raw?.trim();
  return value ? value : null;
}

function updateStatusForCreate(status: string | null) {
  return status ?? undefined;
}

function buildCanonicalPayload(params: {
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  initialRiskLevel?: string | null;
  customFields?: Record<string, string | null | undefined>;
}) {
  return {
    core: {
      name: params.name.trim(),
      email: normalizeTextValue(params.email)?.toLowerCase() ?? null,
      phone: normalizeTextValue(params.phone),
      status: normalizeTextValue(params.status),
      initialRiskLevel: normalizeTextValue(params.initialRiskLevel),
    },
    customFields: Object.fromEntries(
      Object.entries(params.customFields ?? {})
        .sort(([left], [right]) => left.localeCompare(right, "ko-KR"))
        .map(([key, value]) => [key.trim(), normalizeTextValue(value)]),
    ),
  } satisfies MemberSyncPayload;
}

function hashPayload(payload: MemberSyncPayload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function diffPayloadFields(params: {
  base: MemberSyncPayload;
  next: MemberSyncPayload;
}) {
  const changedFields: string[] = [];
  const coreLabels: Record<keyof MemberSyncPayload["core"], string> = {
    name: "이름",
    email: "이메일",
    phone: "전화번호",
    status: "수강 상태",
    initialRiskLevel: "위험도",
  };

  (Object.keys(coreLabels) as Array<keyof MemberSyncPayload["core"]>).forEach(
    (key) => {
      if (params.base.core[key] !== params.next.core[key]) {
        changedFields.push(coreLabels[key]);
      }
    },
  );

  const customKeys = new Set([
    ...Object.keys(params.base.customFields),
    ...Object.keys(params.next.customFields),
  ]);
  [...customKeys]
    .sort((left, right) => left.localeCompare(right, "ko-KR"))
    .forEach((key) => {
      if (
        (params.base.customFields[key] ?? null) !==
        (params.next.customFields[key] ?? null)
      ) {
        changedFields.push(key);
      }
    });

  return changedFields;
}

function buildConflict(params: {
  type: SheetImportConflictType;
  rowNumber: number | null;
  memberId: string | null;
  memberName: string | null;
  changedFields?: string[];
  message: string;
  base?: MemberSyncPayload | null;
  sheet?: MemberSyncPayload | null;
  server?: MemberSyncPayload | null;
}): SheetImportConflict {
  return {
    type: params.type,
    rowNumber: params.rowNumber,
    memberId: params.memberId,
    memberName: params.memberName,
    changedFields: params.changedFields ?? [],
    message: params.message,
    base: params.base ?? null,
    sheet: params.sheet ?? null,
    server: params.server ?? null,
  };
}

async function replaceMemberSnapshots(params: {
  integrationInternalId: bigint;
  spaceInternalId: bigint;
  exportedAt: Date;
  rows: ExportRowData[];
}) {
  const db = getDb();

  await db
    .delete(sheetIntegrationMemberSnapshots)
    .where(
      eq(
        sheetIntegrationMemberSnapshots.integrationId,
        params.integrationInternalId,
      ),
    );

  if (params.rows.length === 0) {
    return;
  }

  await db.insert(sheetIntegrationMemberSnapshots).values(
    params.rows.map((row) => ({
      publicId: generatePublicId(ID_PREFIX.sheetIntegrationMemberSnapshots),
      integrationId: params.integrationInternalId,
      spaceId: params.spaceInternalId,
      memberId: row.memberId,
      basePayload: row.payload,
      basePayloadHash: hashPayload(row.payload),
      exportedAt: params.exportedAt,
      updatedAt: params.exportedAt,
    })),
  );
}

export async function importSpaceFromLinkedSheet(
  spaceId: string,
  sheetId: string,
  userId: string,
): Promise<SheetImportResult> {
  const accessToken = await getValidSheetsAccessToken(userId);
  if (!accessToken) {
    throw new ServiceError(
      401,
      "Google 계정이 연결되어 있지 않습니다. 먼저 Google 계정을 연결해주세요.",
    );
  }

  const spaceInternalId = await requireSpaceInternalIdByPublicId(spaceId);
  const db = getDb();
  const [integration] = await db
    .select()
    .from(sheetIntegrations)
    .where(
      and(
        eq(sheetIntegrations.spaceId, spaceInternalId),
        eq(sheetIntegrations.sheetId, sheetId),
        eq(sheetIntegrations.dataType, "export"),
      ),
    )
    .limit(1);

  if (!integration) {
    throw new ServiceError(404, "연동된 익스포트 시트를 찾지 못했습니다.");
  }

  const rows = await readSheetValues(accessToken, sheetId);
  const summary: SheetImportSummary = {
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    conflicts: 0,
  };

  if (rows.length === 0) {
    return {
      status: "blocked",
      summary: { ...summary, conflicts: 1 },
      conflicts: [
        buildConflict({
          type: "metadata_missing",
          rowNumber: null,
          memberId: null,
          memberName: null,
          message:
            "연동된 시트가 비어 있습니다. 먼저 시트에 최신 상태를 다시 반영해 주세요.",
        }),
      ],
      lastSyncedAt: integration.lastSyncedAt,
    };
  }

  const [headerRow, ...dataRows] = rows;
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const headerIndex = new Map(
    normalizedHeaders.map((header, index) => [header, index]),
  );

  const nameIndex = headerIndex.get("이름");
  if (nameIndex == null) {
    throw new ServiceError(400, "연동된 시트에 '이름' 컬럼이 없습니다.");
  }

  const emailIndex = headerIndex.get("이메일");
  const phoneIndex = headerIndex.get("전화번호");
  const statusIndex = headerIndex.get("수강 상태") ?? headerIndex.get("상태");
  const riskIndex = headerIndex.get("위험도");

  const memberIdIndex = headerIndex.get(MEMBER_ID_COLUMN);
  if (memberIdIndex == null) {
    return {
      status: "blocked",
      summary: { ...summary, conflicts: 1 },
      conflicts: [
        buildConflict({
          type: "metadata_missing",
          rowNumber: null,
          memberId: null,
          memberName: null,
          message:
            "충돌 없이 가져오려면 먼저 시트에 최신 상태를 한 번 반영해야 합니다.",
        }),
      ],
      lastSyncedAt: integration.lastSyncedAt,
    };
  }

  const existingMembers = await db
    .select()
    .from(members)
    .where(eq(members.spaceId, spaceInternalId));
  const definitions = await db
    .select({
      id: memberFieldDefinitions.id,
      publicId: memberFieldDefinitions.publicId,
      name: memberFieldDefinitions.name,
    })
    .from(memberFieldDefinitions)
    .where(eq(memberFieldDefinitions.spaceId, spaceInternalId));

  const fieldDefinitions = await db
    .select({
      id: memberFieldDefinitions.id,
      publicId: memberFieldDefinitions.publicId,
      name: memberFieldDefinitions.name,
      fieldType: memberFieldDefinitions.fieldType,
    })
    .from(memberFieldDefinitions)
    .where(eq(memberFieldDefinitions.spaceId, spaceInternalId));

  const currentFieldValuesByMemberId = new Map<
    string,
    Awaited<ReturnType<typeof getFieldValuesForDefinitions>>
  >();
  for (const member of existingMembers) {
    currentFieldValuesByMemberId.set(
      member.publicId,
      await getFieldValuesForDefinitions(member.publicId, spaceId),
    );
  }

  const currentPayloadByMemberId = new Map<string, MemberSyncPayload>();
  for (const member of existingMembers) {
    const fieldValues = currentFieldValuesByMemberId.get(member.publicId) ?? [];
    const customFields = Object.fromEntries(
      fieldDefinitions.map((definition) => {
        const fieldValue = fieldValues.find(
          (value) => value.fieldDefinitionId === definition.id,
        );

        return [
          definition.name,
          fieldValue
            ? formatFieldValue(definition.fieldType, fieldValue)
            : null,
        ] as const;
      }),
    );

    currentPayloadByMemberId.set(
      member.publicId,
      buildCanonicalPayload({
        name: member.name,
        email: member.email,
        phone: member.phone,
        status: member.status,
        initialRiskLevel: member.initialRiskLevel,
        customFields,
      }),
    );
  }

  const snapshotRows = await db
    .select()
    .from(sheetIntegrationMemberSnapshots)
    .where(eq(sheetIntegrationMemberSnapshots.integrationId, integration.id));
  const snapshotByMemberId = new Map(
    snapshotRows.map((row) => [row.memberId, row]),
  );

  const definitionByName = new Map(
    definitions.map((definition) => [definition.name.trim(), definition]),
  );

  const memberIndex = new Map<string, (typeof existingMembers)[number]>();
  for (const member of existingMembers) {
    const emailKey = buildMemberLookupKey({ email: member.email });
    const phoneKey = buildMemberLookupKey({ phone: member.phone });
    const nameKey = buildMemberLookupKey({ name: member.name });
    if (emailKey) memberIndex.set(emailKey, member);
    if (phoneKey) memberIndex.set(phoneKey, member);
    if (nameKey) memberIndex.set(nameKey, member);
  }

  const conflicts: SheetImportConflict[] = [];
  const seenManagedMemberIds = new Set<string>();
  const plannedCreates: Array<{
    payload: MemberSyncPayload;
    customValues: Array<{ fieldDefinitionId: string; value: string | null }>;
  }> = [];
  const plannedUpdates: Array<{
    memberPublicId: string;
    payload: MemberSyncPayload;
    customValues: Array<{ fieldDefinitionId: string; value: string | null }>;
  }> = [];

  for (const [rowIndex, row] of dataRows.entries()) {
    const rowNumber = rowIndex + 2;
    const name = row[nameIndex]?.trim() ?? "";
    const email = emailIndex != null ? row[emailIndex]?.trim() || null : null;
    const phone = phoneIndex != null ? row[phoneIndex]?.trim() || null : null;
    const managedMemberId = normalizeTextValue(row[memberIdIndex]);

    if (!name) {
      summary.skipped += 1;
      continue;
    }

    const customValues = normalizedHeaders
      .map((header, index) => {
        const definition = definitionByName.get(header);
        if (!definition) return null;
        return {
          fieldDefinitionId: definition.publicId,
          value: normalizeTextValue(row[index]),
        };
      })
      .filter(
        (value): value is { fieldDefinitionId: string; value: string | null } =>
          value !== null,
      );

    const sheetPayload = buildCanonicalPayload({
      name,
      email,
      phone,
      status: statusIndex != null ? parseStatusCode(row[statusIndex]) : null,
      initialRiskLevel:
        riskIndex != null ? parseRiskCode(row[riskIndex]) : null,
      customFields: Object.fromEntries(
        customValues.map((value) => [
          definitions.find(
            (definition) => definition.publicId === value.fieldDefinitionId,
          )?.name ?? value.fieldDefinitionId,
          value.value,
        ]),
      ),
    });

    if (managedMemberId) {
      if (seenManagedMemberIds.has(managedMemberId)) {
        conflicts.push(
          buildConflict({
            type: "duplicate_member_row",
            rowNumber,
            memberId: managedMemberId,
            memberName: name,
            message:
              "같은 수강생 메타데이터를 가진 row가 시트에 두 번 이상 있습니다.",
            sheet: sheetPayload,
          }),
        );
        continue;
      }

      seenManagedMemberIds.add(managedMemberId);

      const snapshot = snapshotByMemberId.get(managedMemberId);
      if (!snapshot) {
        conflicts.push(
          buildConflict({
            type: "unknown_managed_row",
            rowNumber,
            memberId: managedMemberId,
            memberName: name,
            message:
              "서버에 기준 스냅샷이 없는 row입니다. 먼저 시트에 최신 상태를 다시 반영해 주세요.",
            sheet: sheetPayload,
          }),
        );
        continue;
      }

      const serverPayload = currentPayloadByMemberId.get(managedMemberId);
      const basePayload = snapshot.basePayload as MemberSyncPayload;

      if (!serverPayload) {
        conflicts.push(
          buildConflict({
            type: "deleted_on_server",
            rowNumber,
            memberId: managedMemberId,
            memberName: basePayload.core.name,
            message:
              "서버에서 이미 삭제되거나 사라진 수강생 row입니다. 자동으로 다시 만들지 않고 충돌로 처리합니다.",
            base: basePayload,
            sheet: sheetPayload,
          }),
        );
        continue;
      }

      const baseHash = snapshot.basePayloadHash;
      const serverHash = hashPayload(serverPayload);
      const sheetHash = hashPayload(sheetPayload);
      const serverChanged = serverHash !== baseHash;
      const sheetChanged = sheetHash !== baseHash;

      if (!serverChanged && !sheetChanged) {
        summary.unchanged += 1;
        continue;
      }

      if (!serverChanged && sheetChanged) {
        plannedUpdates.push({
          memberPublicId: managedMemberId,
          payload: sheetPayload,
          customValues,
        });
        continue;
      }

      if (serverChanged && !sheetChanged) {
        summary.unchanged += 1;
        continue;
      }

      if (serverHash === sheetHash) {
        summary.unchanged += 1;
        continue;
      }

      conflicts.push(
        buildConflict({
          type: "both_sides_changed",
          rowNumber,
          memberId: managedMemberId,
          memberName: serverPayload.core.name,
          changedFields: [
            ...new Set([
              ...diffPayloadFields({ base: basePayload, next: serverPayload }),
              ...diffPayloadFields({ base: basePayload, next: sheetPayload }),
            ]),
          ],
          message:
            "서버와 시트가 모두 수정되어 자동 반영할 수 없습니다. 한쪽 값을 정리한 뒤 다시 시도해 주세요.",
          base: basePayload,
          sheet: sheetPayload,
          server: serverPayload,
        }),
      );
      continue;
    }

    const lookupKey = buildMemberLookupKey({ email, phone, name });
    const matchedExistingMember = lookupKey
      ? memberIndex.get(lookupKey)
      : undefined;

    if (matchedExistingMember) {
      conflicts.push(
        buildConflict({
          type: "new_row_matches_existing_member",
          rowNumber,
          memberId: matchedExistingMember.publicId,
          memberName: matchedExistingMember.name,
          changedFields: diffPayloadFields({
            base:
              currentPayloadByMemberId.get(matchedExistingMember.publicId) ??
              buildCanonicalPayload({ name: matchedExistingMember.name }),
            next: sheetPayload,
          }),
          message:
            "메타데이터가 없는 신규 row가 기존 수강생과 겹칩니다. 먼저 시트를 최신 상태로 다시 내보내 주세요.",
          sheet: sheetPayload,
          server:
            currentPayloadByMemberId.get(matchedExistingMember.publicId) ??
            null,
        }),
      );
      continue;
    }

    plannedCreates.push({ payload: sheetPayload, customValues });
  }

  const missingManagedRows = snapshotRows.filter(
    (snapshot) =>
      currentPayloadByMemberId.has(snapshot.memberId) &&
      !seenManagedMemberIds.has(snapshot.memberId),
  );

  for (const snapshot of missingManagedRows) {
    const basePayload = snapshot.basePayload as MemberSyncPayload;
    conflicts.push(
      buildConflict({
        type: "deleted_in_sheet",
        rowNumber: null,
        memberId: snapshot.memberId,
        memberName: basePayload.core.name,
        message:
          "서버에는 아직 남아 있지만 시트에서 사라진 수강생입니다. 자동 삭제하지 않고 충돌로 처리합니다.",
        base: basePayload,
        server: currentPayloadByMemberId.get(snapshot.memberId) ?? null,
      }),
    );
  }

  if (conflicts.length > 0) {
    return {
      status: "blocked",
      summary: {
        ...summary,
        conflicts: conflicts.length,
      },
      conflicts,
      lastSyncedAt: integration.lastSyncedAt,
    };
  }

  for (const update of plannedUpdates) {
    await updateMember(update.memberPublicId, {
      name: update.payload.core.name,
      email: update.payload.core.email,
      phone: update.payload.core.phone,
      status: update.payload.core.status ?? undefined,
      initialRiskLevel: update.payload.core.initialRiskLevel,
    });
    await bulkUpsertFieldValues(
      update.memberPublicId,
      spaceId,
      update.customValues,
    );
    summary.updated += 1;
  }

  for (const create of plannedCreates) {
    const member = await createMember(spaceId, {
      name: create.payload.core.name,
      email: create.payload.core.email,
      phone: create.payload.core.phone,
      status: updateStatusForCreate(create.payload.core.status),
      initialRiskLevel: create.payload.core.initialRiskLevel,
    });
    await bulkUpsertFieldValues(
      member.publicId,
      spaceId,
      create.customValues,
    );
    summary.created += 1;
  }

  const reExportResult = await exportSpaceToSheet(spaceId, sheetId, userId);

  return {
    status: "applied",
    summary,
    conflicts: [],
    lastSyncedAt: reExportResult.lastSyncedAt,
  };
}

async function buildSpaceExportRows(spaceInternalId: bigint): Promise<{
  fieldDefinitions: ExportFieldDefinition[];
  rows: ExportRowData[];
}> {
  const db = getDb();

  const memberRows = await db
    .select()
    .from(members)
    .where(eq(members.spaceId, spaceInternalId))
    .orderBy(asc(members.createdAt));

  const fieldDefRows = await db
    .select({
      id: memberFieldDefinitions.id,
      publicId: memberFieldDefinitions.publicId,
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
    .where(eq(memberFieldDefinitions.spaceId, spaceInternalId))
    .orderBy(
      asc(memberTabDefinitions.displayOrder),
      asc(memberFieldDefinitions.displayOrder),
    );

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

  const rows = memberRows.map((member) => {
    const customFieldEntries = fieldDefRows.map((field) => {
      const row = valueIndex.get(`${member.id}:${field.id}`);
      return [
        field.name,
        row ? formatFieldValue(field.fieldType, row) : null,
      ] as const;
    });

    const payload = buildCanonicalPayload({
      name: member.name,
      email: member.email,
      phone: member.phone,
      status: member.status,
      initialRiskLevel: member.initialRiskLevel,
      customFields: Object.fromEntries(customFieldEntries),
    });

    const visibleCells = [
      member.name,
      member.email ?? "",
      member.phone ?? "",
      STATUS_LABEL[member.status] ?? member.status,
      member.initialRiskLevel
        ? (RISK_LABEL[member.initialRiskLevel] ?? member.initialRiskLevel)
        : "",
      formatDate(member.createdAt),
      ...fieldDefRows.map((field) => payload.customFields[field.name] ?? ""),
    ];

    return {
      memberId: member.publicId,
      payload,
      values: visibleCells,
    } satisfies ExportRowData;
  });

  return {
    fieldDefinitions: fieldDefRows.map((field) => ({
      id: field.publicId,
      name: field.name,
      fieldType: field.fieldType,
    })),
    rows,
  };
}

export async function buildSpaceExportData(
  spaceId: string,
): Promise<{ values: string[][]; memberCount: number; rows: ExportRowData[] }> {
  const spaceInternalId = await requireSpaceInternalIdByPublicId(spaceId);
  const { fieldDefinitions, rows } =
    await buildSpaceExportRows(spaceInternalId);
  const exportedAt = new Date().toISOString();
  const header = [
    "이름",
    "이메일",
    "전화번호",
    "수강 상태",
    "위험도",
    "등록일",
    ...fieldDefinitions.map((field) => field.name),
    MEMBER_ID_COLUMN,
    EXPORTED_AT_COLUMN,
  ];

  return {
    values: [
      header,
      ...rows.map((row) => [...row.values, row.memberId, exportedAt]),
    ],
    memberCount: rows.length,
    rows,
  };
}

export async function exportSpaceToSheet(
  spaceId: string,
  sheetId: string,
  userId: string,
): Promise<{ exported: number; lastSyncedAt: Date }> {
  const accessToken = await getValidSheetsAccessToken(userId);
  if (!accessToken) {
    throw new ServiceError(
      401,
      "Google 계정이 연결되어 있지 않습니다. 먼저 Google 계정을 연결해주세요.",
    );
  }

  const spaceInternalId = await requireSpaceInternalIdByPublicId(spaceId);
  const db = getDb();
  const [integration] = await db
    .select()
    .from(sheetIntegrations)
    .where(
      and(
        eq(sheetIntegrations.spaceId, spaceInternalId),
        eq(sheetIntegrations.sheetId, sheetId),
        eq(sheetIntegrations.dataType, "export"),
      ),
    )
    .limit(1);

  if (!integration) {
    throw new ServiceError(404, "연동된 익스포트 시트를 찾지 못했습니다.");
  }

  const { values, memberCount, rows } = await buildSpaceExportData(spaceId);

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
        eq(sheetIntegrations.spaceId, spaceInternalId),
        eq(sheetIntegrations.sheetId, sheetId),
        eq(sheetIntegrations.dataType, "export"),
      ),
    );

  await replaceMemberSnapshots({
    integrationInternalId: integration.id,
    spaceInternalId,
    exportedAt: now,
    rows,
  });

  return { exported: memberCount, lastSyncedAt: now };
}
