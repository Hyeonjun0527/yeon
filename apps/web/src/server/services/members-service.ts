import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/server/db";
import { members, spaces } from "@/server/db/schema";

import { ServiceError } from "./service-error";

export type CreateMemberInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  initialRiskLevel?: string | null;
};

export async function createMember(spaceId: string, data: CreateMemberInput) {
  const db = getDb();
  const name = data.name.trim().slice(0, 100);

  if (!name) {
    throw new ServiceError(400, "수강생 이름은 필수입니다.");
  }

  const now = new Date();

  const [member] = await db
    .insert(members)
    .values({
      id: randomUUID(),
      spaceId,
      name,
      email: data.email?.trim().slice(0, 255) || null,
      phone: data.phone?.trim().slice(0, 20) || null,
      status: data.status?.trim().slice(0, 20) || "active",
      initialRiskLevel: data.initialRiskLevel?.trim().slice(0, 10) || null,
      updatedAt: now,
    })
    .returning();

  return member;
}

export async function getMembers(spaceId: string) {
  const db = getDb();

  return db
    .select()
    .from(members)
    .where(eq(members.spaceId, spaceId))
    .orderBy(desc(members.createdAt));
}

export async function getMemberById(memberId: string) {
  const db = getDb();

  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!member) {
    throw new ServiceError(404, "수강생을 찾지 못했습니다.");
  }

  return member;
}

/** 현재 사용자의 space에 속한 멤버인지 소유권까지 검증한다. */
export async function getMemberByIdForUser(userId: string, memberId: string) {
  const db = getDb();

  const [row] = await db
    .select({ member: members })
    .from(members)
    .innerJoin(spaces, eq(members.spaceId, spaces.id))
    .where(and(eq(members.id, memberId), eq(spaces.createdByUserId, userId)))
    .limit(1);

  if (!row) {
    throw new ServiceError(
      404,
      "해당 수강생을 찾을 수 없거나 접근 권한이 없습니다.",
    );
  }

  return row.member;
}

export type UpdateMemberInput = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  initialRiskLevel?: string | null;
};

export async function updateMember(memberId: string, data: UpdateMemberInput) {
  const db = getDb();

  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (data.name !== undefined) {
    const name = data.name.trim().slice(0, 100);
    if (!name) throw new ServiceError(400, "수강생 이름은 필수입니다.");
    patch.name = name;
  }
  if (data.email !== undefined) {
    patch.email = data.email?.trim().slice(0, 255) || null;
  }
  if (data.phone !== undefined) {
    patch.phone = data.phone?.trim().slice(0, 20) || null;
  }
  if (data.status !== undefined) {
    patch.status = data.status?.trim().slice(0, 20) || null;
  }
  if (data.initialRiskLevel !== undefined) {
    patch.initialRiskLevel = data.initialRiskLevel?.trim().slice(0, 10) || null;
  }

  const [updated] = await db
    .update(members)
    .set(patch)
    .where(eq(members.id, memberId))
    .returning();

  if (!updated) {
    throw new ServiceError(404, "수강생을 찾지 못했습니다.");
  }

  return updated;
}
