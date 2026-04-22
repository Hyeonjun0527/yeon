import {
  chatServiceDeleteAccountResponseSchema,
  chatServiceGetProfileResponseSchema,
  chatServiceGetMyProfileResponseSchema,
  chatServiceUpdateMyProfileResponseSchema,
  type ChatServiceUpdateMyProfileBody,
} from "@yeon/api-contract/chat-service";
import { desc, eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { chatServiceProfiles, chatServiceReports } from "@/server/db/schema";
import { ServiceError } from "@/server/services/service-error";

import {
  assertChatServiceInteractionAllowed,
  buildChatServicePublicProfile,
  buildChatServiceProfileDetail,
  buildChatServiceProfileSummary,
  getChatServiceProfileById,
  listChatServiceBlockedProfiles,
} from "./common";

export async function getMyChatServiceProfile(currentProfileId: string) {
  const db = getDb();
  const profile = await getChatServiceProfileById(currentProfileId);

  if (!profile) {
    throw new ServiceError(404, "프로필을 찾지 못했습니다.");
  }

  const blockedProfiles =
    await listChatServiceBlockedProfiles(currentProfileId);
  const reports = await db
    .select()
    .from(chatServiceReports)
    .where(eq(chatServiceReports.reporterId, currentProfileId))
    .orderBy(desc(chatServiceReports.createdAt));

  return chatServiceGetMyProfileResponseSchema.parse({
    profile: buildChatServiceProfileDetail(profile),
    blockedProfiles: blockedProfiles.map((blockedProfile) =>
      buildChatServiceProfileSummary(blockedProfile),
    ),
    reports: reports.map((report) => ({
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    })),
  });
}

export async function getChatServiceProfile(
  currentProfileId: string,
  targetProfileId: string,
) {
  const profile = await getChatServiceProfileById(targetProfileId);

  if (!profile) {
    throw new ServiceError(404, "프로필을 찾지 못했습니다.");
  }

  if (currentProfileId !== targetProfileId) {
    await assertChatServiceInteractionAllowed(
      currentProfileId,
      targetProfileId,
    );
  }

  return chatServiceGetProfileResponseSchema.parse({
    profile: buildChatServicePublicProfile(profile),
  });
}

export async function updateMyChatServiceProfile(
  currentProfileId: string,
  input: ChatServiceUpdateMyProfileBody,
) {
  const db = getDb();
  const [profile] = await db
    .update(chatServiceProfiles)
    .set({
      nickname: input.nickname,
      ageLabel: input.ageLabel,
      regionLabel: input.regionLabel,
      bio: input.bio,
      notificationsEnabled: input.notificationsEnabled,
      updatedAt: new Date(),
    })
    .where(eq(chatServiceProfiles.id, currentProfileId))
    .returning();

  if (!profile) {
    throw new ServiceError(404, "프로필을 찾지 못했습니다.");
  }

  return chatServiceUpdateMyProfileResponseSchema.parse({
    profile: buildChatServiceProfileDetail(profile),
  });
}

export async function deleteMyChatServiceProfile(currentProfileId: string) {
  const db = getDb();
  const [deletedProfile] = await db
    .delete(chatServiceProfiles)
    .where(eq(chatServiceProfiles.id, currentProfileId))
    .returning({
      id: chatServiceProfiles.id,
    });

  if (!deletedProfile) {
    throw new ServiceError(404, "프로필을 찾지 못했습니다.");
  }

  return chatServiceDeleteAccountResponseSchema.parse({
    deleted: true,
  });
}
