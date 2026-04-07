import {
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const userIdentities = pgTable(
  "user_identities",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 20 }).notNull(),
    providerUserId: varchar("provider_user_id", { length: 191 }).notNull(),
    email: varchar("email", { length: 320 }),
    displayName: varchar("display_name", { length: 80 }),
    avatarUrl: varchar("avatar_url", { length: 2048 }),
    linkedAt: timestamp("linked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_identities_provider_user_key").on(
      table.provider,
      table.providerUserId,
    ),
    uniqueIndex("user_identities_user_provider_key").on(
      table.userId,
      table.provider,
    ),
  ],
);
