import { and, asc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  memberFieldTypeValues,
  type CreateMemberFieldBody,
  type MemberFieldSelectOption,
  type MemberFieldType,
  type UpdateMemberFieldBody,
} from "@yeon/api-contract/spaces";

import { getDb } from "@/server/db";
import { memberFieldDefinitions } from "@/server/db/schema";
import { DEFAULT_OVERVIEW_FIELDS } from "@/lib/member-overview-fields";

import { ServiceError } from "./service-error";

/* ── 타입 ── */

export type FieldType = MemberFieldType;

export const VALID_FIELD_TYPES = new Set<FieldType>(memberFieldTypeValues);

export type SelectOption = MemberFieldSelectOption;

export type MemberFieldDefinition = typeof memberFieldDefinitions.$inferSelect;

export type CreateFieldInput = CreateMemberFieldBody;

export type UpdateFieldInput = UpdateMemberFieldBody;

/* ── 유효성 검사 ── */

function validateFieldType(fieldType: string): asserts fieldType is FieldType {
  if (!VALID_FIELD_TYPES.has(fieldType as FieldType)) {
    throw new ServiceError(
      400,
      `지원하지 않는 필드 타입입니다: ${fieldType}. 지원 타입: ${[...VALID_FIELD_TYPES].join(", ")}`,
    );
  }
}

/* ── 서비스 함수 ── */

/**
 * 스페이스 내 모든 커스텀 필드 목록 조회
 */
export async function getFieldsForSpace(
  spaceId: string,
): Promise<MemberFieldDefinition[]> {
  const db = getDb();

  return db
    .select()
    .from(memberFieldDefinitions)
    .where(
      and(
        eq(memberFieldDefinitions.spaceId, spaceId),
        isNull(memberFieldDefinitions.deletedAt),
      ),
    )
    .orderBy(asc(memberFieldDefinitions.displayOrder));
}

/**
 * 특정 탭의 필드 목록 조회
 */
export async function getFieldsForTab(
  tabId: string,
  spaceId: string,
): Promise<MemberFieldDefinition[]> {
  const db = getDb();

  return db
    .select()
    .from(memberFieldDefinitions)
    .where(
      and(
        eq(memberFieldDefinitions.tabId, tabId),
        eq(memberFieldDefinitions.spaceId, spaceId),
        isNull(memberFieldDefinitions.deletedAt),
      ),
    )
    .orderBy(asc(memberFieldDefinitions.displayOrder));
}

