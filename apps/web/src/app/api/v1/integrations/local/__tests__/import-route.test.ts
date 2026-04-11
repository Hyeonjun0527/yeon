import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAuthenticatedUser = vi.fn();
const mockHandleImportCommitRoute = vi.fn();

vi.mock("@/app/api/v1/counseling-records/_shared", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    mockRequireAuthenticatedUser(...args),
}));
vi.mock("@/app/api/v1/integrations/_shared", () => ({
  handleImportCommitRoute: (...args: unknown[]) =>
    mockHandleImportCommitRoute(...args),
}));

import { POST } from "../import/route";

describe("local import route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("비인증이면 guard 응답을 그대로 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: null,
      response: Response.json(
        { message: "로그인이 필요합니다." },
        { status: 401 },
      ),
    });

    const response = await POST(
      new NextRequest("http://localhost/api/v1/integrations/local/import", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });

  it("인증되면 commit handler에 userId를 전달한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });
    mockHandleImportCommitRoute.mockResolvedValue(
      Response.json({ ok: true }, { status: 201 }),
    );

    const request = new NextRequest(
      "http://localhost/api/v1/integrations/local/import",
      { method: "POST" },
    );
    const response = await POST(request);

    expect(mockHandleImportCommitRoute).toHaveBeenCalledWith({
      request,
      userId: "user-1",
    });
    expect(response.status).toBe(201);
  });
});
