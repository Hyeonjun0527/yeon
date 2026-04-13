import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const homeInsightBannerDismissals = pgTable(
  "home_insight_banner_dismissals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bannerKey: varchar("banner_key", { length: 40 }).notNull(),
    hiddenUntil: timestamp("hidden_until", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("home_insight_banner_dismissals_user_banner_key").on(
      table.userId,
      table.bannerKey,
    ),
    index("home_insight_banner_dismissals_user_hidden_until_idx").on(
      table.userId,
      table.hiddenUntil,
    ),
  ],
);
