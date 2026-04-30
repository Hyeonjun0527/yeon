import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import type { LifeOsHourEntry } from "@yeon/domain/life-os";

import { users } from "./users";

export const lifeOsDays = pgTable(
  "life_os_days",
  {
    id: bigint("id", { mode: "bigint" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    publicId: text("public_id").notNull().unique(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    localDate: varchar("local_date", { length: 10 }).notNull(),
    timezone: varchar("timezone", { length: 80 })
      .notNull()
      .default("Asia/Seoul"),
    mindset: text("mindset").notNull().default(""),
    backlogText: text("backlog_text").notNull().default(""),
    entries: jsonb("entries").$type<LifeOsHourEntry[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("life_os_days_owner_local_date_unique").on(
      table.ownerUserId,
      table.localDate,
    ),
    index("life_os_days_owner_updated_at_idx").on(
      table.ownerUserId,
      table.updatedAt,
    ),
  ],
);
