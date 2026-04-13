import { randomUUID } from "node:crypto";

import { z } from "zod";

import { getDb } from "@/server/db";
import {
  memberFieldDefinitions,
  memberFieldValues,
  memberTabDefinitions,
  members,
  spaces,
} from "@/server/db/schema";

import { buildValueColumns } from "./member-field-values-service";
import { type FieldType } from "./member-fields-service";
import { ServiceError } from "./service-error";

export const studentImportSchema = z.object({
  name: z.string().min(1),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  status: z.string().nullish(),
  customFields: z.record(z.string(), z.string().nullish()).nullish(),
});

export const cohortImportSchema = z.object({
  name: z.string().min(1),
  students: z.array(studentImportSchema),
});

export const importPreviewBodySchema = z.object({
  cohorts: z.array(cohortImportSchema).min(1),
});

export type ImportPreviewBody = z.infer<typeof importPreviewBodySchema>;

type CustomFieldEntry = {
  name: string;
  value: string | null;
};

const DEFAULT_SYSTEM_TABS = [
  { systemKey: "overview", name: "개요", displayOrder: 0 },
  { systemKey: "counseling", name: "상담기록", displayOrder: 1 },
  { systemKey: "memos", name: "메모", displayOrder: 2 },
  { systemKey: "report", name: "리포트", displayOrder: 3 },
] as const;

const MEMBER_INSERT_CHUNK_SIZE = 500;
const FIELD_VALUE_INSERT_CHUNK_SIZE = 500;

function normalizeCustomFieldEntries(
  customFields: Record<string, string | null | undefined> | null | undefined,
): CustomFieldEntry[] {
  return Object.entries(customFields ?? {}).flatMap(([rawName, rawValue]) => {
    const name = rawName.trim().slice(0, 80);
    if (!name) return [];
    const value = typeof rawValue === "string" ? rawValue.trim() || null : null;
    return [{ name, value }];
  });
}

function normalizeSpaceName(value: string) {
  const name = value.trim().slice(0, 100);
  if (!name) {
    throw new ServiceError(400, "스페이스 이름은 필수입니다.");
  }
  return name;
}

function normalizeMemberRow(
  spaceId: string,
  student: ImportPreviewBody["cohorts"][number]["students"][number],
  now: Date,
) {
  const name = student.name.trim().slice(0, 100);
  if (!name) {
    throw new ServiceError(400, "수강생 이름은 필수입니다.");
  }

  return {
    id: randomUUID(),
    spaceId,
    name,
    email: student.email?.trim().slice(0, 255) || null,
    phone: student.phone?.trim().slice(0, 20) || null,
    status: student.status?.trim().slice(0, 20) || "active",
    initialRiskLevel: null,
    createdAt: now,
    updatedAt: now,
  };
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function looksLikePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 12;
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value) || /^www\./i.test(value);
}

function looksLikeDate(value: string) {
  return /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(value);
}

function inferCustomFieldType(name: string, values: string[]): FieldType {
  const loweredName = name.toLowerCase();

  if (/이메일|e-?mail|email/.test(name) || values.some(looksLikeEmail)) {
    return "email";
  }

  if (
    /연락처|전화|휴대폰|핸드폰|phone|mobile|tel/.test(name) ||
    values.some(looksLikePhone)
  ) {
    return "phone";
  }

  if (
    /url|링크|github|git|포트폴리오|portfolio|behance|notion|blog|website|site|homepage/.test(
      loweredName,
    ) ||
    values.some(looksLikeUrl)
  ) {
    return "url";
  }

  if (
    /생년월일|날짜|date|시작일|종료일/.test(name) ||
    values.some(looksLikeDate)
  ) {
    return "date";
  }

  if (values.some((value) => value.length > 100 || value.includes("\n"))) {
    return "long_text";
  }

  return "text";
}

