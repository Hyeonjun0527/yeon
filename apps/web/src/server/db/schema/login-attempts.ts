import {
  bigint,
  boolean,
  index,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: bigint("id", { mode: "bigint" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    email: varchar("email", { length: 320 }).notNull(),
    ipAddress: varchar("ip_address", { length: 64 }).notNull(),
    success: boolean("success").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("login_attempts_email_attempted_at_idx").on(
      table.email,
      table.attemptedAt,
    ),
    index("login_attempts_ip_attempted_at_idx").on(
      table.ipAddress,
      table.attemptedAt,
    ),
  ],
);
