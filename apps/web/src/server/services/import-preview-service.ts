import { z } from "zod";

import { getDb } from "@/server/db";
import {
  memberFieldDefinitions,
  memberFieldValues,
  memberTabDefinitions,
  members,
  spaces,
} from "@/server/db/schema";
import {
  getSpacePeriodInputError,
  normalizeSpaceDateInput,
} from "@/lib/space-period";
import { generatePublicId, ID_PREFIX } from "@/server/lib/public-id";

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
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
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
  { systemKey: "student_board", name: "출석·과제", displayOrder: 1 },
  { systemKey: "counseling", name: "상담기록", displayOrder: 2 },
  { systemKey: "memos", name: "메모", displayOrder: 3 },
  { systemKey: "report", name: "리포트", displayOrder: 4 },
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

function normalizeCohortPeriod(cohort: ImportPreviewBody["cohorts"][number]): {
  startDate: string | null;
  endDate: string | null;
} {
  const startDate = normalizeSpaceDateInput(cohort.startDate);
  const endDate = normalizeSpaceDateInput(cohort.endDate);
  const periodError = getSpacePeriodInputError(startDate, endDate);

  if (periodError) {
    throw new ServiceError(
      400,
      `"${normalizeSpaceName(cohort.name)}" 진행기간이 올바르지 않습니다. ${periodError}`,
    );
  }

  return { startDate, endDate };
}

function normalizeMemberRow(
  spaceInternalId: bigint,
  student: ImportPreviewBody["cohorts"][number]["students"][number],
  now: Date,
) {
  const name = student.name.trim().slice(0, 100);
  if (!name) {
    throw new ServiceError(400, "수강생 이름은 필수입니다.");
  }

  return {
    publicId: generatePublicId(ID_PREFIX.members),
    spaceId: spaceInternalId,
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

const LEGACY_GUARDIAN_PLAIN_TEXT_FIELD_PATTERN = /^(긴급|비상)연락처(관계)?$/;

export function inferCustomFieldType(
  name: string,
  values: string[],
): FieldType {
  const loweredName = name.toLowerCase();
  const compactName = name.replace(/\s+/g, "");

  if (LEGACY_GUARDIAN_PLAIN_TEXT_FIELD_PATTERN.test(compactName)) {
    return "text";
  }

  if (/관계/.test(name) || /relation/.test(loweredName)) {
    return "text";
  }

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
  return db.transaction(async (tx) => {
    let spacesCreated = 0;
    let membersCreated = 0;
    const spacePublicIds: string[] = [];

    for (const cohort of preview.cohorts) {
      const cohortMemberRows = cohort.students.map((student) => ({
        student,
        customFieldEntries: normalizeCustomFieldEntries(student.customFields),
      }));
      const now = new Date();
      const spaceName = normalizeSpaceName(cohort.name);
      const period = normalizeCohortPeriod(cohort);

      // 수강생 이름 유효성을 먼저 확인해 실패 시 space 를 만들지 않게 한다.
      for (const { student } of cohortMemberRows) {
        if (!student.name.trim()) {
          throw new ServiceError(400, "수강생 이름은 필수입니다.");
        }
      }

      const [createdSpace] = await tx
        .insert(spaces)
        .values({
          publicId: generatePublicId(ID_PREFIX.spaces),
          name: spaceName,
          description: null,
          startDate: period.startDate,
          endDate: period.endDate,
          createdByUserId: userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: spaces.id, publicId: spaces.publicId });

      if (!createdSpace) {
        throw new ServiceError(500, "스페이스를 생성하지 못했습니다.");
      }

      const spaceInternalId = createdSpace.id;
      spacePublicIds.push(createdSpace.publicId);

      const insertedTabs = await tx
        .insert(memberTabDefinitions)
        .values(
          DEFAULT_SYSTEM_TABS.map((tab) => ({
            publicId: generatePublicId(ID_PREFIX.memberTabs),
            spaceId: spaceInternalId,
            createdByUserId: userId,
            tabType: "system",
            systemKey: tab.systemKey,
            name: tab.name,
            isVisible: true,
            displayOrder: tab.displayOrder,
            createdAt: now,
            updatedAt: now,
          })),
        )
        .returning({
          id: memberTabDefinitions.id,
          systemKey: memberTabDefinitions.systemKey,
        });

      const overviewTab = insertedTabs.find(
        (tab) => tab.systemKey === "overview",
      );
      if (!overviewTab) {
        throw new ServiceError(
          500,
          "가져오기용 개요 탭을 준비하지 못했습니다.",
        );
      }

      const customFieldSpecs = collectCustomFieldSpecs(cohort.students);
      const fieldDefinitionsByName = new Map<
        string,
        { internalId: bigint; fieldType: FieldType }
      >();

      if (customFieldSpecs.length > 0) {
        const insertedFields = await tx
          .insert(memberFieldDefinitions)
          .values(
            customFieldSpecs.map((fieldSpec, index) => ({
              publicId: generatePublicId(ID_PREFIX.memberFields),
              spaceId: spaceInternalId,
              tabId: overviewTab.id,
              createdByUserId: userId,
              name: fieldSpec.name,
              fieldType: fieldSpec.fieldType,
              options: null,
              isRequired: false,
              displayOrder: index,
              createdAt: now,
              updatedAt: now,
            })),
          )
          .returning({
            id: memberFieldDefinitions.id,
            name: memberFieldDefinitions.name,
            fieldType: memberFieldDefinitions.fieldType,
          });

        for (const row of insertedFields) {
          fieldDefinitionsByName.set(row.name, {
            internalId: row.id,
            fieldType: row.fieldType as FieldType,
          });
        }
      }

      const memberRows = cohortMemberRows.map(({ student }) =>
        normalizeMemberRow(spaceInternalId, student, now),
      );

      const insertedMemberInternalIds: bigint[] = [];
      for (const chunk of chunkArray(memberRows, MEMBER_INSERT_CHUNK_SIZE)) {
        const inserted = await tx
          .insert(members)
          .values(chunk)
          .returning({ id: members.id });
        for (const row of inserted) {
          insertedMemberInternalIds.push(row.id);
        }
      }

      const fieldValueRows = cohortMemberRows.flatMap(
        ({ customFieldEntries }, studentIndex) => {
          const memberInternalId = insertedMemberInternalIds[studentIndex];
          if (memberInternalId === undefined) return [];

          return customFieldEntries.flatMap(({ name, value }) => {
            const fieldDefinition = fieldDefinitionsByName.get(name);
            if (!fieldDefinition || value === null) return [];

            return {
              publicId: generatePublicId(ID_PREFIX.memberFieldValues),
              memberId: memberInternalId,
              fieldDefinitionId: fieldDefinition.internalId,
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
      spacesCreated++;
      membersCreated += cohort.students.length;
    }

    return {
      spaces: spacesCreated,
      members: membersCreated,
      spaceIds: spacePublicIds,
    };
  });
}