export async function createDefaultOverviewFields(
  spaceId: string,
  overviewTabId: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  const now = new Date();

  const rows = DEFAULT_OVERVIEW_FIELDS.map((field) => ({
    id: randomUUID(),
    spaceId,
    tabId: overviewTabId,
    createdByUserId: userId,
    name: field.name,
    sourceKey: field.sourceKey,
    fieldType: field.fieldType,
    options: null,
    isRequired: false,
    displayOrder: field.displayOrder,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(memberFieldDefinitions).values(rows).onConflictDoNothing();
}

/**
 * 필드 생성
 */
export async function createField(
  spaceId: string,
  tabId: string,
  userId: string,
  data: CreateFieldInput,
): Promise<MemberFieldDefinition> {
  const db = getDb();

  const name = data.name.trim().slice(0, 80);
  if (!name) throw new ServiceError(400, "필드 이름은 필수입니다.");

  validateFieldType(data.fieldType);

  // 선택 타입이 아닌데 options 주어진 경우 무시 (null 처리)
  const needsOptions =
    data.fieldType === "select" || data.fieldType === "multi_select";
  const options = needsOptions ? (data.options ?? null) : null;

  // 해당 탭의 현재 마지막 displayOrder 계산
  const existing = await getFieldsForTab(tabId, spaceId);
  const maxOrder = existing.reduce(
    (acc, f) => Math.max(acc, f.displayOrder),
    -1,
  );

  const now = new Date();

  const [field] = await db
    .insert(memberFieldDefinitions)
    .values({
      id: randomUUID(),
      spaceId,
      tabId,
      createdByUserId: userId,
      name,
      sourceKey: null,
      fieldType: data.fieldType,
      options,
      isRequired: data.isRequired ?? false,
      displayOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!field) throw new ServiceError(500, "필드를 생성하지 못했습니다.");

  return field;
}

/**
 * 필드 수정 (이름 / 옵션 / 필수 여부 / 순서 / 탭 이동)
 */
export async function updateField(
  fieldId: string,
  spaceId: string,
  data: UpdateFieldInput,
): Promise<MemberFieldDefinition> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(memberFieldDefinitions)
    .where(
      and(
        eq(memberFieldDefinitions.id, fieldId),
        eq(memberFieldDefinitions.spaceId, spaceId),
      ),
    )
    .limit(1);

  if (!existing || existing.deletedAt) {
    throw new ServiceError(404, "필드를 찾지 못했습니다.");
  }

  if (existing.sourceKey) {
    if (
      (data.fieldType !== undefined && data.fieldType !== existing.fieldType) ||
      data.options !== undefined ||
      (data.isRequired !== undefined &&
        data.isRequired !== existing.isRequired) ||
      (data.tabId !== undefined && data.tabId !== existing.tabId)
    ) {
      throw new ServiceError(
        403,
        "기본 항목은 이름과 순서만 변경할 수 있습니다.",
      );
    }
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (data.name !== undefined) {
    const name = data.name.trim().slice(0, 80);
    if (!name) throw new ServiceError(400, "필드 이름은 필수입니다.");
    patch.name = name;
  }
  if (data.fieldType !== undefined) {
    validateFieldType(data.fieldType);
    patch.fieldType = data.fieldType;
    const needsOptions =
      data.fieldType === "select" || data.fieldType === "multi_select";
    if (!needsOptions) {
      patch.options = null;
    }
  }
  if (data.options !== undefined) patch.options = data.options;
  if (data.isRequired !== undefined) patch.isRequired = data.isRequired;
  if (data.displayOrder !== undefined) patch.displayOrder = data.displayOrder;
  if (data.tabId !== undefined) patch.tabId = data.tabId;

  const [updated] = await db
    .update(memberFieldDefinitions)
    .set(patch)
    .where(eq(memberFieldDefinitions.id, fieldId))
    .returning();

  if (!updated) throw new ServiceError(500, "필드를 수정하지 못했습니다.");

  return updated;
}

/**
 * 필드 삭제 (값도 CASCADE로 함께 삭제)
 */
export async function deleteField(
  fieldId: string,
  spaceId: string,
): Promise<void> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(memberFieldDefinitions)
    .where(
      and(
        eq(memberFieldDefinitions.id, fieldId),
        eq(memberFieldDefinitions.spaceId, spaceId),
      ),
    )
    .limit(1);

  if (!existing || existing.deletedAt) {
    throw new ServiceError(404, "필드를 찾지 못했습니다.");
  }

  const [deleted] = await db
    .update(memberFieldDefinitions)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(memberFieldDefinitions.id, fieldId))
    .returning();

  if (!deleted) {
    throw new ServiceError(500, "필드를 삭제하지 못했습니다.");
  }
}

/**
 * 탭 내 필드 순서 일괄 변경
 * order: fieldId 배열 (index = 새 displayOrder)
 */
export async function reorderFields(
  spaceId: string,
  order: string[],
): Promise<void> {
  const db = getDb();

  await Promise.all(
    order.map((fieldId, idx) =>
      db
        .update(memberFieldDefinitions)
        .set({ displayOrder: idx, updatedAt: new Date() })
        .where(
          and(
            eq(memberFieldDefinitions.id, fieldId),
            eq(memberFieldDefinitions.spaceId, spaceId),
          ),
        ),
    ),
  );
}
