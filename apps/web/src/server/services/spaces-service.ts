import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type {
  CreateSpaceBody,
  UpdateSpaceBody,
} from "@yeon/api-contract/spaces";

import { getDb } from "@/server/db";
import { spaces } from "@/server/db/schema";
import {
  compareSpaceDateStrings,
  getSpacePeriodInputError,
  isSpaceDateString,
  normalizeSpaceDateInput,
} from "@/lib/space-period";

import { ServiceError } from "./service-error";

export type CreateSpaceInput = CreateSpaceBody;
export type UpdateSpaceInput = UpdateSpaceBody;

function resolveCreateSpacePeriod(data: CreateSpaceInput) {
  const startDate = normalizeSpaceDateInput(data.startDate);
  const endDate = normalizeSpaceDateInput(data.endDate);
  const periodError = getSpacePeriodInputError(startDate, endDate);

  if (periodError) {
    throw new ServiceError(400, periodError);
  }

  return {
    startDate,
    endDate,
  };
}

function resolveUpdateSpacePeriod(
  existingSpace: typeof spaces.$inferSelect,
  data: UpdateSpaceInput,
) {
  const hasStartDatePatch = data.startDate !== undefined;
  const hasEndDatePatch = data.endDate !== undefined;

  if (!hasStartDatePatch && !hasEndDatePatch) {
    return {};
  }

  const existingStartDate = normalizeSpaceDateInput(existingSpace.startDate);
  const existingEndDate = normalizeSpaceDateInput(existingSpace.endDate);
  const nextStartDate = hasStartDatePatch
    ? normalizeSpaceDateInput(data.startDate)
    : existingStartDate;
  const nextEndDate = hasEndDatePatch
    ? normalizeSpaceDateInput(data.endDate)
    : existingEndDate;

  if (existingStartDate) {
    if (hasStartDatePatch && nextStartDate !== existingStartDate) {
      throw new ServiceError(400, "진행 시작일은 변경할 수 없습니다.");
    }

    if (hasEndDatePatch && !nextEndDate) {
      throw new ServiceError(400, "진행 종료일은 비울 수 없습니다.");
    }

    if (nextEndDate && !isSpaceDateString(nextEndDate)) {
      throw new ServiceError(400, "진행기간 날짜 형식이 올바르지 않습니다.");
    }

    if (
      existingEndDate &&
      nextEndDate &&
      compareSpaceDateStrings(nextEndDate, existingEndDate) < 0
    ) {
      throw new ServiceError(400, "진행 종료일은 앞당길 수 없습니다.");
    }

    if (
      nextEndDate &&
      compareSpaceDateStrings(nextEndDate, existingStartDate) < 0
    ) {
      throw new ServiceError(400, "종료일은 시작일보다 빠를 수 없습니다.");
    }

    return hasEndDatePatch ? { endDate: nextEndDate } : {};
  }

  const periodError = getSpacePeriodInputError(nextStartDate, nextEndDate);
  if (periodError) {
    throw new ServiceError(400, periodError);
  }

  return {
    startDate: nextStartDate,
    endDate: nextEndDate,
  };
}

export async function createSpace(userId: string, data: CreateSpaceInput) {
  const db = getDb();
  const name = data.name.trim().slice(0, 100);

  if (!name) {
    throw new ServiceError(400, "스페이스 이름은 필수입니다.");
  }

  const now = new Date();
  const period = resolveCreateSpacePeriod(data);

  const [space] = await db
    .insert(spaces)
    .values({
      id: randomUUID(),
      name,
      description: data.description?.trim() || null,
      startDate: period.startDate,
      endDate: period.endDate,
      createdByUserId: userId,
      updatedAt: now,
    })
    .returning();

  return space;
}

export async function getSpaces(userId: string) {
  const db = getDb();

  return db
    .select()
    .from(spaces)
    .where(eq(spaces.createdByUserId, userId))
    .orderBy(desc(spaces.createdAt));
}

export async function getSpaceById(spaceId: string) {
  const db = getDb();

  const [space] = await db
    .select()
    .from(spaces)
    .where(eq(spaces.id, spaceId))
    .limit(1);

  if (!space) {
    throw new ServiceError(404, "스페이스를 찾지 못했습니다.");
  }

  return space;
}

export async function deleteSpace(userId: string, spaceId: string) {
  const db = getDb();

  const [deletedSpace] = await db
    .delete(spaces)
    .where(and(eq(spaces.id, spaceId), eq(spaces.createdByUserId, userId)))
    .returning();

  if (!deletedSpace) {
    throw new ServiceError(404, "삭제할 스페이스를 찾지 못했습니다.");
  }

  return deletedSpace;
}

export async function updateSpace(
  userId: string,
  spaceId: string,
  data: UpdateSpaceInput,
) {
  const db = getDb();
  const [existingSpace] = await db
    .select()
    .from(spaces)
    .where(and(eq(spaces.id, spaceId), eq(spaces.createdByUserId, userId)))
    .limit(1);

  if (!existingSpace) {
    throw new ServiceError(404, "수정할 스페이스를 찾지 못했습니다.");
  }

  const updateFields: Partial<typeof spaces.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) {
    const name = data.name.trim().slice(0, 100);
    if (!name) {
      throw new ServiceError(400, "스페이스 이름은 필수입니다.");
    }
    updateFields.name = name;
  }

  Object.assign(updateFields, resolveUpdateSpacePeriod(existingSpace, data));

  const [updatedSpace] = await db
    .update(spaces)
    .set(updateFields)
    .where(and(eq(spaces.id, spaceId), eq(spaces.createdByUserId, userId)))
    .returning();

  if (!updatedSpace) {
    throw new ServiceError(404, "수정할 스페이스를 찾지 못했습니다.");
  }

  return updatedSpace;
}
