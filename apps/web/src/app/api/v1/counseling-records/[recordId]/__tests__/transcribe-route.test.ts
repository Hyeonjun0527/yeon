import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/server/services/service-error";

const mockRequireAuthenticatedUser = vi.fn();
const mockRetryCounselingRecordTranscription = vi.fn();

vi.mock("../../_shared", () => ({
  jsonError: (message: string, status: number) =>
    Response.json({ message }, { status }),
  requireAuthenticatedUser: (...args: unknown[]) =>
    mockRequireAuthenticatedUser(...args),
}));
vi.mock("@yeon/api-contract/counseling-records", () => ({
  counselingRecordDetailResponseSchema: {
    parse: (value: unknown) => value,
  },
}));
vi.mock("@/server/services/counseling-records-service", () => ({
  retryCounselingRecordTranscription: (...args: unknown[]) =>
    mockRetryCounselingRecordTranscription(...args),
}));

import { POST } from "../transcribe/route";

describe("transcribe route", () => {
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
      new NextRequest(
        "http://localhost/api/v1/counseling-records/record-1/transcribe",
        { method: "POST" },
      ),
      { params: Promise.resolve({ recordId: "record-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("성공 시 record detail payload를 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });
    mockRetryCounselingRecordTranscription.mockResolvedValue({
      id: "record-1",
    });

    const response = await POST(
      new NextRequest(
        "http://localhost/api/v1/counseling-records/record-1/transcribe",
        {
          method: "POST",
          headers: { "x-client-request-id": "req-1" },
        },
      ),
      { params: Promise.resolve({ recordId: "record-1" }) },
    );

    expect(mockRetryCounselingRecordTranscription).toHaveBeenCalledWith(
      { id: "user-1" },
      "record-1",
      "req-1",
    );
    expect(response.status).toBe(200);
  });

  it("ServiceError면 그대로 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });
    mockRetryCounselingRecordTranscription.mockRejectedValue(
      new ServiceError(409, "이미 처리 중입니다."),
    );

    const response = await POST(
      new NextRequest(
        "http://localhost/api/v1/counseling-records/record-1/transcribe",
        { method: "POST" },
      ),
      { params: Promise.resolve({ recordId: "record-1" }) },
    );

    expect(response.status).toBe(409);
  });
});
