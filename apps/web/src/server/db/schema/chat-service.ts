import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const chatServiceProfiles = pgTable(
  "chat_service_profiles",
  {
    id: uuid("id").primaryKey(),
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
    nickname: varchar("nickname", { length: 40 }).notNull(),
    ageLabel: varchar("age_label", { length: 20 }).notNull(),
    regionLabel: varchar("region_label", { length: 40 }).notNull(),
    avatarUrl: varchar("avatar_url", { length: 2048 }),
    bio: varchar("bio", { length: 160 }).notNull().default(""),
    points: integer("points").notNull().default(1000),
    notificationsEnabled: boolean("notifications_enabled")
      .notNull()
      .default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("chat_service_profiles_phone_number_key").on(table.phoneNumber),
  ],
);

export const chatServiceAuthChallenges = pgTable(
  "chat_service_auth_challenges",
  {
    id: uuid("id").primaryKey(),
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_service_auth_challenges_phone_idx").on(
      table.phoneNumber,
      table.createdAt,
    ),
  ],
);

export const chatServiceAuthSessions = pgTable(
  "chat_service_auth_sessions",
  {
    id: uuid("id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => chatServiceProfiles.id, { onDelete: "cascade" }),
    sessionTokenHash: varchar("session_token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("chat_service_auth_sessions_token_hash_key").on(
      table.sessionTokenHash,
    ),
  ],
);

export const chatServiceFeedPosts = pgTable(
  "chat_service_feed_posts",
  {
    id: uuid("id").primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => chatServiceProfiles.id, { onDelete: "cascade" }),
    replyToPostId: uuid("reply_to_post_id"),
    body: varchar("body", { length: 400 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_service_feed_posts_author_created_idx").on(
      table.authorId,
      table.createdAt,
    ),
    index("chat_service_feed_posts_reply_idx").on(table.replyToPostId),
  ],
);

export const chatServiceAskPosts = pgTable(
  "chat_service_ask_posts",
  {
    id: uuid("id").primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => chatServiceProfiles.id, { onDelete: "cascade" }),
    question: varchar("question", { length: 240 }).notNull(),
    kind: varchar("kind", { length: 16 }).notNull(),
    optionsJson: text("options_json").notNull().default("[]"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_service_ask_posts_author_created_idx").on(
      table.authorId,
      table.createdAt,
    ),
  ],
);

export const chatServiceAskVotes = pgTable(
  "chat_service_ask_votes",
  {
    id: uuid("id").primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => chatServiceAskPosts.id, { onDelete: "cascade" }),
    voterId: uuid("voter_id")
      .notNull()
      .references(() => chatServiceProfiles.id, { onDelete: "cascade" }),
    optionIndex: integer("option_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("chat_service_ask_votes_post_voter_key").on(
      table.postId,
      table.voterId,
    ),
  ],
);

export const chatServiceFriendLinks = pgTable(
  "chat_service_friend_links",
  {
    id: uuid("id").primaryKey(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => chatServiceProfiles.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => chatServiceProfiles.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 16 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("chat_service_friend_links_requester_addressee_key").on(
      table.requesterId,
      table.addresseeId,
    ),
  ],
);

export const chatServiceBlocks = pgTable(
  "chat_service_blocks",
  {
    id: uuid("id").primaryKey(),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => chatServiceProfiles.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => chatServiceProfiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("chat_service_blocks_blocker_blocked_key").on(
      table.blockerId,
      table.blockedId,
    ),
  ],
);

export const chatServiceChatRooms = pgTable(
  "chat_service_chat_rooms",
  {
    id: uuid("id").primaryKey(),
    roomKey: varchar("room_key", { length: 80 }).notNull(),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => chatServiceProfiles.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => chatServiceProfiles.id, { onDelete: "cascade" }),
    unlockedByPayment: boolean("unlocked_by_payment").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("chat_service_chat_rooms_room_key_key").on(table.roomKey),
    index("chat_service_chat_rooms_user_a_last_message_idx").on(
      table.userAId,
      table.lastMessageAt,
    ),
    index("chat_service_chat_rooms_user_b_last_message_idx").on(
      table.userBId,
      table.lastMessageAt,
    ),
  ],
);

export const chatServiceDmUnlocks = pgTable(
  "chat_service_dm_unlocks",
  {
    id: uuid("id").primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => chatServiceChatRooms.id, { onDelete: "cascade" }),
    openerId: uuid("opener_id")
      .notNull()
      .references(() => chatServiceProfiles.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => chatServiceProfiles.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_service_dm_unlocks_opener_created_idx").on(
      table.openerId,
      table.createdAt,
    ),
  ],
);

export const chatServiceChatMessages = pgTable(
  "chat_service_chat_messages",
  {
    id: uuid("id").primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => chatServiceChatRooms.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => chatServiceProfiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_service_chat_messages_room_created_idx").on(
      table.roomId,
      table.createdAt,
    ),
  ],
);

export const chatServiceReports = pgTable(
  "chat_service_reports",
  {
    id: uuid("id").primaryKey(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => chatServiceProfiles.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 24 }).notNull(),
    targetId: text("target_id").notNull(),
    reason: varchar("reason", { length: 240 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("received"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_service_reports_reporter_created_idx").on(
      table.reporterId,
      table.createdAt,
    ),
  ],
);

export const chatServiceDemoMeta = pgTable("chat_service_demo_meta", {
  id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  seedVersion: integer("seed_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
