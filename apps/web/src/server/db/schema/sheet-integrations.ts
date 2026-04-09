import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { spaces } from "./spaces";

export const sheetIntegrations = pgTable("sheet_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .notNull()
    .references(() => spaces.id, { onDelete: "cascade" }),
  sheetUrl: text("sheet_url").notNull(),
  sheetId: varchar("sheet_id", { length: 200 }).notNull(),
  dataType: varchar("data_type", { length: 30 }).notNull(),
  columnMapping: jsonb("column_mapping"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
