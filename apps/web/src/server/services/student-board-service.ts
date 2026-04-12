import { and, desc, eq, sql } from "drizzle-orm";
import type {
  StudentAssignmentStatus,
  StudentAttendanceStatus,
  StudentBoardResponse,
  StudentBoardRow,
} from "@yeon/api-contract";

import { getDb } from "@/server/db";
import {
  publicCheckSessions,
  spaceMemberBoards,
  spaces,
} from "@/server/db/schema";

import { getMembers } from "./members-service";
import { ServiceError } from "./service-error";

function extractPhoneLast4(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export async function assertSpaceOwnedByUser(userId: string, spaceId: string) {
  const db = getDb();
  const [space] = await db
    .select()
    .from(spaces)
    .where(and(eq(spaces.id, spaceId), eq(spaces.createdByUserId, userId)))
    .limit(1);

  if (!space) {
    throw new ServiceError(
      404,
      "해당 스페이스를 찾을 수 없거나 접근 권한이 없습니다.",
    );
  }

  return space;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function listSpaceStudentBoard(
  userId: string,
  spaceId: string,
): Promise<StudentBoardResponse> {
  await assertSpaceOwnedByUser(userId, spaceId);

  const db = getDb();
  const [memberList, boardRows, sessions] = await Promise.all([
    getMembers(spaceId),
    db
      .select()
      .from(spaceMemberBoards)
      .where(eq(spaceMemberBoards.spaceId, spaceId)),
    db
      .select()
      .from(publicCheckSessions)
      .where(eq(publicCheckSessions.spaceId, spaceId))
      .orderBy(desc(publicCheckSessions.createdAt))
      .limit(10),
  ]);

  const boardByMemberId = new Map(boardRows.map((row) => [row.memberId, row]));

  const rows: StudentBoardRow[] = memberList.map((member) => {
    const board = boardByMemberId.get(member.id);
    return {
      memberId: member.id,
      attendanceStatus:
        (board?.attendanceStatus as StudentAttendanceStatus | undefined) ??
        "unknown",
      attendanceMarkedAt: toIso(board?.attendanceMarkedAt),
      attendanceMarkedSource:
        (board?.attendanceMarkedSource as StudentBoardRow["attendanceMarkedSource"]) ??
        null,
      assignmentStatus:
        (board?.assignmentStatus as StudentAssignmentStatus | undefined) ??
        "unknown",
      assignmentLink: board?.assignmentLink ?? null,
      assignmentMarkedAt: toIso(board?.assignmentMarkedAt),
      assignmentMarkedSource:
        (board?.assignmentMarkedSource as StudentBoardRow["assignmentMarkedSource"]) ??
        null,
      lastPublicCheckAt: toIso(board?.lastPublicCheckAt),
      isSelfCheckReady: !!extractPhoneLast4(member.phone),
    };
  });

  return {
    rows,
    sessions: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      status: session.status as "active" | "closed",
      checkMode: session.checkMode as
        | "attendance_only"
        | "assignment_only"
        | "attendance_and_assignment",
      enabledMethods: Array.isArray(session.enabledMethods)
        ? (session.enabledMethods as ("qr" | "location")[])
        : ["qr"],
      publicPath: `/check/${session.publicToken}`,
      opensAt: toIso(session.opensAt),
      closesAt: toIso(session.closesAt),
      locationLabel: session.locationLabel ?? null,
      radiusMeters: session.radiusMeters ?? null,
      createdAt: session.createdAt.toISOString(),
    })),
  };
}

export async function upsertMemberBoardStatus(params: {
  userId: string;
  spaceId: string;
  memberId: string;
  attendanceStatus?: StudentAttendanceStatus;
  assignmentStatus?: StudentAssignmentStatus;
  assignmentLink?: string | null;
}) {
  await assertSpaceOwnedByUser(params.userId, params.spaceId);

  const members = await getMembers(params.spaceId);
  const member = members.find((item) => item.id === params.memberId);

  if (!member) {
    throw new ServiceError(404, "해당 수강생을 찾지 못했습니다.");
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(spaceMemberBoards)
    .where(
      and(
        eq(spaceMemberBoards.spaceId, params.spaceId),
        eq(spaceMemberBoards.memberId, params.memberId),
      ),
    )
    .limit(1);

  const now = new Date();
  const nextAttendanceStatus =
    params.attendanceStatus ?? existing?.attendanceStatus ?? "unknown";
  const nextAssignmentStatus =
    params.assignmentStatus ?? existing?.assignmentStatus ?? "unknown";
  const nextAssignmentLink =
    params.assignmentLink !== undefined
      ? params.assignmentLink?.trim() || null
      : (existing?.assignmentLink ?? null);

  await db
    .insert(spaceMemberBoards)
    .values({
      spaceId: params.spaceId,
      memberId: params.memberId,
      attendanceStatus: nextAttendanceStatus,
      attendanceMarkedAt:
        params.attendanceStatus !== undefined
          ? nextAttendanceStatus === "unknown"
            ? null
            : now
          : (existing?.attendanceMarkedAt ?? null),
      attendanceMarkedSource:
        params.attendanceStatus !== undefined
          ? nextAttendanceStatus === "unknown"
            ? null
            : "manual"
          : (existing?.attendanceMarkedSource ?? null),
      assignmentStatus: nextAssignmentStatus,
      assignmentLink: nextAssignmentLink,
      assignmentMarkedAt:
        params.assignmentStatus !== undefined ||
        params.assignmentLink !== undefined
          ? nextAssignmentStatus === "unknown" && !nextAssignmentLink
            ? null
            : now
          : (existing?.assignmentMarkedAt ?? null),
      assignmentMarkedSource:
        params.assignmentStatus !== undefined ||
        params.assignmentLink !== undefined
          ? nextAssignmentStatus === "unknown" && !nextAssignmentLink
            ? null
            : "manual"
          : (existing?.assignmentMarkedSource ?? null),
      lastPublicCheckAt: existing?.lastPublicCheckAt ?? null,
      updatedByUserId: params.userId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [spaceMemberBoards.spaceId, spaceMemberBoards.memberId],
      set: {
        attendanceStatus: sql`excluded.attendance_status`,
        attendanceMarkedAt: sql`excluded.attendance_marked_at`,
        attendanceMarkedSource: sql`excluded.attendance_marked_source`,
        assignmentStatus: sql`excluded.assignment_status`,
        assignmentLink: sql`excluded.assignment_link`,
        assignmentMarkedAt: sql`excluded.assignment_marked_at`,
        assignmentMarkedSource: sql`excluded.assignment_marked_source`,
        updatedByUserId: sql`excluded.updated_by_user_id`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  return listSpaceStudentBoard(params.userId, params.spaceId);
}
