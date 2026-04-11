import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { spaces } from "./spaces";

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    initialRiskLevel: varchar("initial_risk_level", { length: 10 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("members_space_created_at_idx").on(table.spaceId, table.createdAt),
  ],
);
