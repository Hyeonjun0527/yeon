import { describe, expect, it, vi } from "vitest";

import { ApiClientError, createApiClient } from "@yeon/api-client";

describe("api-client", () => {
  it("baseUrl과 path를 결합해 요청하고 schema를 파싱한다", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          service: "web",
          timestamp: "2026-04-12T10:00:00.000Z",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const client = createApiClient({
      baseUrl: "https://yeon.world",
      fetch: fetchMock,
    });

    await expect(client.getHealth()).resolves.toEqual({
      status: "ok",
      service: "web",
      timestamp: "2026-04-12T10:00:00.000Z",
    });
    expect(fetchMock).toHaveBeenCalledWith("https://yeon.world/api/health", {
      headers: {
        "content-type": "application/json",
      },
    });
  });

  it("에러 응답이 schema와 맞으면 서버 메시지를 ApiClientError에 담는다", async () => {
    const client = createApiClient({
      fetch: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ message: "권한이 없습니다." }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      ),
    });

    await expect(client.listUsers()).rejects.toEqual(
      new ApiClientError(403, "권한이 없습니다."),
    );
  });

  it("에러 응답 JSON이 깨졌으면 기본 메시지로 fallback한다", async () => {
    const client = createApiClient({
      fetch: vi.fn<typeof fetch>().mockResolvedValue(
        new Response("<html>error</html>", {
          status: 500,
          headers: { "content-type": "text/html" },
        }),
      ),
    });

    await expect(client.listUsers()).rejects.toMatchObject({
      status: 500,
      message: "API 요청 처리에 실패했습니다.",
    });
  });

  it("응답 body가 schema와 다르면 parse 오류를 그대로 드러낸다", async () => {
    const client = createApiClient({
      fetch: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ users: "not-an-array" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    });

    await expect(client.listUsers()).rejects.toThrow();
  });

  it("logout은 DELETE 메서드로 세션 엔드포인트를 호출한다", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ authenticated: false, user: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createApiClient({ fetch: fetchMock });

    await expect(client.logout()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/session", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
      },
    });
  });
});
