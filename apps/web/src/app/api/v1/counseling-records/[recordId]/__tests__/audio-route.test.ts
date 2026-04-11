import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/server/services/service-error";

const mockRequireAuthenticatedUser = vi.fn();
const mockGetCounselingRecordAudio = vi.fn();

vi.mock("../../_shared", () => ({
  jsonError: (message: string, status: number) =>
    Response.json({ message }, { status }),
  requireAuthenticatedUser: (...args: unknown[]) =>
    mockRequireAuthenticatedUser(...args),
}));
vi.mock("@/server/services/counseling-records-service", () => ({
  getCounselingRecordAudio: (...args: unknown[]) =>
    mockGetCounselingRecordAudio(...args),
}));

import { GET } from "../audio/route";

function makeStream(text: string) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

describe("audio route", () => {
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

    const response = await GET(
      new NextRequest(
        "http://localhost/api/v1/counseling-records/record-1/audio",
      ),
      { params: Promise.resolve({ recordId: "record-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("성공 시 audio 스트림과 range 헤더를 반영한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });
    mockGetCounselingRecordAudio.mockResolvedValue({
      stream: makeStream("audio"),
      status: 206,
      mimeType: "audio/webm",
      contentLength: 5,
      originalName: "상담.webm",
      contentRange: "bytes 0-4/10",
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/v1/counseling-records/record-1/audio",
        {
          headers: { range: "bytes=0-4" },
        },
      ),
      { params: Promise.resolve({ recordId: "record-1" }) },
    );

    expect(mockGetCounselingRecordAudio).toHaveBeenCalledWith(
      "user-1",
      "record-1",
      "bytes=0-4",
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 0-4/10");
    expect(response.headers.get("content-type")).toBe("audio/webm");
  });

  it("ServiceError면 그대로 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });
    mockGetCounselingRecordAudio.mockRejectedValue(
      new ServiceError(404, "파일이 없습니다."),
    );

    const response = await GET(
      new NextRequest(
        "http://localhost/api/v1/counseling-records/record-1/audio",
      ),
      { params: Promise.resolve({ recordId: "record-1" }) },
    );

    expect(response.status).toBe(404);
  });
});
