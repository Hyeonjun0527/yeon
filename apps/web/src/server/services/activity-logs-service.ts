import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import { activityLogs } from "@/server/db/schema";

import { getMemberByIdForUser } from "./members-service";
import { ServiceError } from "./service-error";

export const MEMBER_MEMO_LOG_TYPE = "coaching-note";

function normalizeMemoText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 2000);
}

export async function listActivityLogsForMember(params: {
  userId: string;
  spaceId: string;
  memberId: string;
  type?: string | null;
  limit?: number;
}) {
  const member = await getMemberByIdForUser(params.userId, params.memberId);

  if (member.spaceId !== params.spaceId) {
    throw new ServiceError(404, "해당 스페이스에 속한 수강생이 아닙니다.");
  }

  const db = getDb();

  const query = db
    .select()
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.memberId, params.memberId),
        eq(activityLogs.spaceId, params.spaceId),
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
  const member = await getMemberByIdForUser(params.userId, params.memberId);

  if (member.spaceId !== params.spaceId) {
    throw new ServiceError(404, "해당 스페이스에 속한 수강생이 아닙니다.");
  }

  const db = getDb();
  const [row] = await db
    .select({ totalCount: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.memberId, params.memberId),
        eq(activityLogs.spaceId, params.spaceId),
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
  const member = await getMemberByIdForUser(params.userId, params.memberId);

  if (member.spaceId !== params.spaceId) {
    throw new ServiceError(404, "해당 스페이스에 속한 수강생이 아닙니다.");
  }

  const noteText = normalizeMemoText(params.text);

  if (!noteText) {
    throw new ServiceError(400, "메모 내용을 입력해 주세요.");
  }

  const db = getDb();
  const now = new Date();

  const [created] = await db
    .insert(activityLogs)
    .values({
      memberId: params.memberId,
      spaceId: params.spaceId,
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
