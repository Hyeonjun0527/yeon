import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}));

vi.mock("@/server/db", () => ({ getDb: getDbMock }));
vi.mock("@/server/db/schema", () => ({
  members: {},
  publicCheckSessions: {},
  publicCheckSubmissions: {},
  spaceMemberBoards: {},
  spaces: {},
}));
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  eq: (left: unknown, right: unknown) => ({ left, right }),
  sql: (strings: TemplateStringsArray) => strings.join(""),
}));
vi.mock("../student-board-service", () => ({
  assertSpaceOwnedByUser: vi.fn(),
}));

import {
  getPublicCheckSessionByToken,
  submitPublicCheck,
} from "../public-check-service";

function createDbMock(selectResults: unknown[][]) {
  let selectIndex = 0;
  const insertedPayloads: unknown[] = [];

  const db = {
    select: vi.fn(() => {
      const result = selectResults[selectIndex++] ?? [];
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(async () => result),
        orderBy: vi.fn(async () => result),
        then: (resolve: (value: unknown[]) => unknown) =>
          Promise.resolve(result).then(resolve),
      };

      return chain;
    }),
    insert: vi.fn(() => {
      const chain = {
        values: vi.fn((payload: unknown) => {
          insertedPayloads.push(payload);
          return chain;
        }),
        returning: vi.fn(async () => []),
        onConflictDoUpdate: vi.fn(async () => undefined),
      };

      return chain;
    }),
  };

  return { db, insertedPayloads };
}

describe("public-check-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("공개 체크인 세션 정보를 반환한다", async () => {
    const { db } = createDbMock([
      [
        {
          id: "session-1",
          title: "오늘 출석 체크",
          status: "active",
          checkMode: "attendance_and_assignment",
          enabledMethods: ["qr", "location"],
          locationLabel: "강남 강의실",
          opensAt: null,
          closesAt: null,
        },
      ],
    ]);
    getDbMock.mockReturnValue(db);

    await expect(getPublicCheckSessionByToken("token-1")).resolves.toEqual({
      title: "오늘 출석 체크",
      checkMode: "attendance_and_assignment",
      enabledMethods: ["qr", "location"],
      locationLabel: "강남 강의실",
      requiresPhoneLast4: true,
    });
  });

  it("일치하는 수강생이 없으면 not_found submission을 남긴다", async () => {
    const { db, insertedPayloads } = createDbMock([
      [
        {
          id: "session-1",
          spaceId: "space-1",
          status: "active",
          checkMode: "attendance_and_assignment",
          enabledMethods: ["qr"],
          opensAt: null,
          closesAt: null,
        },
      ],
      [],
    ]);
    getDbMock.mockReturnValue(db);

    await expect(
      submitPublicCheck({
        token: "token-1",
        body: {
          method: "qr",
          name: "홍길동",
          phoneLast4: "1234",
          assignmentStatus: "done",
          assignmentLink: "https://example.com/homework",
          latitude: null,
          longitude: null,
        },
      }),
    ).resolves.toEqual({
      verificationStatus: "not_found",
      message: "일치하는 수강생을 찾지 못했습니다.",
      matchedMemberName: null,
    });

    expect(insertedPayloads[0]).toMatchObject({
      sessionId: "session-1",
      spaceId: "space-1",
      verificationStatus: "not_found",
      submittedName: "홍길동",
      submittedPhoneLast4: "1234",
    });
  });

  it("QR 체크인이 일치하면 출석 보드와 submission을 함께 남긴다", async () => {
    const { db, insertedPayloads } = createDbMock([
      [
        {
          id: "session-1",
          spaceId: "space-1",
          status: "active",
          checkMode: "attendance_and_assignment",
          enabledMethods: ["qr"],
          opensAt: null,
          closesAt: null,
        },
      ],
      [
        {
          id: "member-1",
          name: "홍길동",
          phone: "010-1111-1234",
        },
      ],
      [],
    ]);
    getDbMock.mockReturnValue(db);

    await expect(
      submitPublicCheck({
        token: "token-1",
        body: {
          method: "qr",
          name: "홍길동",
          phoneLast4: "1234",
          assignmentStatus: "done",
          assignmentLink: "https://example.com/homework",
          latitude: null,
          longitude: null,
        },
      }),
    ).resolves.toEqual({
      verificationStatus: "matched",
      message: "출석과 과제 체크가 완료되었습니다.",
      matchedMemberName: "홍길동",
    });

    expect(insertedPayloads[0]).toMatchObject({
      memberId: "member-1",
      spaceId: "space-1",
      attendanceStatus: "present",
      attendanceMarkedSource: "public_qr",
      assignmentStatus: "done",
    });
    expect(insertedPayloads[1]).toMatchObject({
      memberId: "member-1",
      sessionId: "session-1",
      verificationStatus: "matched",
    });
  });

  it("과제 전용 체크인이 일치하면 과제만 기록한다", async () => {
    const { db, insertedPayloads } = createDbMock([
      [
        {
          id: "session-1",
          spaceId: "space-1",
          status: "active",
          checkMode: "assignment_only",
          enabledMethods: ["qr"],
          opensAt: null,
          closesAt: null,
        },
      ],
      [
        {
          id: "member-1",
          name: "홍길동",
          phone: "010-1111-1234",
        },
      ],
      [],
    ]);
    getDbMock.mockReturnValue(db);

    await expect(
      submitPublicCheck({
        token: "token-1",
        body: {
          method: "qr",
          name: "홍길동",
          phoneLast4: "1234",
          assignmentStatus: "done",
          assignmentLink: "https://example.com/homework",
          latitude: null,
          longitude: null,
        },
      }),
    ).resolves.toEqual({
      verificationStatus: "matched",
      message: "과제 체크가 완료되었습니다.",
      matchedMemberName: "홍길동",
    });

    expect(insertedPayloads[0]).toMatchObject({
      memberId: "member-1",
      spaceId: "space-1",
      attendanceStatus: "unknown",
      assignmentStatus: "done",
      assignmentMarkedSource: "public_qr",
    });
    expect(insertedPayloads[1]).toMatchObject({
      memberId: "member-1",
      sessionId: "session-1",
      verificationStatus: "matched",
    });
  });
});
