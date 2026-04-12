import { and, asc, eq, ne } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/server/db";
import {
  memberFieldDefinitions,
  memberTabDefinitions,
  spaceTemplates,
} from "@/server/db/schema";

import { ServiceError } from "./service-error";
import { createDefaultSystemTabs } from "./member-tabs-service";
import type { TabType } from "./member-tabs-service";
import type { FieldType } from "./member-fields-service";

/* ── 타입 ── */

export type SpaceTemplate = typeof spaceTemplates.$inferSelect;

export interface SpaceTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  tabCount: number;
  fieldCount: number;
  tabPreviewNames: string[];
  fieldPreviewNames: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SpaceTemplateDetail extends SpaceTemplateSummary {
  tabsConfig: TemplateTab[];
}

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

export interface UpdateTemplateInput {
  name?: string;
  description?: string | null;
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
        name: "메모",
        tabType: "system",
        systemKey: "memos",
        displayOrder: 2,
        fields: [],
      },
      {
        name: "리포트",
        tabType: "system",
        systemKey: "report",
        displayOrder: 3,
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
        name: "메모",
        tabType: "system",
        systemKey: "memos",
        displayOrder: 2,
        fields: [],
      },
      {
        name: "리포트",
        tabType: "system",
        systemKey: "report",
        displayOrder: 3,
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
        name: "메모",
        tabType: "system",
        systemKey: "memos",
        displayOrder: 2,
        fields: [],
      },
      {
        name: "리포트",
        tabType: "system",
        systemKey: "report",
        displayOrder: 3,
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
        name: "메모",
        tabType: "system",
        systemKey: "memos",
        displayOrder: 2,
        fields: [],
      },
      {
        name: "리포트",
        tabType: "system",
        systemKey: "report",
        displayOrder: 3,
        fields: [],
      },
    ],
  },
];

/* ── 내부 헬퍼 ── */

type Db = ReturnType<typeof getDb>;

function normalizeTemplateName(name: string) {
  const normalized = name.trim().slice(0, 80);
  if (!normalized) throw new ServiceError(400, "템플릿 이름은 필수입니다.");
  return normalized;
}

function normalizeTemplateDescription(description?: string | null) {
  const normalized = description?.trim().slice(0, 500) ?? "";
  return normalized || null;
}

