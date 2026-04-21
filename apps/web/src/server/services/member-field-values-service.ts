import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type {
  MemberFieldType as FieldType,
  MemberFieldValuePayload,
} from "@yeon/api-contract/spaces";

import { getDb } from "@/server/db";
import { memberFieldDefinitions, memberFieldValues } from "@/server/db/schema";
import { generatePublicId, ID_PREFIX } from "@/server/lib/public-id";

import { ServiceError } from "./service-error";
import { requireSpaceInternalIdByPublicId } from "./spaces-service";
import { requireMemberInternalIdByPublicId } from "./members-service";

/* ── 타입 ── */

export type MemberFieldValue = typeof memberFieldValues.$inferSelect;

export type FieldValuePayload = MemberFieldValuePayload;

export type FieldValueWithDefinition = {
  id: bigint;
  memberId: bigint;
  fieldDefinitionId: bigint;
  valueText: string | null;
  valueNumber: string | null;
  valueBoolean: boolean | null;
  valueJson: unknown;
  createdAt: Date;
  updatedAt: Date;
  fieldType: string;
  fieldName: string;
  fieldDefinitionPublicId: string;
};

/* ── 내부 유틸 ── */

/**
 * field_type에 따라 어느 컬럼에 저장할지 결정
 */
export function buildValueColumns(
  fieldType: FieldType,
  value: unknown,
): Partial<{
  valueText: string | null;
  valueNumber: string | null;
  valueBoolean: boolean | null;
  valueJson: unknown;
}> {
  if (value === null || value === undefined) {
    return {
      valueText: null,
      valueNumber: null,
      valueBoolean: null,
      valueJson: null,
    };
  }

  switch (fieldType) {
    case "text":
    case "long_text":
    case "url":
    case "email":
    case "phone":
    case "date":
      return { valueText: String(value).slice(0, 5000) };
    case "number": {
      const n = Number(value);
      if (isNaN(n))
        throw new ServiceError(
          400,
          `숫자 필드에 유효하지 않은 값입니다: ${value}`,
        );
      return { valueNumber: String(n) };
    }
    case "checkbox":
      return { valueBoolean: Boolean(value) };
    case "select":
    case "multi_select":
      return { valueJson: value };
    default:
      return { valueText: String(value) };
  }
}

/* ── 내부 헬퍼 ── */

/** 수강생의 특정 필드에 대한 기존 값 레코드를 조회 */
async function findExistingFieldValue(
  memberInternalId: bigint,
  fieldDefinitionInternalId: bigint,
  db: ReturnType<typeof getDb>,
): Promise<MemberFieldValue | undefined> {
  const [existing] = await db
    .select()
    .from(memberFieldValues)
    .where(
      and(
        eq(memberFieldValues.memberId, memberInternalId),
        eq(memberFieldValues.fieldDefinitionId, fieldDefinitionInternalId),
      ),
    )
    .limit(1);
  return existing;
}

/* ── 서비스 함수 ── */

/**
 * 수강생의 모든 필드 값 조회 (정의와 조인)
 */
export async function getFieldValues(
  memberPublicId: string,
  spacePublicId: string,
): Promise<FieldValueWithDefinition[]> {
  return getFieldValuesForDefinitions(memberPublicId, spacePublicId);
}

export async function getFieldValuesForDefinitions(
  memberPublicId: string,
  spacePublicId: string,
  fieldDefinitionPublicIds?: string[],
): Promise<FieldValueWithDefinition[]> {
  const db = getDb();

  const memberInternalId =
    await requireMemberInternalIdByPublicId(memberPublicId);
  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);

  const rows = await db
    .select({
      id: memberFieldValues.id,
      memberId: memberFieldValues.memberId,
      fieldDefinitionId: memberFieldValues.fieldDefinitionId,
      valueText: memberFieldValues.valueText,
      valueNumber: memberFieldValues.valueNumber,
      valueBoolean: memberFieldValues.valueBoolean,
      valueJson: memberFieldValues.valueJson,
      createdAt: memberFieldValues.createdAt,
      updatedAt: memberFieldValues.updatedAt,
      fieldType: memberFieldDefinitions.fieldType,
      fieldName: memberFieldDefinitions.name,
      fieldDefinitionPublicId: memberFieldDefinitions.publicId,
    })
    .from(memberFieldValues)
    .innerJoin(
      memberFieldDefinitions,
      eq(memberFieldValues.fieldDefinitionId, memberFieldDefinitions.id),
    )
    .where(
      and(
        eq(memberFieldValues.memberId, memberInternalId),
        eq(memberFieldDefinitions.spaceId, spaceInternalId),
        isNull(memberFieldDefinitions.deletedAt),
        ...(fieldDefinitionPublicIds?.length
          ? [
              inArray(
                memberFieldDefinitions.publicId,
                fieldDefinitionPublicIds,
              ),
            ]
          : []),
      ),
    );

  return rows;
}

