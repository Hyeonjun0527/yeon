import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/server/db";
import {
  memberFieldDefinitions,
  memberTabDefinitions,
  spaceTemplates,
} from "@/server/db/schema";

import { ServiceError } from "./service-error";
import type { TabType } from "./member-tabs-service";
import type { FieldType } from "./member-fields-service";

/* ── 타입 ── */

export type SpaceTemplate = typeof spaceTemplates.$inferSelect;

export interface TemplateField {
  name: string;
  fieldType: FieldType;
  options?: { value: string; color: string }[] | null;
  isRequired: boolean;
  displayOrder: number;
}

export interface TemplateTab {
  name: string;
  tabType: TabType;
  systemKey?: string | null;
  displayOrder: number;
  fields: TemplateField[];
}

export interface CreateTemplateInput {
  name: string;
  description?: string | null;
  tabsConfig: TemplateTab[];
}

/* ── 시스템 템플릿 정의 ── */

const SYSTEM_TEMPLATES: {
  name: string;
  description: string;
  tabsConfig: TemplateTab[];
}[] = [
  {
    name: "기본",
    description: "필수 탭만 포함된 기본 구성입니다.",
    tabsConfig: [
      {
        name: "개요",
        tabType: "system",
        systemKey: "overview",
        displayOrder: 0,
        fields: [],
      },
      {
        name: "상담기록",
        tabType: "system",
        systemKey: "counseling",
        displayOrder: 1,
        fields: [],
      },
      {
        name: "수강이력",
        tabType: "system",
        systemKey: "courses",
        displayOrder: 2,
        fields: [],
      },
      {
        name: "비상연락처",
        tabType: "system",
        systemKey: "guardian",
        displayOrder: 3,
        fields: [],
      },
      {
        name: "메모",
        tabType: "system",
        systemKey: "memos",
        displayOrder: 4,
        fields: [],
      },
      {
        name: "리포트",
        tabType: "system",
        systemKey: "report",
        displayOrder: 5,
        fields: [],
      },
    ],
  },
  {
    name: "부트캠프",
    description:
      "개발 부트캠프에 최적화된 구성입니다. 트랙, 기수, GitHub 등 필드를 포함합니다.",
    tabsConfig: [
      {
        name: "개요",
        tabType: "system",
        systemKey: "overview",
        displayOrder: 0,
        fields: [
          {
            name: "트랙",
            fieldType: "select",
            isRequired: false,
            displayOrder: 0,
            options: [
              { value: "프론트엔드", color: "#818cf8" },
              { value: "백엔드", color: "#34d399" },
              { value: "풀스택", color: "#fbbf24" },
              { value: "데이터", color: "#f87171" },
            ],
          },
          {
            name: "기수",
            fieldType: "text",
            isRequired: false,
            displayOrder: 1,
          },
          {
            name: "GitHub",
            fieldType: "url",
            isRequired: false,
            displayOrder: 2,
          },
          {
            name: "포트폴리오",
            fieldType: "url",
            isRequired: false,
            displayOrder: 3,
          },
        ],
      },
      {
        name: "상담기록",
        tabType: "system",
        systemKey: "counseling",
        displayOrder: 1,
        fields: [],
      },
      {
        name: "수강이력",
        tabType: "system",
        systemKey: "courses",
        displayOrder: 2,
        fields: [],
      },
      {
        name: "비상연락처",
        tabType: "system",
        systemKey: "guardian",
        displayOrder: 3,
        fields: [],
      },
      {
        name: "메모",
        tabType: "system",
        systemKey: "memos",
        displayOrder: 4,
        fields: [],
      },
      {
        name: "리포트",
        tabType: "system",
        systemKey: "report",
        displayOrder: 5,
        fields: [],
      },
    ],
  },
  {
    name: "디자인스쿨",
    description:
      "디자인 교육 과정에 맞는 구성입니다. 포트폴리오, 툴 스택, Behance 필드를 포함합니다.",
    tabsConfig: [
      {
        name: "개요",
        tabType: "system",
        systemKey: "overview",
        displayOrder: 0,
        fields: [
          {
            name: "포트폴리오",
            fieldType: "url",
            isRequired: false,
            displayOrder: 0,
          },
          {
            name: "Behance",
            fieldType: "url",
            isRequired: false,
            displayOrder: 1,
          },
          {
            name: "툴 스택",
            fieldType: "multi_select",
            isRequired: false,
            displayOrder: 2,
            options: [
              { value: "Figma", color: "#818cf8" },
              { value: "Photoshop", color: "#34d399" },
              { value: "Illustrator", color: "#fbbf24" },
              { value: "Blender", color: "#f87171" },
            ],
          },
          {
            name: "전공",
            fieldType: "text",
            isRequired: false,
            displayOrder: 3,
          },
        ],
      },
      {
        name: "상담기록",
        tabType: "system",
        systemKey: "counseling",
        displayOrder: 1,
        fields: [],
      },
      {
        name: "수강이력",
        tabType: "system",
        systemKey: "courses",
        displayOrder: 2,
        fields: [],
      },
      {
        name: "비상연락처",
        tabType: "system",
        systemKey: "guardian",
        displayOrder: 3,
        fields: [],
      },
      {
        name: "메모",
        tabType: "system",
        systemKey: "memos",
        displayOrder: 4,
        fields: [],
      },
      {
        name: "리포트",
        tabType: "system",
        systemKey: "report",
        displayOrder: 5,
        fields: [],
      },
    ],
  },
  {
    name: "어학원",
    description:
      "외국어 교육 과정에 맞는 구성입니다. 레벨, 목표 점수, 시험일 필드를 포함합니다.",
    tabsConfig: [
      {
        name: "개요",
        tabType: "system",
        systemKey: "overview",
        displayOrder: 0,
        fields: [
          {
            name: "언어",
            fieldType: "select",
            isRequired: false,
            displayOrder: 0,
            options: [
              { value: "영어", color: "#818cf8" },
              { value: "일본어", color: "#34d399" },
              { value: "중국어", color: "#fbbf24" },
              { value: "스페인어", color: "#f87171" },
            ],
          },
          {
            name: "현재 레벨",
            fieldType: "text",
            isRequired: false,
            displayOrder: 1,
          },
          {
            name: "목표 점수",
            fieldType: "text",
            isRequired: false,
            displayOrder: 2,
          },
          {
            name: "시험 예정일",
            fieldType: "date",
            isRequired: false,
            displayOrder: 3,
          },
        ],
      },
      {
        name: "상담기록",
        tabType: "system",
        systemKey: "counseling",
        displayOrder: 1,
        fields: [],
      },
      {
        name: "수강이력",
        tabType: "system",
        systemKey: "courses",
        displayOrder: 2,
        fields: [],
      },
      {
        name: "비상연락처",
        tabType: "system",
        systemKey: "guardian",
        displayOrder: 3,
        fields: [],
      },
      {
        name: "메모",
        tabType: "system",
        systemKey: "memos",
        displayOrder: 4,
        fields: [],
      },
      {
        name: "리포트",
        tabType: "system",
        systemKey: "report",
        displayOrder: 5,
        fields: [],
      },
    ],
  },
];

