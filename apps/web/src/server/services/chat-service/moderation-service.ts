import { chatServiceCreateReportResponseSchema } from "@yeon/api-contract/chat-service";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/server/db";
import {
  chatServiceAskPosts,
  chatServiceChatMessages,
  chatServiceChatRooms,
  chatServiceFeedPosts,
  chatServiceProfiles,
  chatServiceReports,
} from "@/server/db/schema";
import { ServiceError } from "@/server/services/service-error";

async function assertChatServiceReportTargetExists(
  currentProfileId: string,
  input: {
    targetType: "feed_post" | "ask_post" | "profile" | "chat_message";
    targetId: string;
  },
) {
  const db = getDb();

  if (input.targetType === "feed_post") {
    const [post] = await db
      .select({ id: chatServiceFeedPosts.id })
      .from(chatServiceFeedPosts)
      .where(eq(chatServiceFeedPosts.id, input.targetId))
      .limit(1);

    if (!post) {
      throw new ServiceError(404, "신고 대상 피드 글을 찾지 못했습니다.");
    }

    return;
  }

  if (input.targetType === "ask_post") {
    const [post] = await db
      .select({ id: chatServiceAskPosts.id })
      .from(chatServiceAskPosts)
      .where(eq(chatServiceAskPosts.id, input.targetId))
      .limit(1);

    if (!post) {
      throw new ServiceError(404, "신고 대상 에스크 글을 찾지 못했습니다.");
    }

    return;
  }

  if (input.targetType === "profile") {
    const [profile] = await db
      .select({ id: chatServiceProfiles.id })
      .from(chatServiceProfiles)
      .where(eq(chatServiceProfiles.id, input.targetId))
      .limit(1);

    if (!profile) {
      throw new ServiceError(404, "신고 대상 프로필을 찾지 못했습니다.");
    }

    return;
  }

  const [message] = await db
    .select({
      id: chatServiceChatMessages.id,
      roomId: chatServiceChatMessages.roomId,
    })
    .from(chatServiceChatMessages)
    .where(eq(chatServiceChatMessages.id, input.targetId))
    .limit(1);

  if (!message) {
    throw new ServiceError(404, "신고 대상 메시지를 찾지 못했습니다.");
  }

  const [room] = await db
    .select({
      userAId: chatServiceChatRooms.userAId,
      userBId: chatServiceChatRooms.userBId,
    })
    .from(chatServiceChatRooms)
    .where(eq(chatServiceChatRooms.id, message.roomId))
    .limit(1);

  if (!room) {
    throw new ServiceError(404, "메시지가 속한 대화방을 찾지 못했습니다.");
  }

  if (room.userAId !== currentProfileId && room.userBId !== currentProfileId) {
    throw new ServiceError(
      403,
      "참여 중인 대화방의 메시지만 신고할 수 있습니다.",
    );
  }
}

export async function createChatServiceReport(
  currentProfileId: string,
  input: {
    targetType: "feed_post" | "ask_post" | "profile" | "chat_message";
    targetId: string;
    reason: string;
  },
) {
  await assertChatServiceReportTargetExists(currentProfileId, input);

  const db = getDb();
  const [report] = await db
    .insert(chatServiceReports)
    .values({
      id: randomUUID(),
      reporterId: currentProfileId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      status: "received",
    })
    .returning();

  return chatServiceCreateReportResponseSchema.parse({
    report: {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    },
  });
}