export async function getFieldValuesForDefinitionsByInternalIds(
  memberInternalId: bigint,
  spaceInternalId: bigint,
  fieldDefinitionInternalIds?: bigint[],
): Promise<FieldValueWithDefinition[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: memberFieldValues.id,
      memberId: memberFieldValues.memberId,
      fieldDefinitionId: memberFieldValues.fieldDefinitionId,
      valueText: memberFieldValues.valueText,
      valueNumber: memberFieldValues.valueNumber,
      valueBoolean: memberFieldValues.valueBoolean,
      valueJson: memberFieldValues.valueJson,
      createdAt: memberFieldValues.createdAt,
      updatedAt: memberFieldValues.updatedAt,
      fieldType: memberFieldDefinitions.fieldType,
      fieldName: memberFieldDefinitions.name,
      fieldDefinitionPublicId: memberFieldDefinitions.publicId,
    })
    .from(memberFieldValues)
    .innerJoin(
      memberFieldDefinitions,
      eq(memberFieldValues.fieldDefinitionId, memberFieldDefinitions.id),
    )
    .where(
      and(
        eq(memberFieldValues.memberId, memberInternalId),
        eq(memberFieldDefinitions.spaceId, spaceInternalId),
        isNull(memberFieldDefinitions.deletedAt),
        ...(fieldDefinitionInternalIds?.length
          ? [
              inArray(
                memberFieldValues.fieldDefinitionId,
                fieldDefinitionInternalIds,
              ),
            ]
          : []),
      ),
    );

  return rows;
}

/**
 * 단일 필드 값 upsert (없으면 INSERT, 있으면 UPDATE)
 */
export async function upsertFieldValue(
  memberPublicId: string,
  spacePublicId: string,
  payload: FieldValuePayload,
): Promise<MemberFieldValue> {
  const db = getDb();

  const memberInternalId =
    await requireMemberInternalIdByPublicId(memberPublicId);
  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);

  const [definition] = await db
    .select()
    .from(memberFieldDefinitions)
    .where(
      and(
        eq(memberFieldDefinitions.publicId, payload.fieldDefinitionId),
        eq(memberFieldDefinitions.spaceId, spaceInternalId),
        isNull(memberFieldDefinitions.deletedAt),
      ),
    )
    .limit(1);

  if (!definition) {
    throw new ServiceError(404, "필드 정의를 찾지 못했습니다.");
  }

  const valueColumns = buildValueColumns(
    definition.fieldType as FieldType,
    payload.value,
  );

  const now = new Date();

  const existing = await findExistingFieldValue(
    memberInternalId,
    definition.id,
    db,
  );

  if (existing) {
    const [updated] = await db
      .update(memberFieldValues)
      .set({ ...valueColumns, updatedAt: now })
      .where(eq(memberFieldValues.id, existing.id))
      .returning();

    if (!updated) throw new ServiceError(500, "필드 값을 수정하지 못했습니다.");
    return updated;
  }

  const [inserted] = await db
    .insert(memberFieldValues)
    .values({
      publicId: generatePublicId(ID_PREFIX.memberFieldValues),
      memberId: memberInternalId,
      fieldDefinitionId: definition.id,
      valueText: valueColumns.valueText ?? null,
      valueNumber: valueColumns.valueNumber ?? null,
      valueBoolean: valueColumns.valueBoolean ?? null,
      valueJson: valueColumns.valueJson ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!inserted) throw new ServiceError(500, "필드 값을 저장하지 못했습니다.");
  return inserted;
}

/**
 * 여러 필드 값 일괄 upsert (임포트 시 사용)
 */
export async function bulkUpsertFieldValues(
  memberPublicId: string,
  spacePublicId: string,
  values: FieldValuePayload[],
): Promise<void> {
  if (values.length === 0) {
    return;
  }

  const db = getDb();
  const memberInternalId =
    await requireMemberInternalIdByPublicId(memberPublicId);
  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);

  const definitionPublicIds = [
    ...new Set(values.map((value) => value.fieldDefinitionId)),
  ];
  const definitions = await db
    .select()
    .from(memberFieldDefinitions)
    .where(
      and(
        eq(memberFieldDefinitions.spaceId, spaceInternalId),
        inArray(memberFieldDefinitions.publicId, definitionPublicIds),
        isNull(memberFieldDefinitions.deletedAt),
      ),
    );

  const definitionByPublicId = new Map(
    definitions.map((definition) => [definition.publicId, definition]),
  );

  for (const definitionPublicId of definitionPublicIds) {
    if (!definitionByPublicId.has(definitionPublicId)) {
      throw new ServiceError(404, "필드 정의를 찾지 못했습니다.");
    }
  }

  const now = new Date();
  const upsertRows = values.map((payload) => {
    const definition = definitionByPublicId.get(payload.fieldDefinitionId);

    if (!definition) {
      throw new ServiceError(404, "필드 정의를 찾지 못했습니다.");
    }

    const valueColumns = buildValueColumns(
      definition.fieldType as FieldType,
      payload.value,
    );

    return {
      publicId: generatePublicId(ID_PREFIX.memberFieldValues),
      memberId: memberInternalId,
      fieldDefinitionId: definition.id,
      valueText: valueColumns.valueText ?? null,
      valueNumber: valueColumns.valueNumber ?? null,
      valueBoolean: valueColumns.valueBoolean ?? null,
      valueJson: valueColumns.valueJson ?? null,
      createdAt: now,
      updatedAt: now,
    };
  });

  await db
    .insert(memberFieldValues)
    .values(upsertRows)
    .onConflictDoUpdate({
      target: [memberFieldValues.memberId, memberFieldValues.fieldDefinitionId],
      set: {
        valueText: sql`excluded.value_text`,
        valueNumber: sql`excluded.value_number`,
        valueBoolean: sql`excluded.value_boolean`,
        valueJson: sql`excluded.value_json`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}
