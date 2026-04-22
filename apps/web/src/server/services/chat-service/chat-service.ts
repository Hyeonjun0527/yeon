import {
  CHAT_SERVICE_DM_UNLOCK_AMOUNT,
  chatServiceGetChatRoomResponseSchema,
  chatServiceListChatRoomsResponseSchema,
  chatServiceOpenChatResponseSchema,
  chatServiceSendChatMessageResponseSchema,
} from "@yeon/api-contract/chat-service";
import { and, asc, desc, eq, gte, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/server/db";
import {
  chatServiceBlocks,
  chatServiceChatMessages,
  chatServiceChatRooms,
  chatServiceDmUnlocks,
  chatServiceFriendLinks,
  chatServiceProfiles,
} from "@/server/db/schema";
import { ServiceError } from "@/server/services/service-error";

import {
  assertChatServiceInteractionAllowed,
  buildChatServiceProfileSummary,
  createChatServiceRoomKey,
  ensureChatServiceSeedData,
  getChatServiceProfileById,
  listChatServiceBlockedRelationIds,
  listChatServiceProfilesByIds,
} from "./common";

async function buildChatRoomDtos(
  rows: (typeof chatServiceChatRooms.$inferSelect)[],
  currentProfileId: string,
) {
  const db = getDb();
  const peerIds = rows.map((row) =>
    row.userAId === currentProfileId ? row.userBId : row.userAId,
  );
  const peers = await listChatServiceProfilesByIds(peerIds);
  const peerMap = new Map(peers.map((peer) => [peer.id, peer]));
  const messages =
    rows.length > 0
      ? await db
          .select()
          .from(chatServiceChatMessages)
          .where(
            or(
              ...rows.map((row) => eq(chatServiceChatMessages.roomId, row.id)),
            ),
          )
          .orderBy(desc(chatServiceChatMessages.createdAt))
      : [];
  const latestByRoomId = new Map<
    string,
    typeof chatServiceChatMessages.$inferSelect
  >();

  for (const message of messages) {
    if (!latestByRoomId.has(message.roomId)) {
      latestByRoomId.set(message.roomId, message);
    }
  }

  return rows.map((row) => {
    const peer = peerMap.get(
      row.userAId === currentProfileId ? row.userBId : row.userAId,
    );

    if (!peer) {
      throw new ServiceError(500, "채팅 상대 프로필을 찾지 못했습니다.");
    }

    const latestMessage = latestByRoomId.get(row.id) ?? null;

    return chatServiceOpenChatResponseSchema.shape.room.parse({
      id: row.id,
      peer: buildChatServiceProfileSummary(peer),
      lastMessagePreview: latestMessage?.body ?? null,
      lastMessageAt: latestMessage?.createdAt.toISOString() ?? null,
      unreadCount: 0,
      unlockedByPayment: row.unlockedByPayment,
    });
  });
}

async function getAcceptedFriendLink(
  currentProfileId: string,
  targetProfileId: string,
) {
  const db = getDb();
  const [link] = await db
    .select()
    .from(chatServiceFriendLinks)
    .where(
      and(
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
        eq(chatServiceFriendLinks.status, "accepted"),
      ),
    )
    .limit(1);

  return link ?? null;
}

export async function openChatServiceRoom(
  currentProfileId: string,
  targetProfileId: string,
) {
  await ensureChatServiceSeedData();
  await assertChatServiceInteractionAllowed(currentProfileId, targetProfileId);

  const db = getDb();
  const roomKey = createChatServiceRoomKey(currentProfileId, targetProfileId);
  const [existingRoom] = await db
    .select()
    .from(chatServiceChatRooms)
    .where(eq(chatServiceChatRooms.roomKey, roomKey))
    .limit(1);

  if (existingRoom) {
    const [room] = await buildChatRoomDtos([existingRoom], currentProfileId);
    return chatServiceOpenChatResponseSchema.parse({ room });
  }

  const currentProfile = await getChatServiceProfileById(currentProfileId);
  const targetProfile = await getChatServiceProfileById(targetProfileId);

  if (!currentProfile || !targetProfile) {
    throw new ServiceError(404, "채팅 상대 프로필을 찾지 못했습니다.");
  }

  const acceptedFriendLink = await getAcceptedFriendLink(
    currentProfileId,
    targetProfileId,
  );
  let roomRow: typeof chatServiceChatRooms.$inferSelect | null = null;

  await db.transaction(async (tx) => {
    const [insertedRoom] = await tx
      .insert(chatServiceChatRooms)
      .values({
        id: randomUUID(),
        roomKey,
        userAId: currentProfileId,
        userBId: targetProfileId,
        unlockedByPayment: !acceptedFriendLink,
      })
      .onConflictDoNothing({
        target: chatServiceChatRooms.roomKey,
      })
      .returning();

    if (!insertedRoom) {
      const [existingRoomInTx] = await tx
        .select()
        .from(chatServiceChatRooms)
        .where(eq(chatServiceChatRooms.roomKey, roomKey))
        .limit(1);

      roomRow = existingRoomInTx ?? null;
      return;
    }

    roomRow = insertedRoom;

    if (!acceptedFriendLink) {
      const [updatedProfile] = await tx
        .update(chatServiceProfiles)
        .set({
          points: sql`${chatServiceProfiles.points} - ${CHAT_SERVICE_DM_UNLOCK_AMOUNT}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(chatServiceProfiles.id, currentProfile.id),
            gte(chatServiceProfiles.points, CHAT_SERVICE_DM_UNLOCK_AMOUNT),
          ),
        )
        .returning();

      if (!updatedProfile) {
        throw new ServiceError(400, "포인트가 부족합니다.");
      }

      await tx.insert(chatServiceDmUnlocks).values({
        id: randomUUID(),
        roomId: insertedRoom.id,
        openerId: currentProfileId,
        targetId: targetProfileId,
        amount: CHAT_SERVICE_DM_UNLOCK_AMOUNT,
      });
    }
  });

  if (!roomRow) {
    throw new ServiceError(500, "대화방을 생성하지 못했습니다.");
  }

  const [room] = await buildChatRoomDtos([roomRow], currentProfileId);

  return chatServiceOpenChatResponseSchema.parse({ room });
}

export async function listChatServiceRooms(currentProfileId: string) {
  const db = getDb();
  const blockedRelationIds =
    await listChatServiceBlockedRelationIds(currentProfileId);
  const rows = await db
    .select()
    .from(chatServiceChatRooms)
    .where(
      or(
        eq(chatServiceChatRooms.userAId, currentProfileId),
        eq(chatServiceChatRooms.userBId, currentProfileId),
      ),
    )
    .orderBy(desc(chatServiceChatRooms.lastMessageAt));

  return chatServiceListChatRoomsResponseSchema.parse({
    rooms: await buildChatRoomDtos(
      rows.filter((row) => {
        const peerId =
          row.userAId === currentProfileId ? row.userBId : row.userAId;

        return !blockedRelationIds.has(peerId);
      }),
      currentProfileId,
    ),
  });
}

export async function getChatServiceRoom(
  currentProfileId: string,
  roomId: string,
) {
  const db = getDb();
  const [room] = await db
    .select()
    .from(chatServiceChatRooms)
    .where(eq(chatServiceChatRooms.id, roomId))
    .limit(1);

  if (!room) {
    throw new ServiceError(404, "채팅방을 찾지 못했습니다.");
  }

  if (room.userAId !== currentProfileId && room.userBId !== currentProfileId) {
    throw new ServiceError(403, "이 채팅방에 접근할 수 없습니다.");
  }

  await assertChatServiceInteractionAllowed(
    currentProfileId,
    room.userAId === currentProfileId ? room.userBId : room.userAId,
  );

  const [roomDto] = await buildChatRoomDtos([room], currentProfileId);
  const messages = await db
    .select()
    .from(chatServiceChatMessages)
    .where(eq(chatServiceChatMessages.roomId, roomId))
    .orderBy(asc(chatServiceChatMessages.createdAt));

  return chatServiceGetChatRoomResponseSchema.parse({
    room: roomDto,
    messages: messages.map((message) => ({
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    })),
  });
}

export async function sendChatServiceMessage(
  currentProfileId: string,
  roomId: string,
  body: string,
) {
  const db = getDb();
  const [room] = await db
    .select()
    .from(chatServiceChatRooms)
    .where(eq(chatServiceChatRooms.id, roomId))
    .limit(1);

  if (!room) {
    throw new ServiceError(404, "채팅방을 찾지 못했습니다.");
  }

  if (room.userAId !== currentProfileId && room.userBId !== currentProfileId) {
    throw new ServiceError(403, "이 채팅방에 메시지를 보낼 수 없습니다.");
  }

  const peerId =
    room.userAId === currentProfileId ? room.userBId : room.userAId;
  const [blocked] = await db
    .select()
    .from(chatServiceBlocks)
    .where(
      or(
        and(
          eq(chatServiceBlocks.blockerId, currentProfileId),
          eq(chatServiceBlocks.blockedId, peerId),
        ),
        and(
          eq(chatServiceBlocks.blockerId, peerId),
          eq(chatServiceBlocks.blockedId, currentProfileId),
        ),
      ),
    )
    .limit(1);

  if (blocked) {
    throw new ServiceError(403, "차단 관계에서는 메시지를 보낼 수 없습니다.");
  }

  const [message] = await db
    .insert(chatServiceChatMessages)
    .values({
      id: randomUUID(),
      roomId,
      senderId: currentProfileId,
      body,
    })
    .returning();

  await db
    .update(chatServiceChatRooms)
    .set({
      lastMessageAt: message.createdAt,
    })
    .where(eq(chatServiceChatRooms.id, roomId));

  return chatServiceSendChatMessageResponseSchema.parse({
    message: {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    },
  });
}
