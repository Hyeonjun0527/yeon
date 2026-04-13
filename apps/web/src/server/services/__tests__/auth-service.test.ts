import { beforeEach, describe, expect, it, vi } from "vitest";

const mockToAuthUserDto = vi.fn();
const mockTransaction = vi.fn();

vi.mock("pg", () => ({
  DatabaseError: class MockDatabaseError extends Error {
    code?: string;
  },
}));

vi.mock("@/server/db", () => ({
  getDb: () => ({
    transaction: (...args: unknown[]) => mockTransaction(...args),
  }),
}));

vi.mock("@/server/db/schema", () => ({
  userIdentities: {
    provider: "provider",
    providerUserId: "providerUserId",
    userId: "userId",
    id: "id",
    email: "email",
    displayName: "displayName",
    avatarUrl: "avatarUrl",
  },
  users: {
    id: "id",
    email: "email",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  eq: (left: unknown, right: unknown) => ({ left, right }),
}));

vi.mock("@/server/auth/auth-user", () => ({
  toAuthUserDto: (...args: unknown[]) => mockToAuthUserDto(...args),
}));

import { authErrorCodes } from "@/server/auth/auth-errors";

import { upsertSocialLogin } from "../auth-service";

type TxSequence = {
  select: unknown[];
  update: unknown[];
  insert: unknown[];
};

function createTx(sequence: TxSequence) {
  const selectQueue = [...sequence.select];
  const updateQueue = [...sequence.update];
  const insertQueue = [...sequence.insert];

  const buildAwaitable = (queue: unknown[]) => {
    const proxy: unknown = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            return (resolve: (value: unknown) => void) =>
              Promise.resolve(queue.shift()).then(resolve);
          }

          if (prop === "catch" || prop === "finally") {
            return undefined;
          }

          return () => proxy;
        },
      },
    );

    return proxy;
  };

  return {
    select: () => buildAwaitable(selectQueue),
    update: () => buildAwaitable(updateQueue),
    insert: () => buildAwaitable(insertQueue),
  };
}

describe("auth-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToAuthUserDto.mockImplementation((user: { id: string }) => ({
      id: user.id,
      providers: ["google"],
    }));
  });

  it("이메일이 없으면 emailRequired 오류를 던진다", async () => {
    mockTransaction.mockImplementation(
      async (callback: (tx: ReturnType<typeof createTx>) => Promise<unknown>) =>
        callback(createTx({ select: [[], []], update: [], insert: [] })),
    );

    await expect(
      upsertSocialLogin({
        provider: "google",
        providerUserId: "provider-user-1",
        email: null,
        emailVerified: false,
        displayName: "유저",
        avatarUrl: null,
      }),
    ).rejects.toMatchObject({
      code: authErrorCodes.emailRequired,
    });
  });

  it("검증되지 않은 이메일만 있으면 emailNotVerified 오류를 던진다", async () => {
    mockTransaction.mockImplementation(
      async (callback: (tx: ReturnType<typeof createTx>) => Promise<unknown>) =>
        callback(createTx({ select: [[], []], update: [], insert: [] })),
    );

    await expect(
      upsertSocialLogin({
        provider: "google",
        providerUserId: "provider-user-1",
        email: "USER@Yeon.World",
        emailVerified: false,
        displayName: "유저",
        avatarUrl: null,
      }),
    ).rejects.toMatchObject({
      code: authErrorCodes.emailNotVerified,
    });
  });

  it("같은 이메일에 동일 공급자의 다른 providerUserId가 오면 별도 user를 만든다", async () => {
    mockTransaction.mockImplementation(
      async (callback: (tx: ReturnType<typeof createTx>) => Promise<unknown>) =>
        callback(
          createTx({
            select: [
              [],
              [
                {
                  id: "user-1",
                  email: "user@yeon.world",
                  displayName: "기존 유저",
                  avatarUrl: null,
                },
              ],
              [
                {
                  id: "identity-1",
                  provider: "google",
                  providerUserId: "other-provider-user",
                },
              ],
              [],
              [
                {
                  id: "identity-2",
                  provider: "google",
                  providerUserId: "provider-user-1",
                },
              ],
            ],
            update: [],
            insert: [
              [
                {
                  id: "user-2",
                  email: "user@yeon.world",
                  displayName: "유저",
                  avatarUrl: null,
                },
              ],
              undefined,
            ],
          }),
        ),
    );

    await expect(
      upsertSocialLogin({
        provider: "google",
        providerUserId: "provider-user-1",
        email: "user@yeon.world",
        emailVerified: true,
        displayName: "유저",
        avatarUrl: null,
      }),
    ).resolves.toEqual({
      id: "user-2",
      providers: ["google"],
    });
  });

  it("기존 identity 로그인 시 이메일/프로필을 갱신한 뒤 DTO를 반환한다", async () => {
    mockTransaction.mockImplementation(
      async (callback: (tx: ReturnType<typeof createTx>) => Promise<unknown>) =>
        callback(
          createTx({
            select: [
              [
                {
                  id: "identity-1",
                  userId: "user-1",
                  email: "old@yeon.world",
                  displayName: "기존",
                  avatarUrl: null,
                },
              ],
              [
                {
                  id: "user-1",
                  email: "old@yeon.world",
                  displayName: "기존 유저",
                  avatarUrl: null,
                },
              ],
              [
                {
                  id: "identity-1",
                  provider: "google",
                  providerUserId: "provider-user-1",
                },
              ],
            ],
            update: [
              [
                {
                  id: "user-1",
                  email: "new@yeon.world",
                  displayName: "새 이름",
                  avatarUrl: "https://yeon.world/avatar.png",
                },
              ],
              undefined,
            ],
            insert: [],
          }),
        ),
    );

    const result = await upsertSocialLogin({
      provider: "google",
      providerUserId: "provider-user-1",
      email: " NEW@Yeon.World ",
      emailVerified: true,
      displayName: "  새 이름  ",
      avatarUrl: " https://yeon.world/avatar.png ",
    });

    expect(result).toEqual({ id: "user-1", providers: ["google"] });
    expect(mockToAuthUserDto).toHaveBeenCalledTimes(1);
  });

  it("같은 이메일 user가 여러 명이면 기존 user를 고르지 않고 새 user를 만든다", async () => {
    mockTransaction.mockImplementation(
      async (callback: (tx: ReturnType<typeof createTx>) => Promise<unknown>) =>
        callback(
          createTx({
            select: [
              [],
              [
                {
                  id: "user-1",
                  email: "user@yeon.world",
                  displayName: "첫 번째 유저",
                  avatarUrl: null,
                },
                {
                  id: "user-2",
                  email: "user@yeon.world",
                  displayName: "두 번째 유저",
                  avatarUrl: null,
                },
              ],
              [],
              [
                {
                  id: "identity-3",
                  provider: "google",
                  providerUserId: "provider-user-3",
                },
              ],
            ],
            update: [],
            insert: [
              [
                {
                  id: "user-3",
                  email: "user@yeon.world",
                  displayName: "세 번째 유저",
                  avatarUrl: null,
                },
              ],
              undefined,
            ],
          }),
        ),
    );

    await expect(
      upsertSocialLogin({
        provider: "google",
        providerUserId: "provider-user-3",
        email: "user@yeon.world",
        emailVerified: true,
        displayName: "세 번째 유저",
        avatarUrl: null,
      }),
    ).resolves.toEqual({
      id: "user-3",
      providers: ["google"],
    });
  });
});