export function summarizeSpaceTemplate(
  template: SpaceTemplate,
): SpaceTemplateSummary {
  const tabsConfig = template.tabsConfig as TemplateTab[];
  const tabPreviewNames = tabsConfig
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((tab) => tab.name)
    .slice(0, 4);
  const fieldPreviewNames = tabsConfig
    .flatMap((tab) =>
      tab.fields
        .slice()
        .sort((left, right) => left.displayOrder - right.displayOrder)
        .map((field) => field.name),
    )
    .slice(0, 6);

  return {
    id: template.id,
    name: template.name,
    description: template.description ?? null,
    isSystem: template.isSystem,
    tabCount: tabsConfig.length,
    fieldCount: tabsConfig.reduce((sum, tab) => sum + tab.fields.length, 0),
    tabPreviewNames,
    fieldPreviewNames,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export function detailSpaceTemplate(
  template: SpaceTemplate,
): SpaceTemplateDetail {
  return {
    ...summarizeSpaceTemplate(template),
    tabsConfig: (template.tabsConfig as TemplateTab[]).slice(),
  };
}

async function getAccessibleTemplate(templateId: string, userId: string) {
  const db = getDb();

  const [template] = await db
    .select()
    .from(spaceTemplates)
    .where(eq(spaceTemplates.id, templateId))
    .limit(1);

  if (!template) {
    throw new ServiceError(404, "템플릿을 찾지 못했습니다.");
  }

  if (!template.isSystem && template.createdByUserId !== userId) {
    throw new ServiceError(404, "템플릿을 찾지 못했습니다.");
  }

  return template;
}

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
 * 기존 시스템 템플릿을 정리한다.
 */
export async function seedSystemTemplates(): Promise<void> {
  const db = getDb();

  if (SYSTEM_TEMPLATES.length === 0) {
    return;
  }

  await db.delete(spaceTemplates).where(eq(spaceTemplates.isSystem, true));
}

/**
 * 템플릿 목록 조회
 * - 사용자 템플릿만 반환
 */
export async function listTemplates(userId?: string): Promise<SpaceTemplate[]> {
  const db = getDb();
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

  return userOnes;
}

/**
 * 사용자 정의 템플릿 생성
 */
export async function createTemplate(
  userId: string,
  data: CreateTemplateInput,
): Promise<SpaceTemplate> {
  const db = getDb();
  const name = normalizeTemplateName(data.name);

  const now = new Date();
  const [template] = await db
    .insert(spaceTemplates)
    .values({
      id: randomUUID(),
      createdByUserId: userId,
      name,
      description: normalizeTemplateDescription(data.description),
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

  await createDefaultSystemTabs(spaceId, userId);
  const template = await getAccessibleTemplate(templateId, userId);

  const config = template.tabsConfig as TemplateTab[];
  const now = new Date();

  const existingTabs = await db
    .select()
    .from(memberTabDefinitions)
    .where(eq(memberTabDefinitions.spaceId, spaceId));

  await db
    .delete(memberFieldDefinitions)
    .where(eq(memberFieldDefinitions.spaceId, spaceId));

  await db
    .delete(memberTabDefinitions)
    .where(
      and(
        eq(memberTabDefinitions.spaceId, spaceId),
        ne(memberTabDefinitions.tabType, "system"),
      ),
    );

  for (const tplTab of config) {
    if (tplTab.tabType === "system" && tplTab.systemKey) {
      const existing = existingTabs.find(
        (t) => t.systemKey === tplTab.systemKey,
      );
      if (!existing) continue;
      await db
        .update(memberTabDefinitions)
        .set({
          name: tplTab.name,
          displayOrder: tplTab.displayOrder,
          updatedAt: now,
        })
        .where(eq(memberTabDefinitions.id, existing.id));
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

export async function getTemplateForUser(
  templateId: string,
  userId: string,
): Promise<SpaceTemplate> {
  return getAccessibleTemplate(templateId, userId);
}

/**
 * 사용자 정의 템플릿 수정
 */
export async function updateTemplate(
  templateId: string,
  userId: string,
  data: UpdateTemplateInput,
): Promise<SpaceTemplate> {
  const db = getDb();

  const [template] = await db
    .select()
    .from(spaceTemplates)
    .where(eq(spaceTemplates.id, templateId))
    .limit(1);

  if (!template) throw new ServiceError(404, "템플릿을 찾지 못했습니다.");
  if (template.isSystem)
    throw new ServiceError(403, "시스템 템플릿은 수정할 수 없습니다.");
  if (template.createdByUserId !== userId)
    throw new ServiceError(404, "템플릿을 찾지 못했습니다.");

  const patch: Partial<typeof spaceTemplates.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) {
    patch.name = normalizeTemplateName(data.name);
  }

  if (data.description !== undefined) {
    patch.description = normalizeTemplateDescription(data.description);
  }

  const [updated] = await db
    .update(spaceTemplates)
    .set(patch)
    .where(eq(spaceTemplates.id, templateId))
    .returning();

  if (!updated) throw new ServiceError(500, "템플릿을 수정하지 못했습니다.");

  return updated;
}

/**
 * 템플릿 복제 (시스템/사용자 템플릿 모두 사용자 템플릿으로 복제)
 */
export async function duplicateTemplate(
  templateId: string,
  userId: string,
): Promise<SpaceTemplate> {
  const db = getDb();
  const template = await getAccessibleTemplate(templateId, userId);

  const now = new Date();
  const [duplicated] = await db
    .insert(spaceTemplates)
    .values({
      id: randomUUID(),
      createdByUserId: userId,
      name: normalizeTemplateName(`${template.name} 복사본`),
      description: normalizeTemplateDescription(template.description),
      isSystem: false,
      tabsConfig: template.tabsConfig,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!duplicated) {
    throw new ServiceError(500, "템플릿을 복제하지 못했습니다.");
  }

  return duplicated;
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
