import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
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
    index("email_verification_tokens_user_id_idx").on(table.userId),
  ],
);
