import {
  CHAT_SERVICE_DM_UNLOCK_AMOUNT,
  chatServicePublicProfileDtoSchema,
  chatServiceProfileDtoSchema,
  chatServiceProfileSummaryDtoSchema,
  type ChatServicePublicProfileDto,
  type ChatServiceProfileDto,
  type ChatServiceProfileSummaryDto,
} from "@yeon/api-contract/chat-service";
import { and, eq, inArray, or } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";

import { getDb } from "@/server/db";
import {
  chatServiceAskPosts,
  chatServiceBlocks,
  chatServiceChatMessages,
  chatServiceChatRooms,
  chatServiceDemoMeta,
  chatServiceDmUnlocks,
  chatServiceFeedPosts,
  chatServiceFriendLinks,
  chatServiceProfiles,
} from "@/server/db/schema";
import { ServiceError } from "@/server/services/service-error";

export const CHAT_SERVICE_OTP_TTL_MS = 5 * 60 * 1000;
export const CHAT_SERVICE_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type ChatServiceProfileRow = typeof chatServiceProfiles.$inferSelect;
export type ChatServiceChatRoomRow = typeof chatServiceChatRooms.$inferSelect;
const CHAT_SERVICE_DEMO_SEED_ENABLED =
  process.env.ENABLE_CHAT_SERVICE_DEMO_SEED === "true";

export function hashChatServiceSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeChatServicePhoneNumber(input: string) {
  const digits = input.replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 11) {
    throw new ServiceError(400, "전화번호 형식이 올바르지 않습니다.");
  }

  return digits;
}

