import { and, asc, eq, isNull } from "drizzle-orm";
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
import { generatePublicId, ID_PREFIX } from "@/server/lib/public-id";

import { ServiceError } from "./service-error";
import { requireSpaceInternalIdByPublicId } from "./spaces-service";
import { resolveTabInternalIdByPublicId } from "./member-tabs-service";

/* ── 타입 ── */

export type FieldType = MemberFieldType;

export const VALID_FIELD_TYPES = new Set<FieldType>(memberFieldTypeValues);

export type SelectOption = MemberFieldSelectOption;

export type MemberFieldDefinition = typeof memberFieldDefinitions.$inferSelect;

export type CreateFieldInput = CreateMemberFieldBody;

export type UpdateFieldInput = UpdateMemberFieldBody;

/* ── ID 해석 헬퍼 ── */

export async function resolveFieldInternalIdByPublicId(
  publicId: string,
): Promise<bigint | null> {
  const [row] = await getDb()
    .select({ id: memberFieldDefinitions.id })
    .from(memberFieldDefinitions)
    .where(eq(memberFieldDefinitions.publicId, publicId))
    .limit(1);
  return row?.id ?? null;
}

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
  spacePublicId: string,
): Promise<MemberFieldDefinition[]> {
  const db = getDb();
  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);

  return db
    .select()
    .from(memberFieldDefinitions)
    .where(
      and(
        eq(memberFieldDefinitions.spaceId, spaceInternalId),
        isNull(memberFieldDefinitions.deletedAt),
      ),
    )
    .orderBy(asc(memberFieldDefinitions.displayOrder));
}

export async function getFieldsForSpaceByInternalId(
  spaceInternalId: bigint,
): Promise<MemberFieldDefinition[]> {
  const db = getDb();

  return db
    .select()
    .from(memberFieldDefinitions)
    .where(
      and(
        eq(memberFieldDefinitions.spaceId, spaceInternalId),
        isNull(memberFieldDefinitions.deletedAt),
      ),
    )
    .orderBy(asc(memberFieldDefinitions.displayOrder));
}

/**
 * 특정 탭의 필드 목록 조회
 */
export async function getFieldsForTab(
  tabPublicId: string,
  spacePublicId: string,
): Promise<MemberFieldDefinition[]> {
  const db = getDb();
  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);
  const tabInternalId = await resolveTabInternalIdByPublicId(tabPublicId);
  if (tabInternalId === null) {
    return [];
  }

  return db
    .select()
    .from(memberFieldDefinitions)
    .where(
      and(
        eq(memberFieldDefinitions.tabId, tabInternalId),
        eq(memberFieldDefinitions.spaceId, spaceInternalId),
        isNull(memberFieldDefinitions.deletedAt),
      ),
    )
    .orderBy(asc(memberFieldDefinitions.displayOrder));
}

export async function getFieldsForTabByInternalIds(
  tabInternalId: bigint,
  spaceInternalId: bigint,
): Promise<MemberFieldDefinition[]> {
  const db = getDb();

  return db
    .select()
    .from(memberFieldDefinitions)
    .where(
      and(
        eq(memberFieldDefinitions.tabId, tabInternalId),
        eq(memberFieldDefinitions.spaceId, spaceInternalId),
        isNull(memberFieldDefinitions.deletedAt),
      ),
    )
    .orderBy(asc(memberFieldDefinitions.displayOrder));
}

