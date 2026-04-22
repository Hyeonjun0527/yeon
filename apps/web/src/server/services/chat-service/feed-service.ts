import { chatServiceCreateFeedPostResponseSchema } from "@yeon/api-contract/chat-service";
import { desc, eq, isNull, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/server/db";
import { chatServiceFeedPosts } from "@/server/db/schema";
import { ServiceError } from "@/server/services/service-error";

import {
  buildChatServiceProfileSummary,
  ensureChatServiceSeedData,
  listChatServiceBlockedRelationIds,
  listChatServiceProfilesByIds,
} from "./common";

function buildReplyCountMap(
  rows: Array<{
    replyToPostId: string | null;
    authorId: string;
  }>,
  blockedRelationIds: Set<string>,
) {
  const replyCountMap = new Map<string, number>();

  for (const row of rows) {
    if (!row.replyToPostId || blockedRelationIds.has(row.authorId)) {
      continue;
    }

    replyCountMap.set(
      row.replyToPostId,
      (replyCountMap.get(row.replyToPostId) ?? 0) + 1,
    );
  }

  return replyCountMap;
}

async function listReplyCounts(
  postIds: string[],
  blockedRelationIds: Set<string>,
) {
  if (postIds.length === 0) {
    return new Map<string, number>();
  }

  const db = getDb();
  const rows = await db
    .select({
      authorId: chatServiceFeedPosts.authorId,
      replyToPostId: chatServiceFeedPosts.replyToPostId,
    })
    .from(chatServiceFeedPosts)
    .where(
      or(
        ...postIds.map((postId) =>
          eq(chatServiceFeedPosts.replyToPostId, postId),
        ),
      ),
    );

  return buildReplyCountMap(rows, blockedRelationIds);
}

async function buildFeedPostsFromRows(
  rows: (typeof chatServiceFeedPosts.$inferSelect)[],
  blockedRelationIds: Set<string>,
) {
  const visibleRows = rows.filter(
    (row) => !blockedRelationIds.has(row.authorId),
  );
  const authors = await listChatServiceProfilesByIds(
    visibleRows.map((row) => row.authorId),
  );
  const authorMap = new Map(authors.map((author) => [author.id, author]));
  const replyCountMap = await listReplyCounts(
    visibleRows.map((row) => row.id),
    blockedRelationIds,
  );

  return visibleRows.map((row) => {
    const author = authorMap.get(row.authorId);

    if (!author) {
      throw new ServiceError(500, "피드 작성자 정보를 찾지 못했습니다.");
    }

    return chatServiceCreateFeedPostResponseSchema.shape.post.parse({
      id: row.id,
      body: row.body,
      replyToPostId: row.replyToPostId,
      replyCount: replyCountMap.get(row.id) ?? 0,
      author: buildChatServiceProfileSummary(author),
      createdAt: row.createdAt.toISOString(),
    });
  });
}

export async function listChatServiceFeed(currentProfileId: string) {
  await ensureChatServiceSeedData();
  const blockedRelationIds =
    await listChatServiceBlockedRelationIds(currentProfileId);

  const db = getDb();
  const rows = await db
    .select()
    .from(chatServiceFeedPosts)
    .where(isNull(chatServiceFeedPosts.replyToPostId))
    .orderBy(desc(chatServiceFeedPosts.createdAt))
    .limit(30);

  return {
    posts: await buildFeedPostsFromRows(rows, blockedRelationIds),
  };
}

export async function listChatServiceFeedReplies(
  currentProfileId: string,
  postId: string,
) {
  const blockedRelationIds =
    await listChatServiceBlockedRelationIds(currentProfileId);
  const db = getDb();
  const rows = await db
    .select()
    .from(chatServiceFeedPosts)
    .where(eq(chatServiceFeedPosts.replyToPostId, postId))
    .orderBy(desc(chatServiceFeedPosts.createdAt))
    .limit(50);

  return {
    replies: await buildFeedPostsFromRows(rows, blockedRelationIds),
  };
}

export async function createChatServiceFeedPost(
  profileId: string,
  body: string,
  replyToPostId?: string,
) {
  const db = getDb();

  if (replyToPostId) {
    const [parentPost] = await db
      .select()
      .from(chatServiceFeedPosts)
      .where(eq(chatServiceFeedPosts.id, replyToPostId))
      .limit(1);

    if (!parentPost) {
      throw new ServiceError(404, "답글을 달 대상 글을 찾지 못했습니다.");
    }

    if (parentPost.replyToPostId) {
      throw new ServiceError(400, "답글에는 다시 답글을 달 수 없습니다.");
    }
  }

  const [row] = await db
    .insert(chatServiceFeedPosts)
    .values({
      id: randomUUID(),
      authorId: profileId,
      replyToPostId: replyToPostId ?? null,
      body,
    })
    .returning();

  const [post] = await buildFeedPostsFromRows([row], new Set());

  return {
    post,
  };
}
