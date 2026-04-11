import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/server/services/service-error";

const mockRequireAuthenticatedUser = vi.fn();
const mockBulkUpdateSpeakerLabel = vi.fn();

vi.mock("@/app/api/v1/counseling-records/_shared", () => ({
  jsonError: (message: string, status: number) =>
    Response.json({ message }, { status }),
  requireAuthenticatedUser: (...args: unknown[]) =>
    mockRequireAuthenticatedUser(...args),
}));
vi.mock("@/server/services/counseling-records-service", () => ({
  bulkUpdateSpeakerLabel: (...args: unknown[]) =>
    mockBulkUpdateSpeakerLabel(...args),
}));

import { PATCH } from "../bulk/route";

describe("bulk speaker route", () => {
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

    const response = await PATCH(
      new NextRequest(
        "http://localhost/api/v1/counseling-records/record-1/segments/bulk",
        { method: "PATCH" },
      ),
      { params: Promise.resolve({ recordId: "record-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("깨진 JSON이면 400을 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });

    const response = await PATCH(
      new NextRequest(
        "http://localhost/api/v1/counseling-records/record-1/segments/bulk",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: "{bad json",
        },
      ),
      { params: Promise.resolve({ recordId: "record-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("schema invalid면 400을 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });

    const response = await PATCH(
      new NextRequest(
        "http://localhost/api/v1/counseling-records/record-1/segments/bulk",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fromSpeakerLabel: "", toSpeakerLabel: "" }),
        },
      ),
      { params: Promise.resolve({ recordId: "record-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("ServiceError면 해당 status/message를 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });
    mockBulkUpdateSpeakerLabel.mockRejectedValue(
      new ServiceError(404, "레코드를 찾지 못했습니다."),
    );

    const response = await PATCH(
      new NextRequest(
        "http://localhost/api/v1/counseling-records/record-1/segments/bulk",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fromSpeakerLabel: "화자1",
            toSpeakerLabel: "멘토",
          }),
        },
      ),
      { params: Promise.resolve({ recordId: "record-1" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "레코드를 찾지 못했습니다.",
    });
  });
});
