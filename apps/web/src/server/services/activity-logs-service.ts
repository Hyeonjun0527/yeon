import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import { activityLogs } from "@/server/db/schema";
import { generatePublicId, ID_PREFIX } from "@/server/lib/public-id";

import { getMemberByIdForUser } from "./members-service";
import { requireSpaceInternalIdByPublicId } from "./spaces-service";
import { ServiceError } from "./service-error";

export const MEMBER_MEMO_LOG_TYPE = "coaching-note";

export type ActivityLogRow = typeof activityLogs.$inferSelect;

function normalizeMemoText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 2000);
}

async function resolveMemberSpaceContext(params: {
  userId: string;
  spaceId: string;
  memberId: string;
}) {
  const member = await getMemberByIdForUser(params.userId, params.memberId);

  const spaceInternalId = await requireSpaceInternalIdByPublicId(
    params.spaceId,
  );
  if (member.spaceId !== spaceInternalId) {
    throw new ServiceError(404, "해당 스페이스에 속한 수강생이 아닙니다.");
  }

  return { member, spaceInternalId };
}

export async function listActivityLogsForMember(params: {
  userId: string;
  spaceId: string;
  memberId: string;
  type?: string | null;
  limit?: number;
}) {
  const { member, spaceInternalId } = await resolveMemberSpaceContext({
    userId: params.userId,
    spaceId: params.spaceId,
    memberId: params.memberId,
  });

  const db = getDb();

  const query = db
    .select()
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.memberId, member.id),
        eq(activityLogs.spaceId, spaceInternalId),
        ...(params.type ? [eq(activityLogs.type, params.type)] : []),
      ),
    )
    .orderBy(desc(activityLogs.recordedAt), desc(activityLogs.createdAt));

  if (params.limit) {
    return query.limit(params.limit);
  }

  return query;
}

export async function countActivityLogsForMember(params: {
  userId: string;
  spaceId: string;
  memberId: string;
  type?: string | null;
}) {
  const { member, spaceInternalId } = await resolveMemberSpaceContext({
    userId: params.userId,
    spaceId: params.spaceId,
    memberId: params.memberId,
  });

  const db = getDb();
  const [row] = await db
    .select({ totalCount: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.memberId, member.id),
        eq(activityLogs.spaceId, spaceInternalId),
        ...(params.type ? [eq(activityLogs.type, params.type)] : []),
      ),
    );

  return Number(row?.totalCount ?? 0);
}

export async function createMemberMemoLog(params: {
  userId: string;
  spaceId: string;
  memberId: string;
  text: string;
  authorLabel?: string | null;
}) {
  const { member, spaceInternalId } = await resolveMemberSpaceContext({
    userId: params.userId,
    spaceId: params.spaceId,
    memberId: params.memberId,
  });

  const noteText = normalizeMemoText(params.text);

  if (!noteText) {
    throw new ServiceError(400, "메모 내용을 입력해 주세요.");
  }

  const db = getDb();
  const now = new Date();

  const [created] = await db
    .insert(activityLogs)
    .values({
      publicId: generatePublicId(ID_PREFIX.activityLogs),
      memberId: member.id,
      spaceId: spaceInternalId,
      type: MEMBER_MEMO_LOG_TYPE,
      status: null,
      recordedAt: now,
      source: "manual",
      metadata: {
        noteText,
        authorLabel: params.authorLabel?.trim() || "멘토",
      },
    })
    .returning();

  return created;
}