/* ── 내부 헬퍼 ── */

type Db = ReturnType<typeof getDb>;

/** 필드 행들을 탭에 삽입 (offsetOrder부터 순번 할당) */
async function insertFieldRows(
  tabId: string,
  fields: TemplateField[],
  spaceId: string,
  userId: string,
  db: Db,
  now: Date,
  offsetOrder: number,
): Promise<void> {
  for (const [i, f] of fields.entries()) {
    await db.insert(memberFieldDefinitions).values({
      id: randomUUID(),
      spaceId,
      tabId,
      createdByUserId: userId,
      name: f.name,
      fieldType: f.fieldType,
      options: (f.options ?? null) as unknown,
      isRequired: f.isRequired,
      displayOrder: offsetOrder + i,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/** 기존 시스템 탭에 템플릿 필드 추가 (기존 필드 순번 이후부터 삽입) */
async function applySystemTabFields(
  existingTabId: string,
  fields: TemplateField[],
  spaceId: string,
  userId: string,
  db: Db,
  now: Date,
): Promise<void> {
  const existingFields = await db
    .select()
    .from(memberFieldDefinitions)
    .where(eq(memberFieldDefinitions.tabId, existingTabId));

  const maxOrder = existingFields.reduce(
    (acc, f) => Math.max(acc, f.displayOrder),
    -1,
  );
  await insertFieldRows(
    existingTabId,
    fields,
    spaceId,
    userId,
    db,
    now,
    maxOrder + 1,
  );
}

/** 커스텀 탭을 새로 생성하고 필드 삽입 */
async function createCustomTabWithFields(
  tplTab: TemplateTab,
  spaceId: string,
  userId: string,
  db: Db,
  now: Date,
): Promise<void> {
  const [newTab] = await db
    .insert(memberTabDefinitions)
    .values({
      id: randomUUID(),
      spaceId,
      createdByUserId: userId,
      tabType: "custom",
      systemKey: null,
      name: tplTab.name,
      isVisible: true,
      displayOrder: tplTab.displayOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!newTab) return;
  await insertFieldRows(newTab.id, tplTab.fields, spaceId, userId, db, now, 0);
}

/* ── 서비스 함수 ── */

/**
 * 시스템 템플릿 4개를 seed (이미 있으면 skip)
 */
export async function seedSystemTemplates(): Promise<void> {
  const db = getDb();

  const existing = await db
    .select()
    .from(spaceTemplates)
    .where(eq(spaceTemplates.isSystem, true));

  if (existing.length >= SYSTEM_TEMPLATES.length) return;

  const existingNames = new Set(existing.map((t) => t.name));
  const now = new Date();

  const toInsert = SYSTEM_TEMPLATES.filter(
    (t) => !existingNames.has(t.name),
  ).map((t) => ({
    id: randomUUID(),
    createdByUserId: null,
    name: t.name,
    description: t.description,
    isSystem: true,
    tabsConfig: t.tabsConfig as unknown,
    createdAt: now,
    updatedAt: now,
  }));

  if (toInsert.length > 0) {
    await db.insert(spaceTemplates).values(toInsert);
  }
}

/**
 * 템플릿 목록 조회
 * - 시스템 템플릿 먼저, 그 다음 사용자 템플릿
 */
export async function listTemplates(userId?: string): Promise<SpaceTemplate[]> {
  const db = getDb();

  const systemOnes = await db
    .select()
    .from(spaceTemplates)
    .where(eq(spaceTemplates.isSystem, true))
    .orderBy(asc(spaceTemplates.createdAt));

  const userOnes = userId
    ? await db
        .select()
        .from(spaceTemplates)
        .where(
          and(
            eq(spaceTemplates.isSystem, false),
            eq(spaceTemplates.createdByUserId, userId),
          ),
        )
        .orderBy(asc(spaceTemplates.createdAt))
    : [];

  return [...systemOnes, ...userOnes];
}

/**
 * 사용자 정의 템플릿 생성
 */
export async function createTemplate(
  userId: string,
  data: CreateTemplateInput,
): Promise<SpaceTemplate> {
  const db = getDb();
  const name = data.name.trim().slice(0, 80);
  if (!name) throw new ServiceError(400, "템플릿 이름은 필수입니다.");

  const now = new Date();
  const [template] = await db
    .insert(spaceTemplates)
    .values({
      id: randomUUID(),
      createdByUserId: userId,
      name,
      description: data.description ?? null,
      isSystem: false,
      tabsConfig: data.tabsConfig as unknown,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!template) throw new ServiceError(500, "템플릿을 생성하지 못했습니다.");
  return template;
}

/**
 * 현재 스페이스 구조를 스냅샷하여 사용자 템플릿으로 저장
 */
export async function snapshotSpaceAsTemplate(
  spaceId: string,
  userId: string,
  name: string,
  description?: string | null,
): Promise<SpaceTemplate> {
  const db = getDb();

  const tabs = await db
    .select()
    .from(memberTabDefinitions)
    .where(eq(memberTabDefinitions.spaceId, spaceId))
    .orderBy(asc(memberTabDefinitions.displayOrder));

  const tabsConfig: TemplateTab[] = await Promise.all(
    tabs.map(async (tab) => {
      const fields = await db
        .select()
        .from(memberFieldDefinitions)
        .where(eq(memberFieldDefinitions.tabId, tab.id))
        .orderBy(asc(memberFieldDefinitions.displayOrder));

      return {
        name: tab.name,
        tabType: tab.tabType as TabType,
        systemKey: tab.systemKey,
        displayOrder: tab.displayOrder,
        fields: fields.map((f) => ({
          name: f.name,
          fieldType: f.fieldType as FieldType,
          options: f.options as { value: string; color: string }[] | null,
          isRequired: f.isRequired,
          displayOrder: f.displayOrder,
        })),
      };
    }),
  );

  return createTemplate(userId, { name, description, tabsConfig });
}

/**
 * 템플릿을 스페이스에 적용
 * - 시스템 탭: 기존 탭에 필드만 추가
 * - 커스텀 탭: 탭 생성 후 필드 삽입
 */
export async function applyTemplateToSpace(
  templateId: string,
  spaceId: string,
  userId: string,
): Promise<void> {
  const db = getDb();

  const [template] = await db
    .select()
    .from(spaceTemplates)
    .where(eq(spaceTemplates.id, templateId))
    .limit(1);

  if (!template) throw new ServiceError(404, "템플릿을 찾지 못했습니다.");

  const config = template.tabsConfig as TemplateTab[];
  const now = new Date();

  const existingTabs = await db
    .select()
    .from(memberTabDefinitions)
    .where(eq(memberTabDefinitions.spaceId, spaceId));

  for (const tplTab of config) {
    if (tplTab.tabType === "system" && tplTab.systemKey) {
      const existing = existingTabs.find(
        (t) => t.systemKey === tplTab.systemKey,
      );
      if (!existing) continue;
      await applySystemTabFields(
        existing.id,
        tplTab.fields,
        spaceId,
        userId,
        db,
        now,
      );
    } else {
      await createCustomTabWithFields(tplTab, spaceId, userId, db, now);
    }
  }
}

/**
 * 단일 템플릿 조회
 */
export async function getTemplate(templateId: string): Promise<SpaceTemplate> {
  const db = getDb();
  const [template] = await db
    .select()
    .from(spaceTemplates)
    .where(eq(spaceTemplates.id, templateId))
    .limit(1);

  if (!template) throw new ServiceError(404, "템플릿을 찾지 못했습니다.");
  return template;
}

/**
 * 사용자 정의 템플릿 삭제 (시스템 템플릿 삭제 시도 → 403)
 */
export async function deleteTemplate(
  templateId: string,
  userId: string,
): Promise<void> {
  const db = getDb();

  const [template] = await db
    .select()
    .from(spaceTemplates)
    .where(eq(spaceTemplates.id, templateId))
    .limit(1);

  if (!template) throw new ServiceError(404, "템플릿을 찾지 못했습니다.");
  if (template.isSystem)
    throw new ServiceError(403, "시스템 템플릿은 삭제할 수 없습니다.");
  if (template.createdByUserId !== userId)
    throw new ServiceError(404, "템플릿을 찾지 못했습니다.");

  await db.delete(spaceTemplates).where(eq(spaceTemplates.id, templateId));
}
