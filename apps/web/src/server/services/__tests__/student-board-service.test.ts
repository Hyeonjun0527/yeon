import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock, getMembersMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  getMembersMock: vi.fn(),
}));

const schema = vi.hoisted(() => ({
  publicCheckSessions: {
    id: "publicCheckSessions.id",
    spaceId: "publicCheckSessions.spaceId",
    createdAt: "publicCheckSessions.createdAt",
  },
  spaceMemberBoardHistory: {
    spaceId: "spaceMemberBoardHistory.spaceId",
    memberId: "spaceMemberBoardHistory.memberId",
    happenedAt: "spaceMemberBoardHistory.happenedAt",
  },
  spaceMemberBoards: {
    spaceId: "spaceMemberBoards.spaceId",
    memberId: "spaceMemberBoards.memberId",
    attendanceStatus: "spaceMemberBoards.attendanceStatus",
    attendanceMarkedAt: "spaceMemberBoards.attendanceMarkedAt",
    attendanceMarkedSource: "spaceMemberBoards.attendanceMarkedSource",
    assignmentStatus: "spaceMemberBoards.assignmentStatus",
    assignmentLink: "spaceMemberBoards.assignmentLink",
    assignmentMarkedAt: "spaceMemberBoards.assignmentMarkedAt",
    assignmentMarkedSource: "spaceMemberBoards.assignmentMarkedSource",
    lastPublicCheckAt: "spaceMemberBoards.lastPublicCheckAt",
    updatedByUserId: "spaceMemberBoards.updatedByUserId",
    updatedAt: "spaceMemberBoards.updatedAt",
  },
  spaces: {
    id: "spaces.id",
    createdByUserId: "spaces.createdByUserId",
  },
}));

vi.mock("@/server/db", () => ({ getDb: getDbMock }));
vi.mock("@/server/db/schema", () => schema);
vi.mock("../members-service", () => ({ getMembers: getMembersMock }));
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  desc: (value: unknown) => ({ type: "desc", value }),
  eq: (left: unknown, right: unknown) => ({ type: "eq", left, right }),
  gte: (left: unknown, right: unknown) => ({ type: "gte", left, right }),
  lte: (left: unknown, right: unknown) => ({ type: "lte", left, right }),
  sql: (strings: TemplateStringsArray) => strings.join(""),
}));

import {
  listMemberStudentBoardHistory,
  listSpaceStudentBoard,
  persistMemberBoardSnapshot,
} from "../student-board-service";

function createDbMock(selectResults: unknown[][]) {
  let selectIndex = 0;
  const insertedPayloads: Array<{ payload: unknown; conflict: unknown }> = [];

  const db = {
    select: vi.fn(() => {
      const result = selectResults[selectIndex++] ?? [];
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(async () => result),
        then: (resolve: (value: unknown[]) => unknown) =>
          Promise.resolve(result).then(resolve),
      };

      return chain;
    }),
    insert: vi.fn(() => {
      const record = { payload: null as unknown, conflict: null as unknown };
      const chain = {
        values: vi.fn((payload: unknown) => {
          record.payload = payload;
          insertedPayloads.push(record);
          return chain;
        }),
        onConflictDoUpdate: vi.fn(async (conflict: unknown) => {
          record.conflict = conflict;
          return undefined;
        }),
      };

      return chain;
    }),
  };

  return { db, insertedPayloads };
}

