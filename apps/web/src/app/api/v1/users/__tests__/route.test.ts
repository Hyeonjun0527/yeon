import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/server/services/service-error";

const mockGetAuthUserBySessionToken = vi.fn();
const mockClearAuthSessionCookie = vi.fn();
const mockListUsers = vi.fn();
const mockCreateUser = vi.fn();

vi.mock("@/server/auth/session", () => ({
  getAuthUserBySessionToken: (...args: unknown[]) =>
    mockGetAuthUserBySessionToken(...args),
  clearAuthSessionCookie: (...args: unknown[]) =>
    mockClearAuthSessionCookie(...args),
}));

vi.mock("@/server/services/users-service", () => ({
  listUsers: (...args: unknown[]) => mockListUsers(...args),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
}));

import { GET, POST } from "../route";

describe("api/v1/users route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClearAuthSessionCookie.mockImplementation(
      (response: Response) => response,
    );
  });

  it("GET은 비로그인 상태면 401을 반환한다", async () => {
    const request = new NextRequest("http://localhost/api/v1/users");

    const response = await GET(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "로그인이 필요합니다.",
    });
  });

  it("GET은 인증되면 사용자 목록을 반환한다", async () => {
    mockGetAuthUserBySessionToken.mockResolvedValue({ id: "user-1" });
    mockListUsers.mockResolvedValue([
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@yeon.world",
        displayName: "유저",
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:00:00.000Z",
      },
    ]);
    const request = new NextRequest("http://localhost/api/v1/users", {
      headers: { cookie: "yeon.session=valid-token" },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      users: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          email: "user@yeon.world",
          displayName: "유저",
          createdAt: "2026-04-12T10:00:00.000Z",
          updatedAt: "2026-04-12T10:00:00.000Z",
        },
      ],
    });
  });

  it("POST는 깨진 JSON 본문이면 400을 반환한다", async () => {
    mockGetAuthUserBySessionToken.mockResolvedValue({ id: "user-1" });
    const request = new NextRequest("http://localhost/api/v1/users", {
      method: "POST",
      headers: {
        cookie: "yeon.session=valid-token",
        "content-type": "application/json",
      },
      body: "{bad json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "요청 본문 JSON 형식이 올바르지 않습니다.",
    });
  });

  it("POST는 schema와 맞지 않는 body면 400을 반환한다", async () => {
    mockGetAuthUserBySessionToken.mockResolvedValue({ id: "user-1" });
    const request = new NextRequest("http://localhost/api/v1/users", {
      method: "POST",
      headers: {
        cookie: "yeon.session=valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "not-an-email" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "사용자 생성 요청 값이 올바르지 않습니다.",
    });
  });

  it("POST는 ServiceError를 그대로 노출한다", async () => {
    mockGetAuthUserBySessionToken.mockResolvedValue({ id: "user-1" });
    mockCreateUser.mockRejectedValue(
      new ServiceError(409, "이미 등록된 이메일입니다."),
    );
    const request = new NextRequest("http://localhost/api/v1/users", {
      method: "POST",
      headers: {
        cookie: "yeon.session=valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "user@yeon.world", displayName: "유저" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      message: "이미 등록된 이메일입니다.",
    });
  });

  it("POST는 성공 시 201과 생성된 유저를 반환한다", async () => {
    mockGetAuthUserBySessionToken.mockResolvedValue({ id: "user-1" });
    mockCreateUser.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "user@yeon.world",
      displayName: "유저",
      createdAt: "2026-04-12T10:00:00.000Z",
      updatedAt: "2026-04-12T10:00:00.000Z",
    });
    const request = new NextRequest("http://localhost/api/v1/users", {
      method: "POST",
      headers: {
        cookie: "yeon.session=valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "user@yeon.world", displayName: "유저" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      user: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@yeon.world",
        displayName: "유저",
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:00:00.000Z",
      },
    });
  });
});
