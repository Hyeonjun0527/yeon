import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/server/db";
import { memberFieldDefinitions, memberFieldValues } from "@/server/db/schema";

import { ServiceError } from "./service-error";
import type { FieldType } from "./member-fields-service";

/* ── 타입 ── */

export type MemberFieldValue = typeof memberFieldValues.$inferSelect;

export type FieldValuePayload = {
  fieldDefinitionId: string;
  /** 클라이언트가 보내는 raw 값. 서비스에서 field_type에 따라 적절한 컬럼에 저장 */
  value: unknown;
};

export type FieldValueWithDefinition = MemberFieldValue & {
  fieldDefinitionId: string;
  fieldType: string;
  fieldName: string;
};

/* ── 내부 유틸 ── */

/**
 * field_type에 따라 어느 컬럼에 저장할지 결정
 */
function buildValueColumns(
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
      if (isNaN(n)) throw new ServiceError(400, `숫자 필드에 유효하지 않은 값입니다: ${value}`);
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
  memberId: string,
  fieldDefinitionId: string,
  db: ReturnType<typeof getDb>,
): Promise<MemberFieldValue | undefined> {
  const [existing] = await db
    .select()
    .from(memberFieldValues)
    .where(
      and(
        eq(memberFieldValues.memberId, memberId),
        eq(memberFieldValues.fieldDefinitionId, fieldDefinitionId),
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
  memberId: string,
  spaceId: string,
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
    })
    .from(memberFieldValues)
    .innerJoin(
      memberFieldDefinitions,
      eq(memberFieldValues.fieldDefinitionId, memberFieldDefinitions.id),
    )
    .where(
      and(
        eq(memberFieldValues.memberId, memberId),
        eq(memberFieldDefinitions.spaceId, spaceId),
      ),
    );

  return rows;
}

/**
 * 단일 필드 값 upsert (없으면 INSERT, 있으면 UPDATE)
 */
export async function upsertFieldValue(
  memberId: string,
  spaceId: string,
  payload: FieldValuePayload,
): Promise<MemberFieldValue> {
  const db = getDb();

  // 필드 정의 확인 (소유권 검증)
  const [definition] = await db
    .select()
    .from(memberFieldDefinitions)
    .where(
      and(
        eq(memberFieldDefinitions.id, payload.fieldDefinitionId),
        eq(memberFieldDefinitions.spaceId, spaceId),
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

  const existing = await findExistingFieldValue(memberId, payload.fieldDefinitionId, db);

  if (existing) {
    // UPDATE
    const [updated] = await db
      .update(memberFieldValues)
      .set({ ...valueColumns, updatedAt: now })
      .where(eq(memberFieldValues.id, existing.id))
      .returning();

    if (!updated) throw new ServiceError(500, "필드 값을 수정하지 못했습니다.");
    return updated;
  }

  // INSERT
  const [inserted] = await db
    .insert(memberFieldValues)
    .values({
      id: randomUUID(),
      memberId,
      fieldDefinitionId: payload.fieldDefinitionId,
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
  memberId: string,
  spaceId: string,
  values: FieldValuePayload[],
): Promise<void> {
  await Promise.all(
    values.map((v) => upsertFieldValue(memberId, spaceId, v)),
  );
}

