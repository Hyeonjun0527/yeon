import { and, asc, eq, ne } from "drizzle-orm";
import type {
  CreateMemberTabBody,
  MemberTabSystemKey,
  MemberTabType,
  UpdateMemberTabBody,
} from "@yeon/api-contract/spaces";

import { isProtectedMemberTabSystemKey } from "@/lib/member-tab-policy";
import { getDb } from "@/server/db";
import { memberTabDefinitions } from "@/server/db/schema";
import { generatePublicId, ID_PREFIX } from "@/server/lib/public-id";

import { ServiceError } from "./service-error";
import { createDefaultOverviewFields } from "./member-fields-service";
import { requireSpaceInternalIdByPublicId } from "./spaces-service";

/* ── 타입 ── */

export type TabType = MemberTabType;

export type SystemKey = MemberTabSystemKey;

export type MemberTabDefinition = typeof memberTabDefinitions.$inferSelect;

export type CreateCustomTabInput = CreateMemberTabBody;

export type UpdateTabInput = UpdateMemberTabBody;

/* ── 기본 시스템 탭 5개 ── */

const DEFAULT_SYSTEM_TABS: {
  systemKey: SystemKey;
  name: string;
  displayOrder: number;
}[] = [
  { systemKey: "overview", name: "개요", displayOrder: 0 },
  { systemKey: "student_board", name: "출석·과제", displayOrder: 1 },
  { systemKey: "counseling", name: "상담기록", displayOrder: 2 },
  { systemKey: "memos", name: "메모", displayOrder: 3 },
  { systemKey: "report", name: "리포트", displayOrder: 4 },
];

/* ── ID 해석 헬퍼 ── */

export async function resolveTabInternalIdByPublicId(
  publicId: string,
): Promise<bigint | null> {
  const [row] = await getDb()
    .select({ id: memberTabDefinitions.id })
    .from(memberTabDefinitions)
    .where(eq(memberTabDefinitions.publicId, publicId))
    .limit(1);
  return row?.id ?? null;
}

/* ── 서비스 함수 ── */

/**
 * 스페이스 생성 시 호출 — 시스템 탭 4개를 일괄 INSERT
 * 이미 존재하면 UNIQUE 충돌로 skip (ON CONFLICT DO NOTHING)
 *
 * spaceId는 이미 resolve 된 내부 bigint id를 받는다 (스페이스 생성 직후 호출됨).
 */
