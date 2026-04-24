import { and, desc, eq, inArray } from "drizzle-orm";
import type {
  CreateMemberBody,
  UpdateMemberBody,
} from "@yeon/api-contract/spaces";

import { getDb } from "@/server/db";
import { members, spaces } from "@/server/db/schema";
import { generatePublicId, ID_PREFIX } from "@/server/lib/public-id";

import { ServiceError } from "./service-error";
import {
  attachMemberRiskProfiles,
  getMemberRiskProfile,
} from "./member-risk-service";
import { requireSpaceInternalIdByPublicId } from "./spaces-service";

export type CreateMemberInput = CreateMemberBody;

export type MemberRow = typeof members.$inferSelect;

/**
 * publicId → 내부 bigint id 해석. 존재하지 않으면 null.
 */
export async function resolveMemberInternalIdByPublicId(
  publicId: string,
): Promise<bigint | null> {
  const [row] = await getDb()
    .select({ id: members.id })
    .from(members)
    .where(eq(members.publicId, publicId))
    .limit(1);
  return row?.id ?? null;
}

export async function requireMemberInternalIdByPublicId(
  publicId: string,
): Promise<bigint> {
  const id = await resolveMemberInternalIdByPublicId(publicId);
  if (id === null) {
    throw new ServiceError(404, "수강생을 찾지 못했습니다.");
  }
  return id;
}

export async function createMember(
  spacePublicId: string,
  data: CreateMemberInput,
): Promise<MemberRow> {
  const db = getDb();
  const name = data.name.trim().slice(0, 100);

  if (!name) {
    throw new ServiceError(400, "수강생 이름은 필수입니다.");
  }

  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);
  const now = new Date();

  const [member] = await db
    .insert(members)
    .values({
      publicId: generatePublicId(ID_PREFIX.members),
      spaceId: spaceInternalId,
      name,
      email: data.email?.trim().slice(0, 255) || null,
      phone: data.phone?.trim().slice(0, 20) || null,
      status: data.status?.trim().slice(0, 20) || "active",
      initialRiskLevel: data.initialRiskLevel?.trim().slice(0, 10) || null,
      updatedAt: now,
    })
    .returning();

  if (!member) {
    throw new ServiceError(500, "수강생을 생성하지 못했습니다.");
  }

  return member;
}

export async function getMembers(spacePublicId: string): Promise<MemberRow[]> {
  const db = getDb();
  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);

  return db
    .select()
    .from(members)
    .where(eq(members.spaceId, spaceInternalId))
    .orderBy(desc(members.createdAt));
}

export async function getMembersWithRisk(
  userId: string,
  spacePublicId: string,
) {
  const memberList = await getMembers(spacePublicId);

  const profiled = await attachMemberRiskProfiles(
    userId,
    memberList.map((member) => ({
      id: member.publicId,
      initialRiskLevel: member.initialRiskLevel,
    })),
  );
  const profileByPublicId = new Map(
    profiled.map((profile) => [profile.id, profile]),
  );

  return memberList.map((member) => {
    const profile = profileByPublicId.get(member.publicId);
    return {
      ...member,
      ...(profile ?? {}),
    };
  });
}

export async function getMemberByPublicId(
  memberPublicId: string,
): Promise<MemberRow> {
  const db = getDb();

  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.publicId, memberPublicId))
    .limit(1);

  if (!member) {
    throw new ServiceError(404, "수강생을 찾지 못했습니다.");
  }

  return member;
}

/** 기존 호출자 호환용 별칭. */
export const getMemberById = getMemberByPublicId;

export async function getMemberByIdWithRisk(
  userId: string,
  memberPublicId: string,
) {
  const member = await getMemberByPublicId(memberPublicId);
  const riskProfile = await getMemberRiskProfile({
    userId,
    memberId: member.publicId,
    initialRiskLevel: member.initialRiskLevel,
  });

  return {
    ...member,
    ...riskProfile,
  };
}

/** 현재 사용자의 space에 속한 멤버인지 소유권까지 검증한다. */
export async function getMemberByIdForUser(
  userId: string,
  memberPublicId: string,
): Promise<MemberRow> {
  const db = getDb();

  const [row] = await db
    .select({ member: members })
    .from(members)
    .innerJoin(spaces, eq(members.spaceId, spaces.id))
    .where(
      and(
        eq(members.publicId, memberPublicId),
        eq(spaces.createdByUserId, userId),
      ),
    )
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
  memberPublicId: string,
) {
  const member = await getMemberByIdForUser(userId, memberPublicId);
  const riskProfile = await getMemberRiskProfile({
    userId,
    memberId: member.publicId,
    initialRiskLevel: member.initialRiskLevel,
  });

  return {
    ...member,
    ...riskProfile,
  };
}

export type UpdateMemberInput = UpdateMemberBody;

export async function updateMember(
  memberPublicId: string,
  data: UpdateMemberInput,
): Promise<MemberRow> {
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
    .where(eq(members.publicId, memberPublicId))
    .returning();

  if (!updated) {
    throw new ServiceError(404, "수강생을 찾지 못했습니다.");
  }

  return updated;
}

export async function deleteMember(
  userId: string,
  memberPublicId: string,
): Promise<MemberRow> {
  const db = getDb();
  await getMemberByIdForUser(userId, memberPublicId);

  const [deletedMember] = await db
    .delete(members)
    .where(eq(members.publicId, memberPublicId))
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
  spacePublicId: string,
  memberPublicIds: string[],
) {
  const normalizedMemberIds = [...new Set(memberPublicIds)];

  if (normalizedMemberIds.length === 0) {
    throw new ServiceError(400, "삭제할 수강생을 선택해 주세요.");
  }

  const db = getDb();
  const spaceInternalId = await requireSpaceInternalIdByPublicId(spacePublicId);
  const ownedMembers = await db
    .select({ id: members.id, publicId: members.publicId })
    .from(members)
    .innerJoin(spaces, eq(members.spaceId, spaces.id))
    .where(
      and(
        eq(spaces.createdByUserId, userId),
        eq(members.spaceId, spaceInternalId),
        inArray(members.publicId, normalizedMemberIds),
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
        eq(members.spaceId, spaceInternalId),
        inArray(members.publicId, normalizedMemberIds),
      ),
    )
    .returning({ id: members.id, publicId: members.publicId });

  return {
    deletedCount: deletedMembers.length,
    deletedIds: deletedMembers.map((member) => member.publicId),
  };
}
