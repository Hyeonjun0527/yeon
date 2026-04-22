import {
  chatServiceCreateAskPostResponseSchema,
  chatServiceVoteAskPostResponseSchema,
  type ChatServiceCreateAskPostBody,
} from "@yeon/api-contract/chat-service";
import { and, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/server/db";
import { chatServiceAskPosts, chatServiceAskVotes } from "@/server/db/schema";
import { ServiceError } from "@/server/services/service-error";

import {
  buildChatServiceProfileSummary,
  ensureChatServiceSeedData,
  listChatServiceBlockedRelationIds,
  listChatServiceProfilesByIds,
  parseChatServiceOptionsJson,
} from "./common";

async function buildAskPostDtos(
  rows: (typeof chatServiceAskPosts.$inferSelect)[],
  currentProfileId: string,
) {
  const db = getDb();
  const authors = await listChatServiceProfilesByIds(
    rows.map((row) => row.authorId),
  );
  const authorMap = new Map(authors.map((author) => [author.id, author]));
  const voteRows =
    rows.length > 0
      ? await db
          .select()
          .from(chatServiceAskVotes)
          .where(
            inArray(
              chatServiceAskVotes.postId,
              rows.map((row) => row.id),
            ),
          )
      : [];

  return rows.map((row) => {
    const author = authorMap.get(row.authorId);

    if (!author) {
      throw new ServiceError(500, "에스크 작성자 정보를 찾지 못했습니다.");
    }

    const options = parseChatServiceOptionsJson(row.optionsJson);
    const votes = voteRows.filter((vote) => vote.postId === row.id);
    const totalVotes = votes.length;
    const userVote =
      votes.find((vote) => vote.voterId === currentProfileId) ?? null;

    return chatServiceCreateAskPostResponseSchema.shape.post.parse({
      id: row.id,
      question: row.question,
      kind: row.kind,
      options: options.map((label, index) => ({
        index,
        label,
        voteCount: votes.filter((vote) => vote.optionIndex === index).length,
      })),
      totalVotes,
      userVoteIndex: userVote?.optionIndex ?? null,
      author: buildChatServiceProfileSummary(author),
      createdAt: row.createdAt.toISOString(),
    });
  });
}

export async function listChatServiceAskPosts(currentProfileId: string) {
  await ensureChatServiceSeedData();
  const blockedRelationIds =
    await listChatServiceBlockedRelationIds(currentProfileId);

  const db = getDb();
  const rows = await db
    .select()
    .from(chatServiceAskPosts)
    .orderBy(desc(chatServiceAskPosts.createdAt))
    .limit(30);

  return {
    posts: await buildAskPostDtos(
      rows.filter((row) => !blockedRelationIds.has(row.authorId)),
      currentProfileId,
    ),
  };
}

export async function createChatServiceAskPost(
  profileId: string,
  input: ChatServiceCreateAskPostBody,
) {
  const db = getDb();
  const [row] = await db
    .insert(chatServiceAskPosts)
    .values({
      id: randomUUID(),
      authorId: profileId,
      question: input.question,
      kind: input.kind,
      optionsJson: JSON.stringify(
        (input.options ?? []).map((option) => option.label),
      ),
    })
    .returning();

  const [post] = await buildAskPostDtos([row], profileId);

  return {
    post,
  };
}

export async function voteChatServiceAskPost(
  profileId: string,
  postId: string,
  optionIndex: number,
) {
  const db = getDb();
  const [post] = await db
    .select()
    .from(chatServiceAskPosts)
    .where(eq(chatServiceAskPosts.id, postId))
    .limit(1);

  if (!post) {
    throw new ServiceError(404, "투표 글을 찾지 못했습니다.");
  }

  if (post.kind !== "poll") {
    throw new ServiceError(400, "일반 질문글에는 투표할 수 없습니다.");
  }

  const options = parseChatServiceOptionsJson(post.optionsJson);

  if (optionIndex < 0 || optionIndex >= options.length) {
    throw new ServiceError(400, "선택지 인덱스가 올바르지 않습니다.");
  }

  const [existingVote] = await db
    .select()
    .from(chatServiceAskVotes)
    .where(
      and(
        eq(chatServiceAskVotes.postId, postId),
        eq(chatServiceAskVotes.voterId, profileId),
      ),
    )
    .limit(1);

  if (existingVote) {
    await db
      .update(chatServiceAskVotes)
      .set({
        optionIndex,
      })
      .where(eq(chatServiceAskVotes.id, existingVote.id));
  } else {
    await db.insert(chatServiceAskVotes).values({
      id: randomUUID(),
      postId,
      voterId: profileId,
      optionIndex,
    });
  }

  const [updatedPost] = await buildAskPostDtos([post], profileId);

  return chatServiceVoteAskPostResponseSchema.parse({
    post: updatedPost,
  });
}
