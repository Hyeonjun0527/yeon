import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  counselingChatRequestSchema,
  type CounselingChatMessage,
} from "@yeon/api-contract/counseling-records";
import { getCounselingRecordDetail } from "@/server/services/counseling-records-service";
import {
  appendCounselingRecordAssistantMessages,
  clearCounselingRecordAssistantMessages,
} from "@/server/services/counseling-records-service";
import {
  streamCounselingAiChat,
  streamWebSearchAiChat,
} from "@/server/services/counseling-ai-service";
import { ServiceError } from "@/server/services/service-error";

import { jsonError, requireAuthenticatedUser } from "../../_shared";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

async function persistAssistantMessageFromStream(params: {
  stream: ReadableStream<Uint8Array>;
  userId: string;
  recordId: string;
}) {
  const reader = params.stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith("data: ")) {
          continue;
        }

        const payload = trimmed.slice(6);

        if (payload === "[DONE]") {
          continue;
        }

        try {
          const parsed = JSON.parse(payload) as { content?: string };

          if (parsed.content) {
            accumulated += parsed.content;
          }
        } catch {
          // ignore malformed stream chunks
        }
      }
    }

    const content = accumulated.trim();

    if (!content) {
      return;
    }

    const assistantMessage: CounselingChatMessage = {
      id: randomUUID(),
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
    };

    await appendCounselingRecordAssistantMessages(
      params.userId,
      params.recordId,
      [assistantMessage],
    );
  } finally {
    reader.releaseLock();
  }
}

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

  const parsed = counselingChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("메시지가 비어 있습니다.", 400);
  }

  const lastMessage = parsed.data.messages[parsed.data.messages.length - 1];

  if (lastMessage.role !== "user" || !lastMessage.content.trim()) {
    return jsonError("마지막 메시지는 사용자 메시지여야 합니다.", 400);
  }

  try {
    const detail = await getCounselingRecordDetail(currentUser.id, recordId);
    const userMessage: CounselingChatMessage = {
      id: randomUUID(),
      role: "user",
      content: lastMessage.content.trim(),
      createdAt: new Date().toISOString(),
    };

    await appendCounselingRecordAssistantMessages(currentUser.id, recordId, [
      userMessage,
    ]);

    const upstream = parsed.data.useWebSearch
      ? await streamWebSearchAiChat(parsed.data.messages)
      : await streamCounselingAiChat(
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

    const [clientStream, persistenceStream] = upstream.tee();

    void persistAssistantMessageFromStream({
      stream: persistenceStream,
      userId: currentUser.id,
      recordId,
    }).catch((error) => {
      console.error("counseling-ai-chat-persist-error", error);
    });

    return new Response(clientStream, {
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

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { recordId } = await context.params;

  try {
    await clearCounselingRecordAssistantMessages(currentUser.id, recordId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error("counseling-ai-chat-clear-error", error);
    return jsonError("채팅 기록을 초기화하지 못했습니다.", 500);
  }
}
