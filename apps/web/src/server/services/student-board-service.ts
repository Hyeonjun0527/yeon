import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type {
  MemberStudentBoardResponse,
  StudentAssignmentStatus,
  StudentAttendanceStatus,
  StudentBoardDailyCell,
  StudentBoardHistoryItem,
  StudentBoardHistoryPeriod,
  StudentBoardResponse,
  StudentBoardRow,
  StudentBoardSource,
} from "@yeon/api-contract";

import { getDb } from "@/server/db";
import {
  publicCheckSessions,
  spaceMemberBoardHistory,
  spaceMemberBoards,
  spaces,
} from "@/server/db/schema";

import { getMembers } from "./members-service";
import { ServiceError } from "./service-error";

const HISTORY_TIME_ZONE = "Asia/Seoul";
const HISTORY_PERIOD_DAY_COUNT: Record<
  Exclude<StudentBoardHistoryPeriod, "space">,
  number
> = {
  "7d": 7,
  "30d": 30,
  "365d": 365,
};

type BoardHistoryRecord = typeof spaceMemberBoardHistory.$inferSelect;

function extractPhoneLast4(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function getHistoryDateKey(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: HISTORY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(
    parts
      .filter(
        (part) =>
          part.type === "year" || part.type === "month" || part.type === "day",
      )
      .map((part) => [part.type, part.value]),
  ) as Record<"year" | "month" | "day", string>;

  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function getHistoryWindowStart(
  period: Exclude<StudentBoardHistoryPeriod, "space">,
) {
  const todayKey = getHistoryDateKey(new Date());
  const start = new Date(`${todayKey}T00:00:00+09:00`);
  start.setUTCDate(start.getUTCDate() - (HISTORY_PERIOD_DAY_COUNT[period] - 1));
  return start;
}

function toStudentBoardDailyCell(
  row: BoardHistoryRecord,
  date = getHistoryDateKey(row.happenedAt),
): StudentBoardDailyCell {
  return {
    date,
    attendanceStatus: row.attendanceStatus as StudentAttendanceStatus,
    assignmentStatus: row.assignmentStatus as StudentAssignmentStatus,
    assignmentLink: row.assignmentLink ?? null,
    occurredAt: row.happenedAt.toISOString(),
    source: row.source as StudentBoardSource,
  };
}

function buildDailyCellMapByMember(rows: BoardHistoryRecord[]) {
  const cellsByMember = new Map<string, Map<string, StudentBoardDailyCell>>();

  for (const row of rows) {
    const historyDate = getHistoryDateKey(row.happenedAt);
    const memberCells =
      cellsByMember.get(row.memberId) ??
      new Map<string, StudentBoardDailyCell>();

    if (!cellsByMember.has(row.memberId)) {
      cellsByMember.set(row.memberId, memberCells);
    }

    if (memberCells.has(historyDate)) {
      continue;
    }

    memberCells.set(historyDate, toStudentBoardDailyCell(row, historyDate));
  }

  return new Map(
    Array.from(cellsByMember.entries()).map(([memberId, dateMap]) => [
      memberId,
      Array.from(dateMap.values()).sort((left, right) =>
        left.date.localeCompare(right.date),
      ),
    ]),
  );
}

function mapHistoryRows(
  rows: BoardHistoryRecord[],
  memberNameById: Map<string, string>,
): StudentBoardHistoryItem[] {
  const items: StudentBoardHistoryItem[] = [];

  for (const row of rows) {
    const memberName = memberNameById.get(row.memberId);

    if (!memberName) {
      continue;
    }

    items.push({
      id: row.id,
      memberId: row.memberId,
      memberName,
      historyDate: getHistoryDateKey(row.happenedAt),
      occurredAt: row.happenedAt.toISOString(),
      attendanceStatus: row.attendanceStatus as StudentAttendanceStatus,
      assignmentStatus: row.assignmentStatus as StudentAssignmentStatus,
      assignmentLink: row.assignmentLink ?? null,
      source: row.source as StudentBoardSource,
    });
  }

  return items;
}

async function listBoardHistoryRows(params: {
  spaceId: string;
  period: StudentBoardHistoryPeriod;
  memberId?: string;
  rangeStartDate?: string | null;
  rangeEndDate?: string | null;
}) {
  const filters = [
    eq(spaceMemberBoardHistory.spaceId, params.spaceId),
    gte(
      spaceMemberBoardHistory.happenedAt,
      params.period === "space"
        ? new Date(`${params.rangeStartDate ?? "1970-01-01"}T00:00:00+09:00`)
        : getHistoryWindowStart(params.period),
    ),
  ];

  if (params.period === "space" && params.rangeEndDate) {
    filters.push(
      lte(
        spaceMemberBoardHistory.happenedAt,
        new Date(`${params.rangeEndDate}T23:59:59.999+09:00`),
      ),
    );
  }

  if (params.memberId) {
    filters.push(eq(spaceMemberBoardHistory.memberId, params.memberId));
  }

  return getDb()
    .select()
    .from(spaceMemberBoardHistory)
    .where(and(...filters))
    .orderBy(desc(spaceMemberBoardHistory.happenedAt));
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

export async function listSpaceStudentBoard(
  userId: string,
  spaceId: string,
  historyPeriod: StudentBoardHistoryPeriod = "7d",
): Promise<StudentBoardResponse> {
  const space = await assertSpaceOwnedByUser(userId, spaceId);

  const db = getDb();
  const [memberList, boardRows, sessions, historyRows] = await Promise.all([
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
    listBoardHistoryRows({
      spaceId,
      period: historyPeriod,
      rangeStartDate: space.startDate ?? null,
      rangeEndDate: space.endDate ?? null,
    }),
  ]);

  const boardByMemberId = new Map(boardRows.map((row) => [row.memberId, row]));
  const dailyCellsByMemberId = buildDailyCellMapByMember(historyRows);

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
      dailyCells: dailyCellsByMemberId.get(member.id) ?? [],
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
    historyPeriod,
  };
}

export async function listMemberStudentBoardHistory(params: {
  userId: string;
  spaceId: string;
  memberId: string;
  period?: StudentBoardHistoryPeriod;
}): Promise<MemberStudentBoardResponse> {
  const period = params.period ?? "30d";

  const space = await assertSpaceOwnedByUser(params.userId, params.spaceId);

  const members = await getMembers(params.spaceId);
  const member = members.find((item) => item.id === params.memberId);

  if (!member) {
    throw new ServiceError(404, "해당 수강생을 찾지 못했습니다.");
  }

  const historyRows = await listBoardHistoryRows({
    spaceId: params.spaceId,
    memberId: params.memberId,
    period,
    rangeStartDate: space.startDate ?? null,
    rangeEndDate: space.endDate ?? null,
  });

  return {
    period,
    dailyCells:
      buildDailyCellMapByMember(historyRows).get(params.memberId) ?? [],
    history: mapHistoryRows(historyRows, new Map([[member.id, member.name]])),
  };
}

type PersistMemberBoardSnapshotParams = {
  spaceId: string;
  memberId: string;
  attendanceStatus?: StudentAttendanceStatus;
  assignmentStatus?: StudentAssignmentStatus;
  assignmentLink?: string | null;
  source: StudentBoardSource;
  updatedByUserId?: string | null;
  sessionId?: string | null;
  happenedAt?: Date;
  lastPublicCheckAt?: Date | null;
  historyMode?: "always" | "when_changed";
  refreshTouchedMarks?: boolean;
};

export async function persistMemberBoardSnapshot(
  params: PersistMemberBoardSnapshotParams,
) {
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

  const happenedAt = params.happenedAt ?? new Date();
  const currentAttendanceStatus =
    (existing?.attendanceStatus as StudentAttendanceStatus | undefined) ??
    "unknown";
  const currentAssignmentStatus =
    (existing?.assignmentStatus as StudentAssignmentStatus | undefined) ??
    "unknown";
  const currentAssignmentLink = existing?.assignmentLink ?? null;
  const nextAttendanceStatus =
    params.attendanceStatus ?? currentAttendanceStatus;
  const nextAssignmentStatus =
    params.assignmentStatus ?? currentAssignmentStatus;
  const nextAssignmentLink =
    params.assignmentLink !== undefined
      ? params.assignmentLink?.trim() || null
      : currentAssignmentLink;
  const attendanceChanged =
    params.attendanceStatus !== undefined &&
    nextAttendanceStatus !== currentAttendanceStatus;
  const assignmentStatusChanged =
    params.assignmentStatus !== undefined &&
    nextAssignmentStatus !== currentAssignmentStatus;
  const assignmentLinkChanged =
    params.assignmentLink !== undefined &&
    nextAssignmentLink !== currentAssignmentLink;
  const assignmentChanged = assignmentStatusChanged || assignmentLinkChanged;
  const touchedAttendance = params.attendanceStatus !== undefined;
  const touchedAssignment =
    params.assignmentStatus !== undefined ||
    params.assignmentLink !== undefined;
  const shouldRefreshAttendanceMark =
    attendanceChanged || (params.refreshTouchedMarks && touchedAttendance);
  const shouldRefreshAssignmentMark =
    assignmentChanged || (params.refreshTouchedMarks && touchedAssignment);
  const shouldWriteSnapshot =
    attendanceChanged ||
    assignmentChanged ||
    shouldRefreshAttendanceMark ||
    shouldRefreshAssignmentMark ||
    params.lastPublicCheckAt !== undefined;

  if (!shouldWriteSnapshot) {
    return {
      attendanceStatus: nextAttendanceStatus,
      assignmentStatus: nextAssignmentStatus,
      assignmentLink: nextAssignmentLink,
    };
  }

  await db
    .insert(spaceMemberBoards)
    .values({
      spaceId: params.spaceId,
      memberId: params.memberId,
      attendanceStatus: nextAttendanceStatus,
      attendanceMarkedAt: shouldRefreshAttendanceMark
        ? nextAttendanceStatus === "unknown"
          ? null
          : happenedAt
        : (existing?.attendanceMarkedAt ?? null),
      attendanceMarkedSource: shouldRefreshAttendanceMark
        ? nextAttendanceStatus === "unknown"
          ? null
          : params.source
        : (existing?.attendanceMarkedSource ?? null),
      assignmentStatus: nextAssignmentStatus,
      assignmentLink: nextAssignmentLink,
      assignmentMarkedAt: shouldRefreshAssignmentMark
        ? nextAssignmentStatus === "unknown" && !nextAssignmentLink
          ? null
          : happenedAt
        : (existing?.assignmentMarkedAt ?? null),
      assignmentMarkedSource: shouldRefreshAssignmentMark
        ? nextAssignmentStatus === "unknown" && !nextAssignmentLink
          ? null
          : params.source
        : (existing?.assignmentMarkedSource ?? null),
      lastPublicCheckAt:
        params.lastPublicCheckAt !== undefined
          ? params.lastPublicCheckAt
          : (existing?.lastPublicCheckAt ?? null),
      updatedByUserId:
        params.updatedByUserId !== undefined
          ? params.updatedByUserId
          : (existing?.updatedByUserId ?? null),
      updatedAt: happenedAt,
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
        lastPublicCheckAt: sql`excluded.last_public_check_at`,
        updatedByUserId: sql`excluded.updated_by_user_id`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  const shouldAppendHistory =
    params.historyMode === "always" || attendanceChanged || assignmentChanged;

  if (shouldAppendHistory) {
    await db.insert(spaceMemberBoardHistory).values({
      spaceId: params.spaceId,
      memberId: params.memberId,
      sessionId: params.sessionId ?? null,
      attendanceStatus: nextAttendanceStatus,
      assignmentStatus: nextAssignmentStatus,
      assignmentLink: nextAssignmentLink,
      source: params.source,
      updatedByUserId:
        params.updatedByUserId !== undefined ? params.updatedByUserId : null,
      happenedAt,
    });
  }

  return {
    attendanceStatus: nextAttendanceStatus,
    assignmentStatus: nextAssignmentStatus,
    assignmentLink: nextAssignmentLink,
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

  await persistMemberBoardSnapshot({
    spaceId: params.spaceId,
    memberId: params.memberId,
    attendanceStatus: params.attendanceStatus,
    assignmentStatus: params.assignmentStatus,
    assignmentLink: params.assignmentLink,
    source: "manual",
    updatedByUserId: params.userId,
    historyMode: "when_changed",
    refreshTouchedMarks: false,
  });

  return listSpaceStudentBoard(params.userId, params.spaceId);
}