function collectCustomFieldSpecs(
  students: ImportPreviewBody["cohorts"][number]["students"],
) {
  const samples = new Map<string, string[]>();

  for (const student of students) {
    for (const { name, value } of normalizeCustomFieldEntries(
      student.customFields,
    )) {
      const existing = samples.get(name);
      if (existing) {
        if (value) existing.push(value);
        continue;
      }
      samples.set(name, value ? [value] : []);
    }
  }

  return Array.from(samples.entries())
    .filter(([, values]) => values.length > 0)
    .map(([name, values]) => ({
      name,
      fieldType: inferCustomFieldType(name, values),
    }));
}

export async function importPreviewIntoSpaces(
  userId: string,
  preview: ImportPreviewBody,
) {
  const db = getDb();
  let spacesCreated = 0;
  let membersCreated = 0;
  const spaceIds: string[] = [];

  for (const cohort of preview.cohorts) {
    const cohortMemberRows = cohort.students.map((student) => ({
      student,
      customFieldEntries: normalizeCustomFieldEntries(student.customFields),
    }));

    await db.transaction(async (tx) => {
      const now = new Date();
      const spaceId = randomUUID();
      const spaceName = normalizeSpaceName(cohort.name);
      spaceIds.push(spaceId);

      await tx.insert(spaces).values({
        id: spaceId,
        name: spaceName,
        description: null,
        startDate: null,
        endDate: null,
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      });

      const tabRows = DEFAULT_SYSTEM_TABS.map((tab) => ({
        id: randomUUID(),
        spaceId,
        createdByUserId: userId,
        tabType: "system",
        systemKey: tab.systemKey,
        name: tab.name,
        isVisible: true,
        displayOrder: tab.displayOrder,
        createdAt: now,
        updatedAt: now,
      }));

      await tx.insert(memberTabDefinitions).values(tabRows);

      const overviewTab = tabRows.find((tab) => tab.systemKey === "overview");
      if (!overviewTab) {
        throw new ServiceError(
          500,
          "가져오기용 개요 탭을 준비하지 못했습니다.",
        );
      }

      const customFieldSpecs = collectCustomFieldSpecs(cohort.students);
      const fieldDefinitionsByName = new Map<
        string,
        { id: string; fieldType: FieldType }
      >();

      if (customFieldSpecs.length > 0) {
        const fieldRows = customFieldSpecs.map((fieldSpec, index) => {
          const id = randomUUID();
          fieldDefinitionsByName.set(fieldSpec.name, {
            id,
            fieldType: fieldSpec.fieldType,
          });

          return {
            id,
            spaceId,
            tabId: overviewTab.id,
            createdByUserId: userId,
            name: fieldSpec.name,
            fieldType: fieldSpec.fieldType,
            options: null,
            isRequired: false,
            displayOrder: index,
            createdAt: now,
            updatedAt: now,
          };
        });

        await tx.insert(memberFieldDefinitions).values(fieldRows);
      }

      const memberRows = cohortMemberRows.map(({ student }) =>
        normalizeMemberRow(spaceId, student, now),
      );

      for (const chunk of chunkArray(memberRows, MEMBER_INSERT_CHUNK_SIZE)) {
        await tx.insert(members).values(chunk);
      }

      const fieldValueRows = cohortMemberRows.flatMap(
        ({ customFieldEntries }, studentIndex) => {
          const memberId = memberRows[studentIndex]?.id;
          if (!memberId) return [];

          return customFieldEntries.flatMap(({ name, value }) => {
            const fieldDefinition = fieldDefinitionsByName.get(name);
            if (!fieldDefinition || value === null) return [];

            return {
              id: randomUUID(),
              memberId,
              fieldDefinitionId: fieldDefinition.id,
              ...buildValueColumns(fieldDefinition.fieldType, value),
              createdAt: now,
              updatedAt: now,
            };
          });
        },
      );

      for (const chunk of chunkArray(
        fieldValueRows,
        FIELD_VALUE_INSERT_CHUNK_SIZE,
      )) {
        await tx.insert(memberFieldValues).values(chunk);
      }
    });

    spacesCreated++;
    membersCreated += cohort.students.length;
  }

  return {
    spaces: spacesCreated,
    members: membersCreated,
    spaceIds,
  };
}
