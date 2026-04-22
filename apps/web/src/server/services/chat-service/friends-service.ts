import {
  chatServiceBlockProfileResponseSchema,
  chatServiceFriendMutationResponseSchema,
  chatServiceFriendsOverviewResponseSchema,
} from "@yeon/api-contract/chat-service";
import { and, desc, eq, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/server/db";
import {
  chatServiceBlocks,
  chatServiceFriendLinks,
  chatServiceProfiles,
} from "@/server/db/schema";
import { ServiceError } from "@/server/services/service-error";

import {
  assertChatServiceInteractionAllowed,
  buildChatServiceProfileSummary,
  ensureChatServiceSeedData,
  getChatServiceProfileById,
  listChatServiceBlockedRelationIds,
  listChatServiceBlockedProfiles,
  listChatServiceProfilesByIds,
} from "./common";

function buildFriendCard(
  profile: typeof chatServiceProfiles.$inferSelect,
  status: "accepted" | "pending_sent" | "pending_received",
) {
  return {
    profile: buildChatServiceProfileSummary(profile),
    status,
    previewText: profile.bio || null,
  };
}

async function getExistingFriendLinks(currentProfileId: string) {
  const db = getDb();

  return db
    .select()
    .from(chatServiceFriendLinks)
    .where(
      or(
        eq(chatServiceFriendLinks.requesterId, currentProfileId),
        eq(chatServiceFriendLinks.addresseeId, currentProfileId),
      ),
    )
    .orderBy(desc(chatServiceFriendLinks.updatedAt));
}

async function getFriendLinkBetween(
  currentProfileId: string,
  targetProfileId: string,
) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(chatServiceFriendLinks)
    .where(
      or(
        and(
          eq(chatServiceFriendLinks.requesterId, currentProfileId),
          eq(chatServiceFriendLinks.addresseeId, targetProfileId),
        ),
        and(
          eq(chatServiceFriendLinks.requesterId, targetProfileId),
          eq(chatServiceFriendLinks.addresseeId, currentProfileId),
        ),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function getChatServiceFriendsOverview(currentProfileId: string) {
  await ensureChatServiceSeedData();

  const links = await getExistingFriendLinks(currentProfileId);
  const blockedProfiles =
    await listChatServiceBlockedProfiles(currentProfileId);
  const blockedRelationIds =
    await listChatServiceBlockedRelationIds(currentProfileId);
  const relatedIds = new Set<string>(blockedRelationIds);

  for (const link of links) {
    relatedIds.add(
      link.requesterId === currentProfileId
        ? link.addresseeId
        : link.requesterId,
    );
  }

  const linkedProfiles = await listChatServiceProfilesByIds([...relatedIds]);
  const profileMap = new Map(
    linkedProfiles.map((profile) => [profile.id, profile]),
  );
  const friends = [];
  const pendingSent = [];
  const pendingReceived = [];

  for (const link of links) {
    const targetProfile = profileMap.get(
      link.requesterId === currentProfileId
        ? link.addresseeId
        : link.requesterId,
    );

    if (!targetProfile) {
      continue;
    }

    if (link.status === "accepted") {
      friends.push(buildFriendCard(targetProfile, "accepted"));
      continue;
    }

    if (link.requesterId === currentProfileId) {
      pendingSent.push(buildFriendCard(targetProfile, "pending_sent"));
      continue;
    }

    pendingReceived.push(buildFriendCard(targetProfile, "pending_received"));
  }

  const db = getDb();
  const suggestedRows = await db.select().from(chatServiceProfiles).limit(20);

  const suggested = suggestedRows
    .filter((profile) => profile.id !== currentProfileId)
    .filter((profile) => !relatedIds.has(profile.id))
    .slice(0, 8)
    .map((profile) => buildChatServiceProfileSummary(profile));

  return chatServiceFriendsOverviewResponseSchema.parse({
    friends,
    pendingSent,
    pendingReceived,
    suggested,
    blocked: blockedProfiles.map((profile) =>
      buildChatServiceProfileSummary(profile),
    ),
  });
}

export async function sendChatServiceFriendRequest(
  currentProfileId: string,
  targetProfileId: string,
) {
  await assertChatServiceInteractionAllowed(currentProfileId, targetProfileId);

  const targetProfile = await getChatServiceProfileById(targetProfileId);

  if (!targetProfile) {
    throw new ServiceError(404, "친구 요청 대상 프로필을 찾지 못했습니다.");
  }

  const db = getDb();
  const existingLink = await getFriendLinkBetween(
    currentProfileId,
    targetProfileId,
  );

  if (!existingLink) {
    await db.insert(chatServiceFriendLinks).values({
      id: randomUUID(),
      requesterId: currentProfileId,
      addresseeId: targetProfileId,
      status: "pending",
    });

    return chatServiceFriendMutationResponseSchema.parse({ ok: true });
  }

  if (existingLink.status === "accepted") {
    return chatServiceFriendMutationResponseSchema.parse({ ok: true });
  }

  if (existingLink.requesterId === targetProfileId) {
    await db
      .update(chatServiceFriendLinks)
      .set({
        status: "accepted",
        updatedAt: new Date(),
      })
      .where(eq(chatServiceFriendLinks.id, existingLink.id));

    return chatServiceFriendMutationResponseSchema.parse({ ok: true });
  }

  return chatServiceFriendMutationResponseSchema.parse({ ok: true });
}

export async function blockChatServiceProfile(
  currentProfileId: string,
  targetProfileId: string,
) {
  if (currentProfileId === targetProfileId) {
    throw new ServiceError(400, "자기 자신은 차단할 수 없습니다.");
  }

  const targetProfile = await getChatServiceProfileById(targetProfileId);

  if (!targetProfile) {
    throw new ServiceError(404, "차단 대상 프로필을 찾지 못했습니다.");
  }

  const db = getDb();
  const [existingBlock] = await db
    .select()
    .from(chatServiceBlocks)
    .where(
      and(
        eq(chatServiceBlocks.blockerId, currentProfileId),
        eq(chatServiceBlocks.blockedId, targetProfileId),
      ),
    )
    .limit(1);

  if (!existingBlock) {
    await db.insert(chatServiceBlocks).values({
      id: randomUUID(),
      blockerId: currentProfileId,
      blockedId: targetProfileId,
    });
  }

  await db
    .delete(chatServiceFriendLinks)
    .where(
      or(
        and(
          eq(chatServiceFriendLinks.requesterId, currentProfileId),
          eq(chatServiceFriendLinks.addresseeId, targetProfileId),
        ),
        and(
          eq(chatServiceFriendLinks.requesterId, targetProfileId),
          eq(chatServiceFriendLinks.addresseeId, currentProfileId),
        ),
      ),
    );

  const blockedProfiles =
    await listChatServiceBlockedProfiles(currentProfileId);

  return chatServiceBlockProfileResponseSchema.parse({
    blockedProfiles: blockedProfiles.map((profile) =>
      buildChatServiceProfileSummary(profile),
    ),
  });
}

export async function unblockChatServiceProfile(
  currentProfileId: string,
  targetProfileId: string,
) {
  const targetProfile = await getChatServiceProfileById(targetProfileId);

  if (!targetProfile) {
    throw new ServiceError(404, "차단 해제 대상 프로필을 찾지 못했습니다.");
  }

  const db = getDb();

  await db
    .delete(chatServiceBlocks)
    .where(
      and(
        eq(chatServiceBlocks.blockerId, currentProfileId),
        eq(chatServiceBlocks.blockedId, targetProfileId),
      ),
    );

  const blockedProfiles =
    await listChatServiceBlockedProfiles(currentProfileId);

  return chatServiceBlockProfileResponseSchema.parse({
    blockedProfiles: blockedProfiles.map((profile) =>
      buildChatServiceProfileSummary(profile),
    ),
  });
}
