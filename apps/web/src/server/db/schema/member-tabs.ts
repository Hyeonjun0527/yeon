import {
  bigint,
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { spaces } from "./spaces";
import { users } from "./users";

export const memberTabDefinitions = pgTable(
  "member_tab_definitions",
  {
    id: bigint("id", { mode: "bigint" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    publicId: text("public_id").notNull().unique(),
    spaceId: bigint("space_id", { mode: "bigint" })
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    tabType: varchar("tab_type", { length: 20 }).notNull(),
    systemKey: varchar("system_key", { length: 30 }),
    name: varchar("name", { length: 80 }).notNull(),
    isVisible: boolean("is_visible").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("member_tab_definitions_space_system_key_unique").on(
      t.spaceId,
      t.systemKey,
    ),
  ],
);