export async function createDefaultOverviewFields(
  spaceInternalId: bigint,
  overviewTabInternalId: bigint,
  userId: string,
): Promise<void> {
  const db = getDb();
  const now = new Date();

  const rows = DEFAULT_OVERVIEW_FIELDS.map((field) => ({
    publicId: generatePublicId(ID_PREFIX.memberFields),
    spaceId: spaceInternalId,
    tabId: overviewTabInternalId,
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
  spacePublicId: string,
  tabPublicId: string,
  userId: string,
  data: CreateFieldInput,
): Promise<MemberFieldDefinition> {
  const db = getDb();

  const name = data.name.trim().slice(0, 80);
  if (!name) throw new ServiceError(400, "필드 이름은 필수입니다.");

  validateFieldType(data.fieldType);

  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);
  const tabInternalId = await resolveTabInternalIdByPublicId(tabPublicId);
  if (tabInternalId === null) {
    throw new ServiceError(404, "탭을 찾지 못했습니다.");
  }

  // 선택 타입이 아닌데 options 주어진 경우 무시 (null 처리)
  const needsOptions =
    data.fieldType === "select" || data.fieldType === "multi_select";
  const options = needsOptions ? (data.options ?? null) : null;

  // 해당 탭의 현재 마지막 displayOrder 계산
  const existing = await getFieldsForTabByInternalIds(
    tabInternalId,
    spaceInternalId,
  );
  const maxOrder = existing.reduce(
    (acc, f) => Math.max(acc, f.displayOrder),
    -1,
  );

  const now = new Date();

  const [field] = await db
    .insert(memberFieldDefinitions)
    .values({
      publicId: generatePublicId(ID_PREFIX.memberFields),
      spaceId: spaceInternalId,
      tabId: tabInternalId,
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
  fieldPublicId: string,
  spacePublicId: string,
  data: UpdateFieldInput,
): Promise<MemberFieldDefinition> {
  const db = getDb();

  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);
  const [existing] = await db
    .select()
    .from(memberFieldDefinitions)
    .where(
      and(
        eq(memberFieldDefinitions.publicId, fieldPublicId),
        eq(memberFieldDefinitions.spaceId, spaceInternalId),
      ),
    )
    .limit(1);

  if (!existing || existing.deletedAt) {
    throw new ServiceError(404, "필드를 찾지 못했습니다.");
  }

  let nextTabInternalId: bigint | undefined;
  if (data.tabId !== undefined) {
    const resolved = await resolveTabInternalIdByPublicId(data.tabId);
    if (resolved === null) {
      throw new ServiceError(404, "탭을 찾지 못했습니다.");
    }
    nextTabInternalId = resolved;
  }

  if (existing.sourceKey) {
    if (
      (data.fieldType !== undefined && data.fieldType !== existing.fieldType) ||
      data.options !== undefined ||
      (data.isRequired !== undefined &&
        data.isRequired !== existing.isRequired) ||
      (nextTabInternalId !== undefined && nextTabInternalId !== existing.tabId)
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
  if (nextTabInternalId !== undefined) patch.tabId = nextTabInternalId;

  const [updated] = await db
    .update(memberFieldDefinitions)
    .set(patch)
    .where(eq(memberFieldDefinitions.id, existing.id))
    .returning();

  if (!updated) throw new ServiceError(500, "필드를 수정하지 못했습니다.");

  return updated;
}

/**
 * 필드 삭제 (값도 CASCADE로 함께 삭제)
 */
export async function deleteField(
  fieldPublicId: string,
  spacePublicId: string,
): Promise<void> {
  const db = getDb();

  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);
  const [existing] = await db
    .select()
    .from(memberFieldDefinitions)
    .where(
      and(
        eq(memberFieldDefinitions.publicId, fieldPublicId),
        eq(memberFieldDefinitions.spaceId, spaceInternalId),
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
    .where(eq(memberFieldDefinitions.id, existing.id))
    .returning();

  if (!deleted) {
    throw new ServiceError(500, "필드를 삭제하지 못했습니다.");
  }
}

/**
 * 탭 내 필드 순서 일괄 변경
 * order: fieldPublicId 배열 (index = 새 displayOrder)
 */
export async function reorderFields(
  spacePublicId: string,
  order: string[],
): Promise<void> {
  const db = getDb();
  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);

  await Promise.all(
    order.map((fieldPublicId, idx) =>
      db
        .update(memberFieldDefinitions)
        .set({ displayOrder: idx, updatedAt: new Date() })
        .where(
          and(
            eq(memberFieldDefinitions.publicId, fieldPublicId),
            eq(memberFieldDefinitions.spaceId, spaceInternalId),
          ),
        ),
    ),
  );
}
