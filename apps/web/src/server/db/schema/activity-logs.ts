import {
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { members } from "./members";
import { spaces } from "./spaces";

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  spaceId: uuid("space_id")
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
});
