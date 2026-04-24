import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    token: uuid("token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("password_reset_tokens_user_id_idx").on(table.userId),
  ],
);