describe("student-board-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("보드 응답에 멤버별 daily cell을 함께 반환한다", async () => {
    const { db } = createDbMock([
      [{ id: "space-1", createdByUserId: "user-1" }],
      [
        {
          memberId: "member-1",
          attendanceStatus: "present",
          attendanceMarkedAt: new Date("2026-04-13T01:00:00.000Z"),
          attendanceMarkedSource: "manual",
          assignmentStatus: "done",
          assignmentLink: "https://example.com/hw",
          assignmentMarkedAt: new Date("2026-04-13T01:00:00.000Z"),
          assignmentMarkedSource: "manual",
          lastPublicCheckAt: null,
        },
      ],
      [
        {
          id: "session-1",
          title: "오늘 체크",
          status: "active",
          checkMode: "attendance_and_assignment",
          enabledMethods: ["qr"],
          publicToken: "token-1",
          opensAt: null,
          closesAt: null,
          locationLabel: null,
          radiusMeters: null,
          createdAt: new Date("2026-04-13T01:30:00.000Z"),
        },
      ],
      [
        {
          id: "history-1",
          memberId: "member-1",
          attendanceStatus: "present",
          assignmentStatus: "done",
          assignmentLink: "https://example.com/latest",
          source: "manual",
          happenedAt: new Date("2026-04-13T02:00:00.000Z"),
        },
        {
          id: "history-older",
          memberId: "member-1",
          attendanceStatus: "present",
          assignmentStatus: "not_done",
          assignmentLink: null,
          source: "public_qr",
          happenedAt: new Date("2026-04-13T01:00:00.000Z"),
        },
        {
          id: "history-2",
          memberId: "member-2",
          attendanceStatus: "absent",
          assignmentStatus: "unknown",
          assignmentLink: null,
          source: "manual",
          happenedAt: new Date("2026-04-12T05:00:00.000Z"),
        },
      ],
    ]);
    getDbMock.mockReturnValue(db);
    getMembersMock.mockResolvedValue([
      {
        id: "member-1",
        name: "홍길동",
        phone: "010-1111-2222",
      },
      {
        id: "member-2",
        name: "김영희",
        phone: "010-3333-4444",
      },
    ]);

    const result = await listSpaceStudentBoard("user-1", "space-1", "7d");
    const memberOneRow = result.rows.find((row) => row.memberId === "member-1");
    const memberTwoRow = result.rows.find((row) => row.memberId === "member-2");

    expect(result.historyPeriod).toBe("7d");
    expect(memberOneRow?.dailyCells).toEqual([
      {
        date: "2026-04-13",
        attendanceStatus: "present",
        assignmentStatus: "done",
        assignmentLink: "https://example.com/latest",
        occurredAt: "2026-04-13T02:00:00.000Z",
        source: "manual",
      },
    ]);
    expect(memberTwoRow?.dailyCells).toEqual([
      {
        date: "2026-04-12",
        attendanceStatus: "absent",
        assignmentStatus: "unknown",
        assignmentLink: null,
        occurredAt: "2026-04-12T05:00:00.000Z",
        source: "manual",
      },
    ]);
  });

  it("학생 상세 응답은 잔디용 daily cell과 상세 history를 함께 반환한다", async () => {
    const { db } = createDbMock([
      [{ id: "space-1", createdByUserId: "user-1" }],
      [
        {
          id: "history-1",
          memberId: "member-1",
          attendanceStatus: "present",
          assignmentStatus: "done",
          assignmentLink: "https://example.com/latest",
          source: "manual",
          happenedAt: new Date("2026-04-13T02:00:00.000Z"),
        },
        {
          id: "history-older",
          memberId: "member-1",
          attendanceStatus: "present",
          assignmentStatus: "not_done",
          assignmentLink: null,
          source: "public_qr",
          happenedAt: new Date("2026-04-13T01:00:00.000Z"),
        },
      ],
    ]);
    getDbMock.mockReturnValue(db);
    getMembersMock.mockResolvedValue([
      {
        id: "member-1",
        name: "홍길동",
        phone: "010-1111-2222",
      },
    ]);

    const result = await listMemberStudentBoardHistory({
      userId: "user-1",
      spaceId: "space-1",
      memberId: "member-1",
      period: "space",
    });

    expect(result.dailyCells).toEqual([
      {
        date: "2026-04-13",
        attendanceStatus: "present",
        assignmentStatus: "done",
        assignmentLink: "https://example.com/latest",
        occurredAt: "2026-04-13T02:00:00.000Z",
        source: "manual",
      },
    ]);
    expect(result.history).toHaveLength(2);
    expect(result.history[0]).toMatchObject({
      id: "history-1",
      memberId: "member-1",
      memberName: "홍길동",
      historyDate: "2026-04-13",
      assignmentStatus: "done",
    });
    expect(result.history[1]).toMatchObject({
      id: "history-older",
      memberId: "member-1",
      memberName: "홍길동",
      historyDate: "2026-04-13",
      assignmentStatus: "not_done",
      source: "public_qr",
    });
  });

  it("수동 상태가 실제로 바뀌면 최신 보드와 이력을 함께 저장한다", async () => {
    const { db, insertedPayloads } = createDbMock([
      [
        {
          attendanceStatus: "unknown",
          attendanceMarkedAt: null,
          attendanceMarkedSource: null,
          assignmentStatus: "unknown",
          assignmentLink: null,
          assignmentMarkedAt: null,
          assignmentMarkedSource: null,
          lastPublicCheckAt: null,
          updatedByUserId: null,
        },
      ],
    ]);
    getDbMock.mockReturnValue(db);

    await persistMemberBoardSnapshot({
      spaceId: "space-1",
      memberId: "member-1",
      attendanceStatus: "present",
      assignmentStatus: "done",
      assignmentLink: "https://example.com/homework",
      source: "manual",
      updatedByUserId: "user-1",
      happenedAt: new Date("2026-04-13T02:30:00.000Z"),
      historyMode: "when_changed",
      refreshTouchedMarks: false,
    });

    expect(insertedPayloads).toHaveLength(2);
    expect(insertedPayloads[0].payload).toMatchObject({
      spaceId: "space-1",
      memberId: "member-1",
      attendanceStatus: "present",
      assignmentStatus: "done",
      assignmentLink: "https://example.com/homework",
      attendanceMarkedSource: "manual",
      assignmentMarkedSource: "manual",
      updatedByUserId: "user-1",
    });
    expect(insertedPayloads[1].payload).toMatchObject({
      spaceId: "space-1",
      memberId: "member-1",
      attendanceStatus: "present",
      assignmentStatus: "done",
      assignmentLink: "https://example.com/homework",
      source: "manual",
      updatedByUserId: "user-1",
    });
  });

  it("수동 저장 값이 기존과 같으면 새 이력을 남기지 않는다", async () => {
    const { db, insertedPayloads } = createDbMock([
      [
        {
          attendanceStatus: "present",
          attendanceMarkedAt: new Date("2026-04-12T02:00:00.000Z"),
          attendanceMarkedSource: "manual",
          assignmentStatus: "done",
          assignmentLink: "https://example.com/homework",
          assignmentMarkedAt: new Date("2026-04-12T02:00:00.000Z"),
          assignmentMarkedSource: "manual",
          lastPublicCheckAt: null,
          updatedByUserId: "user-1",
        },
      ],
    ]);
    getDbMock.mockReturnValue(db);

    await persistMemberBoardSnapshot({
      spaceId: "space-1",
      memberId: "member-1",
      attendanceStatus: "present",
      assignmentStatus: "done",
      assignmentLink: "https://example.com/homework",
      source: "manual",
      updatedByUserId: "user-1",
      historyMode: "when_changed",
      refreshTouchedMarks: false,
    });

    expect(insertedPayloads).toHaveLength(0);
  });
});
