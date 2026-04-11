import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetMemberByIdForUser = vi.fn();

const { responses, db } = vi.hoisted(() => {
  const responses: unknown[] = [];
  const proxy: unknown = new Proxy({} as Record<string | symbol, unknown>, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (value: unknown) => void) =>
          Promise.resolve(responses.shift() ?? []).then(resolve);
      }
      if (prop === "catch" || prop === "finally") {
        return undefined;
      }
      return () => proxy;
    },
  });

  return { responses, db: proxy };
});

vi.mock("@/server/db", () => ({ getDb: () => db }));
vi.mock("@/server/db/schema", () => ({ activityLogs: {} }));
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  desc: (value: unknown) => value,
  eq: (left: unknown, right: unknown) => ({ left, right }),
  sql: (strings: TemplateStringsArray) => strings.join(""),
}));
vi.mock("../members-service", () => ({
  getMemberByIdForUser: (...args: unknown[]) =>
    mockGetMemberByIdForUser(...args),
}));

import {
  MEMBER_MEMO_LOG_TYPE,
  countActivityLogsForMember,
  createMemberMemoLog,
  listActivityLogsForMember,
} from "../activity-logs-service";

describe("activity-logs-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    responses.length = 0;
    mockGetMemberByIdForUser.mockResolvedValue({
      id: "member-1",
      spaceId: "space-1",
    });
  });

  it("다른 스페이스 소속 수강생이면 조회 시 404를 던진다", async () => {
    mockGetMemberByIdForUser.mockResolvedValue({
      id: "member-1",
      spaceId: "space-2",
    });

    await expect(
      listActivityLogsForMember({
        userId: "user-1",
        spaceId: "space-1",
        memberId: "member-1",
      }),
    ).rejects.toMatchObject({
      status: 404,
      message: "해당 스페이스에 속한 수강생이 아닙니다.",
    });
  });

  it("countActivityLogsForMember는 totalCount를 숫자로 반환한다", async () => {
    responses.push([{ totalCount: 3 }]);

    await expect(
      countActivityLogsForMember({
        userId: "user-1",
        spaceId: "space-1",
        memberId: "member-1",
      }),
    ).resolves.toBe(3);
  });

  it("createMemberMemoLog는 메모 공백을 정규화하고 기본 작성자를 멘토로 저장한다", async () => {
    responses.push([
      {
        id: "log-1",
        type: MEMBER_MEMO_LOG_TYPE,
        metadata: {
          noteText: "첫 줄 두 번째 줄",
          authorLabel: "멘토",
        },
      },
    ]);

    const created = await createMemberMemoLog({
      userId: "user-1",
      spaceId: "space-1",
      memberId: "member-1",
      text: "  첫 줄\n\n두 번째 줄  ",
    });

    expect(created.type).toBe(MEMBER_MEMO_LOG_TYPE);
    expect(created.metadata).toEqual({
      noteText: "첫 줄 두 번째 줄",
      authorLabel: "멘토",
    });
  });

  it("정규화 후 빈 메모면 400을 던진다", async () => {
    await expect(
      createMemberMemoLog({
        userId: "user-1",
        spaceId: "space-1",
        memberId: "member-1",
        text: "   \n  ",
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "메모 내용을 입력해 주세요.",
    });
  });
});
