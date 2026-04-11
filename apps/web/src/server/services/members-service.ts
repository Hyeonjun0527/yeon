import { and, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type {
  CreateMemberBody,
  UpdateMemberBody,
} from "@yeon/api-contract/spaces";

import { getDb } from "@/server/db";
import { members, spaces } from "@/server/db/schema";

import { ServiceError } from "./service-error";
import {
  attachMemberRiskProfiles,
  getMemberRiskProfile,
} from "./member-risk-service";

export type CreateMemberInput = CreateMemberBody;

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

export async function getMembersWithRisk(userId: string, spaceId: string) {
  const memberList = await getMembers(spaceId);

  return attachMemberRiskProfiles(userId, memberList);
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

export async function getMemberByIdWithRisk(userId: string, memberId: string) {
  const member = await getMemberById(memberId);
  const riskProfile = await getMemberRiskProfile({
    userId,
    memberId,
    initialRiskLevel: member.initialRiskLevel,
  });

  return {
    ...member,
    ...riskProfile,
  };
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

export async function getMemberByIdForUserWithRisk(
  userId: string,
  memberId: string,
) {
  const member = await getMemberByIdForUser(userId, memberId);
  const riskProfile = await getMemberRiskProfile({
    userId,
    memberId,
    initialRiskLevel: member.initialRiskLevel,
  });

  return {
    ...member,
    ...riskProfile,
  };
}

export type UpdateMemberInput = UpdateMemberBody;

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

export async function deleteMember(userId: string, memberId: string) {
  const db = getDb();
  await getMemberByIdForUser(userId, memberId);

  const [deletedMember] = await db
    .delete(members)
    .where(eq(members.id, memberId))
    .returning();

  if (!deletedMember) {
    throw new ServiceError(
      404,
      "삭제할 수강생을 찾을 수 없거나 접근 권한이 없습니다.",
    );
  }

  return deletedMember;
}

export async function bulkDeleteMembersInSpace(
  userId: string,
  spaceId: string,
  memberIds: string[],
) {
  const normalizedMemberIds = [...new Set(memberIds)];

  if (normalizedMemberIds.length === 0) {
    throw new ServiceError(400, "삭제할 수강생을 선택해 주세요.");
  }

  const db = getDb();
  const ownedMembers = await db
    .select({ id: members.id })
    .from(members)
    .innerJoin(spaces, eq(members.spaceId, spaces.id))
    .where(
      and(
        eq(spaces.createdByUserId, userId),
        eq(members.spaceId, spaceId),
        inArray(members.id, normalizedMemberIds),
      ),
    );

  if (ownedMembers.length !== normalizedMemberIds.length) {
    throw new ServiceError(
      404,
      "삭제할 수강생을 찾을 수 없거나 접근 권한이 없습니다.",
    );
  }

  const deletedMembers = await db
    .delete(members)
    .where(
      and(
        eq(members.spaceId, spaceId),
        inArray(members.id, normalizedMemberIds),
      ),
    )
    .returning({ id: members.id });

  return {
    deletedCount: deletedMembers.length,
    deletedIds: deletedMembers.map((member) => member.id),
  };
}