export async function createDefaultSystemTabs(
  spaceInternalId: bigint,
  userId: string,
): Promise<void> {
  const db = getDb();
  const now = new Date();

  const rows = DEFAULT_SYSTEM_TABS.map((t) => ({
    publicId: generatePublicId(ID_PREFIX.memberTabs),
    spaceId: spaceInternalId,
    createdByUserId: userId,
    tabType: "system" as TabType,
    systemKey: t.systemKey,
    name: t.name,
    isVisible: true,
    displayOrder: t.displayOrder,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(memberTabDefinitions).values(rows).onConflictDoNothing();

  const overviewTab = await getOverviewTabByInternalSpaceId(spaceInternalId);
  if (overviewTab) {
    await createDefaultOverviewFields(spaceInternalId, overviewTab.id, userId);
  }
}

/**
 * 스페이스의 탭 목록 조회 (display_order 오름차순)
 */
export async function getTabsForSpace(
  spacePublicId: string,
): Promise<MemberTabDefinition[]> {
  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);
  return getTabsForSpaceByInternalId(spaceInternalId);
}

export async function getTabsForSpaceByInternalId(
  spaceInternalId: bigint,
): Promise<MemberTabDefinition[]> {
  const db = getDb();

  return db
    .select()
    .from(memberTabDefinitions)
    .where(eq(memberTabDefinitions.spaceId, spaceInternalId))
    .orderBy(asc(memberTabDefinitions.displayOrder));
}

/**
 * overview 탭 레코드 조회 (필드 배치 시 참조용)
 */
export async function getOverviewTab(
  spacePublicId: string,
): Promise<MemberTabDefinition | null> {
  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);
  return getOverviewTabByInternalSpaceId(spaceInternalId);
}

export async function getOverviewTabByInternalSpaceId(
  spaceInternalId: bigint,
): Promise<MemberTabDefinition | null> {
  const db = getDb();

  const [tab] = await db
    .select()
    .from(memberTabDefinitions)
    .where(
      and(
        eq(memberTabDefinitions.spaceId, spaceInternalId),
        eq(memberTabDefinitions.systemKey, "overview"),
      ),
    )
    .limit(1);

  return tab ?? null;
}

/**
 * 커스텀 탭 생성
 */
export async function createCustomTab(
  spacePublicId: string,
  userId: string,
  data: CreateCustomTabInput,
): Promise<MemberTabDefinition> {
  const db = getDb();
  const name = data.name.trim().slice(0, 80);

  if (!name) {
    throw new ServiceError(400, "탭 이름은 필수입니다.");
  }

  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);
  const existing = await getTabsForSpaceByInternalId(spaceInternalId);
  const maxOrder = existing.reduce(
    (acc, t) => Math.max(acc, t.displayOrder),
    -1,
  );

  const now = new Date();

  const [tab] = await db
    .insert(memberTabDefinitions)
    .values({
      publicId: generatePublicId(ID_PREFIX.memberTabs),
      spaceId: spaceInternalId,
      createdByUserId: userId,
      tabType: "custom",
      systemKey: null,
      name,
      isVisible: true,
      displayOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!tab) throw new ServiceError(500, "탭을 생성하지 못했습니다.");

  return tab;
}

/**
 * 탭 수정 (이름 / 숨김 / 순서)
 * overview 탭은 isVisible 변경 불가
 */
export async function updateTab(
  tabPublicId: string,
  spacePublicId: string,
  data: UpdateTabInput,
): Promise<MemberTabDefinition> {
  const db = getDb();

  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);
  const [existing] = await db
    .select()
    .from(memberTabDefinitions)
    .where(
      and(
        eq(memberTabDefinitions.publicId, tabPublicId),
        eq(memberTabDefinitions.spaceId, spaceInternalId),
      ),
    )
    .limit(1);

  if (!existing) throw new ServiceError(404, "탭을 찾지 못했습니다.");

  if (isProtectedMemberTabSystemKey(existing.systemKey)) {
    throw new ServiceError(403, "기본 탭은 수정할 수 없습니다.");
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (data.name !== undefined) {
    const name = data.name.trim().slice(0, 80);
    if (!name) throw new ServiceError(400, "탭 이름은 필수입니다.");
    patch.name = name;
  }
  if (data.isVisible !== undefined) patch.isVisible = data.isVisible;
  if (data.displayOrder !== undefined) patch.displayOrder = data.displayOrder;

  const [updated] = await db
    .update(memberTabDefinitions)
    .set(patch)
    .where(eq(memberTabDefinitions.id, existing.id))
    .returning();

  if (!updated) throw new ServiceError(500, "탭을 수정하지 못했습니다.");

  return updated;
}

/**
 * 커스텀 탭 삭제 (시스템 탭 삭제 시도 → 403)
 */
export async function deleteCustomTab(
  tabPublicId: string,
  spacePublicId: string,
): Promise<void> {
  const db = getDb();

  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);
  const [existing] = await db
    .select()
    .from(memberTabDefinitions)
    .where(
      and(
        eq(memberTabDefinitions.publicId, tabPublicId),
        eq(memberTabDefinitions.spaceId, spaceInternalId),
      ),
    )
    .limit(1);

  if (!existing) throw new ServiceError(404, "탭을 찾지 못했습니다.");

  if (isProtectedMemberTabSystemKey(existing.systemKey)) {
    throw new ServiceError(403, "기본 탭은 삭제할 수 없습니다.");
  }

  if (existing.tabType === "system") {
    throw new ServiceError(403, "시스템 탭은 삭제할 수 없습니다.");
  }

  await db
    .delete(memberTabDefinitions)
    .where(eq(memberTabDefinitions.id, existing.id));
}

/**
 * 스페이스 탭 구성을 기본값으로 초기화
 * - 커스텀 탭 전부 삭제 (필드 CASCADE 삭제)
 * - 시스템 탭 이름/순서/isVisible 원래대로 복원
 */
export async function resetSpaceTabsToDefaults(
  spacePublicId: string,
): Promise<void> {
  const db = getDb();
  const now = new Date();
  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);

  // 커스텀 탭 삭제 (필드는 CASCADE로 자동 삭제)
  await db
    .delete(memberTabDefinitions)
    .where(
      and(
        eq(memberTabDefinitions.spaceId, spaceInternalId),
        ne(memberTabDefinitions.tabType, "system"),
      ),
    );

  // 시스템 탭 원상 복구
  await Promise.all(
    DEFAULT_SYSTEM_TABS.map((def) =>
      db
        .update(memberTabDefinitions)
        .set({
          name: def.name,
          displayOrder: def.displayOrder,
          isVisible: true,
          updatedAt: now,
        })
        .where(
          and(
            eq(memberTabDefinitions.spaceId, spaceInternalId),
            eq(memberTabDefinitions.systemKey, def.systemKey),
          ),
        ),
    ),
  );
}

/**
 * 탭 순서 일괄 변경
 * order: tabPublicId 배열 (index = 새 displayOrder)
 */
export async function reorderTabs(
  spacePublicId: string,
  order: string[],
): Promise<void> {
  const db = getDb();
  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);

  await Promise.all(
    order.map((tabPublicId, idx) =>
      db
        .update(memberTabDefinitions)
        .set({ displayOrder: idx, updatedAt: new Date() })
        .where(
          and(
            eq(memberTabDefinitions.publicId, tabPublicId),
            eq(memberTabDefinitions.spaceId, spaceInternalId),
          ),
        ),
    ),
  );
}
