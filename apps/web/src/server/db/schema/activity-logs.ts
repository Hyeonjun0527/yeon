import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { members } from "./members";
import { spaces } from "./spaces";

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: bigint("id", { mode: "bigint" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    publicId: text("public_id").notNull().unique(),
    memberId: bigint("member_id", { mode: "bigint" })
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    spaceId: bigint("space_id", { mode: "bigint" })
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 30 }).notNull(),
    status: varchar("status", { length: 30 }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    source: varchar("source", { length: 30 }).notNull().default("manual"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activity_logs_member_space_recorded_at_idx").on(
      table.memberId,
      table.spaceId,
      table.recordedAt,
    ),
  ],
);
