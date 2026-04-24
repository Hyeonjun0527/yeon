import { describe, expect, it } from "vitest";

import { toAuthUserDto } from "../auth-user";

describe("toAuthUserDto", () => {
  it("provider를 중복 제거하고 정렬해 DTO로 변환한다", () => {
    const user = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "mentor@yeon.world",
      displayName: "멘토",
      avatarUrl: null,
      lastLoginAt: new Date("2026-04-12T10:00:00.000Z"),
      emailVerifiedAt: null,
      createdAt: new Date("2026-04-12T09:00:00.000Z"),
      updatedAt: new Date("2026-04-12T10:00:00.000Z"),
    };

    const dto = toAuthUserDto(user, [
      {
        id: "identity-1",
        userId: user.id,
        provider: "kakao",
        providerUserId: "kakao-1",
        email: user.email,
        displayName: user.displayName,
        avatarUrl: null,
        lastLoginAt: new Date("2026-04-12T10:00:00.000Z"),
        linkedAt: new Date("2026-04-12T10:00:00.000Z"),
      },
      {
        id: "identity-2",
        userId: user.id,
        provider: "google",
        providerUserId: "google-1",
        email: user.email,
        displayName: user.displayName,
        avatarUrl: null,
        lastLoginAt: new Date("2026-04-12T10:00:00.000Z"),
        linkedAt: new Date("2026-04-12T10:00:00.000Z"),
      },
      {
        id: "identity-3",
        userId: user.id,
        provider: "google",
        providerUserId: "google-2",
        email: user.email,
        displayName: user.displayName,
        avatarUrl: null,
        lastLoginAt: new Date("2026-04-12T10:00:00.000Z"),
        linkedAt: new Date("2026-04-12T10:00:00.000Z"),
      },
    ]);

    expect(dto.providers).toEqual(["google", "kakao"]);
    expect(dto.lastLoginAt).toBe("2026-04-12T10:00:00.000Z");
  });

  it("identity가 비어 있으면 schema 검증 실패를 던진다", () => {
    expect(() =>
      toAuthUserDto(
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          email: "mentor@yeon.world",
          displayName: "멘토",
          avatarUrl: null,
          lastLoginAt: new Date("2026-04-12T10:00:00.000Z"),
          emailVerifiedAt: null,
          createdAt: new Date("2026-04-12T09:00:00.000Z"),
          updatedAt: new Date("2026-04-12T10:00:00.000Z"),
        },
        [],
      ),
    ).toThrow();
  });
});
