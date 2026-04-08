import type { NextRequest } from "next/server";
import { z } from "zod";

import { getCounselingRecordDetail } from "@/server/services/counseling-records-service";
import { streamCounselingAiChat } from "@/server/services/counseling-ai-service";
import { ServiceError } from "@/server/services/service-error";

import { jsonError, requireAuthenticatedUser } from "../../_shared";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).nonempty(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { recordId } = await context.params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("요청 형식이 올바르지 않습니다.", 400);
  }

  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("메시지가 비어 있습니다.", 400);
  }

  const lastMessage = parsed.data.messages[parsed.data.messages.length - 1];

  if (lastMessage.role !== "user" || !lastMessage.content.trim()) {
    return jsonError("마지막 메시지는 사용자 메시지여야 합니다.", 400);
  }

  try {
    const detail = await getCounselingRecordDetail(currentUser.id, recordId);

    const stream = await streamCounselingAiChat(
      {
        studentName: detail.studentName,
        sessionTitle: detail.sessionTitle,
        counselingType: detail.counselingType,
        createdAt: detail.createdAt,
      },
      detail.transcriptSegments.map((segment) => ({
        speakerLabel: segment.speakerLabel,
        text: segment.text,
        startMs: segment.startMs ?? 0,
      })),
      parsed.data.messages,
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error("counseling-ai-chat-error", error);
    return jsonError("AI 도우미 응답에 실패했습니다.", 500);
  }
}
