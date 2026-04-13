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
vi.mock("@/server/services/student-board-service", () => ({
  assertSpaceOwnedByUser: vi.fn(),
  persistMemberBoardSnapshot: vi.fn(),
}));

import { persistMemberBoardSnapshot } from "@/server/services/student-board-service";
import {
  getPublicCheckSessionByToken,
  submitPublicCheck,
  verifyPublicCheckIdentity,
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

  it("QR entry에서 기억된 수강생이 있으면 이름 입력을 다시 요구하지 않는다", async () => {
    const { db } = createDbMock([
      [
        {
          id: "session-1",
          spaceId: "space-1",
          title: "오늘 출석 체크",
          status: "active",
          checkMode: "attendance_and_assignment",
          enabledMethods: ["qr", "location"],
          locationLabel: "강남 강의실",
          opensAt: null,
          closesAt: null,
        },
      ],
      [
        {
          id: "member-1",
          spaceId: "space-1",
          name: "홍길동",
          phone: "010-1111-1234",
        },
      ],
    ]);
    getDbMock.mockReturnValue(db);

    await expect(
      getPublicCheckSessionByToken({
        token: "token-1",
        entry: "qr",
        rememberedIdentities: [{ spaceId: "space-1", memberId: "member-1" }],
      }),
    ).resolves.toEqual({
      spaceId: "space-1",
      session: {
        title: "오늘 출석 체크",
        checkMode: "attendance_and_assignment",
        enabledMethods: ["qr", "location"],
        locationLabel: "강남 강의실",
        requiresPhoneLast4: false,
        rememberedMemberName: "홍길동",
      },
      shouldClearRememberedIdentity: false,
    });
  });

  it("QR 첫 인증은 verify 경로에서 수강생을 확인하고 remember용 memberId를 돌려준다", async () => {
    const { db } = createDbMock([
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
          spaceId: "space-1",
          name: "홍길동",
          phone: "010-1111-1234",
        },
      ],
    ]);
    getDbMock.mockReturnValue(db);

    await expect(
      verifyPublicCheckIdentity({
        token: "token-1",
        body: {
          name: "홍길동",
          phoneLast4: "1234",
        },
      }),
    ).resolves.toEqual({
      spaceId: "space-1",
      result: {
        verificationStatus: "matched",
        message: "본인 확인이 완료되었습니다.",
        matchedMemberName: "홍길동",
      },
      rememberedMemberId: "member-1",
    });
  });

  it("QR 체크인이 일치하면 출석 보드와 submission을 함께 남기고 remember memberId를 돌려준다", async () => {
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
          spaceId: "space-1",
          name: "홍길동",
          phone: "010-1111-1234",
        },
      ],
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
      spaceId: "space-1",
      result: {
        verificationStatus: "matched",
        message: "출석과 과제 체크가 완료되었습니다.",
        matchedMemberName: "홍길동",
      },
      rememberedMemberId: "member-1",
      shouldClearRememberedIdentity: false,
    });

    expect(vi.mocked(persistMemberBoardSnapshot)).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(persistMemberBoardSnapshot).mock.calls[0]?.[0],
    ).toMatchObject({
      memberId: "member-1",
      spaceId: "space-1",
      attendanceStatus: "present",
      assignmentStatus: "done",
      assignmentLink: "https://example.com/homework",
      source: "public_qr",
      sessionId: "session-1",
    });
    expect(insertedPayloads[0]).toMatchObject({
      memberId: "member-1",
      sessionId: "session-1",
      spaceId: "space-1",
      assignmentStatus: "done",
      assignmentLink: "https://example.com/homework",
      verificationStatus: "matched",
      submittedName: "홍길동",
      submittedPhoneLast4: "1234",
    });
  });

  it("기억된 수강생이 있는 QR 체크인은 이름과 전화번호 없이도 제출된다", async () => {
    const { db, insertedPayloads } = createDbMock([
      [
        {
          id: "session-1",
          spaceId: "space-1",
          status: "active",
          checkMode: "attendance_only",
          enabledMethods: ["qr"],
          opensAt: null,
          closesAt: null,
        },
      ],
      [
        {
          id: "member-1",
          spaceId: "space-1",
          name: "홍길동",
          phone: "010-1111-1234",
        },
      ],
    ]);
    getDbMock.mockReturnValue(db);

    await expect(
      submitPublicCheck({
        token: "token-1",
        body: {
          method: "qr",
          assignmentStatus: undefined,
          assignmentLink: undefined,
          latitude: null,
          longitude: null,
        },
        rememberedIdentities: [{ spaceId: "space-1", memberId: "member-1" }],
      }),
    ).resolves.toEqual({
      spaceId: "space-1",
      result: {
        verificationStatus: "matched",
        message: "출석 체크가 완료되었습니다.",
        matchedMemberName: "홍길동",
      },
      rememberedMemberId: "member-1",
      shouldClearRememberedIdentity: false,
    });

    expect(vi.mocked(persistMemberBoardSnapshot)).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(persistMemberBoardSnapshot).mock.calls[0]?.[0],
    ).toMatchObject({
      memberId: "member-1",
      spaceId: "space-1",
      attendanceStatus: "present",
      source: "public_qr",
      sessionId: "session-1",
    });
    expect(insertedPayloads[0]).toMatchObject({
      memberId: "member-1",
      sessionId: "session-1",
      verificationStatus: "matched",
      submittedName: "홍길동",
      submittedPhoneLast4: "1234",
    });
  });
});
