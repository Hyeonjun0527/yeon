import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/server/services/service-error";

const mockRequireAuthenticatedUser = vi.fn();
const mockGetCounselingRecordDetail = vi.fn();
const mockAppendMessages = vi.fn();
const mockClearMessages = vi.fn();
const mockStreamCounselingAiChat = vi.fn();

vi.mock("../../_shared", () => ({
  jsonError: (message: string, status: number) =>
    Response.json({ message }, { status }),
  requireAuthenticatedUser: (...args: unknown[]) =>
    mockRequireAuthenticatedUser(...args),
}));
vi.mock("@/server/services/counseling-records-service", () => ({
  getCounselingRecordDetail: (...args: unknown[]) =>
    mockGetCounselingRecordDetail(...args),
  appendCounselingRecordAssistantMessages: (...args: unknown[]) =>
    mockAppendMessages(...args),
  clearCounselingRecordAssistantMessages: (...args: unknown[]) =>
    mockClearMessages(...args),
}));
vi.mock("@/server/services/counseling-ai-service", () => ({
  streamCounselingAiChat: (...args: unknown[]) =>
    mockStreamCounselingAiChat(...args),
}));

import { DELETE, POST } from "../chat/route";

function createSseStream(chunks: string[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe("chat route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST는 마지막 메시지가 비어 있으면 400을 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });

    const response = await POST(
      new NextRequest(
        "http://localhost/api/v1/counseling-records/record-1/chat",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: "   " }],
          }),
        },
      ),
      { params: Promise.resolve({ recordId: "record-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("POST는 ServiceError면 그대로 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });
    mockGetCounselingRecordDetail.mockRejectedValue(
      new ServiceError(404, "레코드를 찾지 못했습니다."),
    );

    const response = await POST(
      new NextRequest(
        "http://localhost/api/v1/counseling-records/record-1/chat",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: "안녕하세요" }],
          }),
        },
      ),
      { params: Promise.resolve({ recordId: "record-1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("POST는 사용자 메시지를 저장하고 SSE stream을 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });
    mockGetCounselingRecordDetail.mockResolvedValue({
      studentName: "홍길동",
      sessionTitle: "1차 상담",
      counselingType: "대면 상담",
      createdAt: "2026-04-12T10:00:00.000Z",
      transcriptSegments: [
        { speakerLabel: "멘토", text: "안녕하세요", startMs: 0 },
      ],
    });
    mockStreamCounselingAiChat.mockResolvedValue(
      createSseStream(['data: {"content":"답변입니다."}\n', "data: [DONE]\n"]),
    );

    const response = await POST(
      new NextRequest(
        "http://localhost/api/v1/counseling-records/record-1/chat",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: "안녕하세요" }],
          }),
        },
      ),
      { params: Promise.resolve({ recordId: "record-1" }) },
    );

    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(mockAppendMessages).toHaveBeenCalled();
  });

  it("DELETE는 clear 실패 ServiceError를 그대로 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });
    mockClearMessages.mockRejectedValue(
      new ServiceError(403, "권한이 없습니다."),
    );

    const response = await DELETE(
      new NextRequest(
        "http://localhost/api/v1/counseling-records/record-1/chat",
        { method: "DELETE" },
      ),
      { params: Promise.resolve({ recordId: "record-1" }) },
    );

    expect(response.status).toBe(403);
  });
});