export function maskChatServicePhoneNumber(phoneNumber: string) {
  if (phoneNumber.length < 8) {
    return phoneNumber;
  }

  return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 5)}**-${phoneNumber.slice(-4)}`;
}

export function createChatServiceNickname(phoneNumber: string) {
  return `유저${phoneNumber.slice(-4)}`;
}

export function createChatServiceRoomKey(userAId: string, userBId: string) {
  return [userAId, userBId].sort().join(":");
}

export function parseChatServiceOptionsJson(optionsJson: string) {
  try {
    const parsed = JSON.parse(optionsJson);

    if (Array.isArray(parsed)) {
      return parsed
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean);
    }
  } catch {
    return [];
  }

  return [];
}

export function buildChatServiceProfileSummary(
  profile: ChatServiceProfileRow,
): ChatServiceProfileSummaryDto {
  return chatServiceProfileSummaryDtoSchema.parse({
    id: profile.id,
    nickname: profile.nickname,
    ageLabel: profile.ageLabel,
    regionLabel: profile.regionLabel,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    points: profile.points,
  });
}

export function buildChatServiceProfileDetail(
  profile: ChatServiceProfileRow,
): ChatServiceProfileDto {
  return chatServiceProfileDtoSchema.parse({
    id: profile.id,
    phoneNumberMasked: maskChatServicePhoneNumber(profile.phoneNumber),
    nickname: profile.nickname,
    ageLabel: profile.ageLabel,
    regionLabel: profile.regionLabel,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    points: profile.points,
    notificationsEnabled: profile.notificationsEnabled,
  });
}

export function buildChatServicePublicProfile(
  profile: ChatServiceProfileRow,
): ChatServicePublicProfileDto {
  return chatServicePublicProfileDtoSchema.parse({
    id: profile.id,
    nickname: profile.nickname,
    ageLabel: profile.ageLabel,
    regionLabel: profile.regionLabel,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    points: profile.points,
  });
}

export async function getChatServiceProfileById(profileId: string) {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(chatServiceProfiles)
    .where(eq(chatServiceProfiles.id, profileId))
    .limit(1);

  return profile ?? null;
}

export async function listChatServiceProfilesByIds(profileIds: string[]) {
  if (profileIds.length === 0) {
    return [];
  }

  const uniqueIds = [...new Set(profileIds)];
  const db = getDb();

  return db
    .select()
    .from(chatServiceProfiles)
    .where(inArray(chatServiceProfiles.id, uniqueIds));
}

export async function listChatServiceBlockedProfiles(blockerId: string) {
  const db = getDb();
  const blockRows = await db
    .select()
    .from(chatServiceBlocks)
    .where(eq(chatServiceBlocks.blockerId, blockerId));

  return listChatServiceProfilesByIds(blockRows.map((row) => row.blockedId));
}

export async function listChatServiceBlockedRelationIds(
  currentProfileId: string,
) {
  const db = getDb();
  const blockRows = await db
    .select({
      blockedId: chatServiceBlocks.blockedId,
      blockerId: chatServiceBlocks.blockerId,
    })
    .from(chatServiceBlocks)
    .where(
      or(
        eq(chatServiceBlocks.blockerId, currentProfileId),
        eq(chatServiceBlocks.blockedId, currentProfileId),
      ),
    );

  return new Set(
    blockRows.map((row) =>
      row.blockerId === currentProfileId ? row.blockedId : row.blockerId,
    ),
  );
}

export async function assertChatServiceInteractionAllowed(
  currentProfileId: string,
  targetProfileId: string,
) {
  if (currentProfileId === targetProfileId) {
    throw new ServiceError(400, "자기 자신과는 상호작용할 수 없습니다.");
  }

  const db = getDb();
  const [blocked] = await db
    .select()
    .from(chatServiceBlocks)
    .where(
      or(
        and(
          eq(chatServiceBlocks.blockerId, currentProfileId),
          eq(chatServiceBlocks.blockedId, targetProfileId),
        ),
        and(
          eq(chatServiceBlocks.blockerId, targetProfileId),
          eq(chatServiceBlocks.blockedId, currentProfileId),
        ),
      ),
    )
    .limit(1);

  if (blocked) {
    throw new ServiceError(
      403,
      "차단 관계에서는 이 작업을 수행할 수 없습니다.",
    );
  }
}

export async function ensureChatServiceSeedData() {
  if (!CHAT_SERVICE_DEMO_SEED_ENABLED) {
    return;
  }

  const db = getDb();
  const existingSeed = await db.select().from(chatServiceDemoMeta).limit(1);

  if (existingSeed.length > 0) {
    return;
  }

  const profileA = randomUUID();
  const profileB = randomUUID();
  const profileC = randomUUID();
  const profileD = randomUUID();
  const profileE = randomUUID();
  const roomId = randomUUID();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(chatServiceProfiles).values([
      {
        id: profileA,
        phoneNumber: "01090000001",
        nickname: "시냥",
        ageLabel: "19세",
        regionLabel: "우주",
        bio: "너무늙었어요",
        points: 950,
      },
      {
        id: profileB,
        phoneNumber: "01090000002",
        nickname: "오호이야",
        ageLabel: "21살",
        regionLabel: "충남",
        bio: "야르",
        points: 880,
      },
      {
        id: profileC,
        phoneNumber: "01090000003",
        nickname: "일일",
        ageLabel: "19살",
        regionLabel: "경기",
        bio: "용인",
        points: 1100,
      },
      {
        id: profileD,
        phoneNumber: "01090000004",
        nickname: "좋아",
        ageLabel: "20살",
        regionLabel: "서울",
        bio: "물방울",
        points: 950,
      },
      {
        id: profileE,
        phoneNumber: "01090000005",
        nickname: "ss",
        ageLabel: "28살",
        regionLabel: "대구",
        bio: "뭐해",
        points: 1020,
      },
    ]);

    await tx.insert(chatServiceFeedPosts).values([
      {
        id: randomUUID(),
        authorId: profileA,
        body: "왁ㅋㅋ비응신새기",
      },
      {
        id: randomUUID(),
        authorId: profileB,
        body: "너무늙었어요",
      },
      {
        id: randomUUID(),
        authorId: profileC,
        body: "@좋아 요즘 뭐함",
      },
    ]);

    await tx.insert(chatServiceAskPosts).values([
      {
        id: randomUUID(),
        authorId: profileD,
        question: "오늘 밤에 뭐할까?",
        kind: "poll",
        optionsJson: JSON.stringify(["자기", "채팅하기", "게임하기"]),
      },
      {
        id: randomUUID(),
        authorId: profileE,
        question: "피드랑 DM 둘 다 있는 앱 어때?",
        kind: "question",
        optionsJson: "[]",
      },
    ]);

    await tx.insert(chatServiceFriendLinks).values([
      {
        id: randomUUID(),
        requesterId: profileA,
        addresseeId: profileB,
        status: "accepted",
      },
      {
        id: randomUUID(),
        requesterId: profileC,
        addresseeId: profileA,
        status: "pending",
      },
    ]);

    await tx.insert(chatServiceChatRooms).values({
      id: roomId,
      roomKey: createChatServiceRoomKey(profileA, profileB),
      userAId: profileA,
      userBId: profileB,
      unlockedByPayment: true,
      lastMessageAt: now,
    });

    await tx.insert(chatServiceDmUnlocks).values({
      id: randomUUID(),
      roomId,
      openerId: profileA,
      targetId: profileB,
      amount: CHAT_SERVICE_DM_UNLOCK_AMOUNT,
    });

    await tx.insert(chatServiceChatMessages).values([
      {
        id: randomUUID(),
        roomId,
        senderId: profileA,
        body: "시냥님 저랑 사귈래요?",
      },
      {
        id: randomUUID(),
        roomId,
        senderId: profileB,
        body: "야르",
      },
    ]);

    await tx.insert(chatServiceDemoMeta).values({
      seedVersion: 1,
    });
  });
}
