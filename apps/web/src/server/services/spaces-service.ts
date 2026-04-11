import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type {
  CreateSpaceBody,
  UpdateSpaceBody,
} from "@yeon/api-contract/spaces";

import { getDb } from "@/server/db";
import { spaces } from "@/server/db/schema";

import { ServiceError } from "./service-error";

export type CreateSpaceInput = CreateSpaceBody;
export type UpdateSpaceInput = UpdateSpaceBody;

export async function createSpace(userId: string, data: CreateSpaceInput) {
  const db = getDb();
  const name = data.name.trim().slice(0, 100);

  if (!name) {
    throw new ServiceError(400, "스페이스 이름은 필수입니다.");
  }

  const now = new Date();

  const [space] = await db
    .insert(spaces)
    .values({
      id: randomUUID(),
      name,
      description: data.description?.trim() || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
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
