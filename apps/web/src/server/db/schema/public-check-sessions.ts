import {
  doublePrecision,
  integer,
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { spaces } from "./spaces";
import { users } from "./users";

export const publicCheckSessions = pgTable(
  "public_check_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    publicToken: varchar("public_token", { length: 120 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    checkMode: varchar("check_mode", { length: 30 })
      .notNull()
      .default("attendance_and_assignment"),
    enabledMethods: jsonb("enabled_methods").notNull(),
    verificationMethod: varchar("verification_method", { length: 40 })
      .notNull()
      .default("name_phone_last4"),
    opensAt: timestamp("opens_at", { withTimezone: true }),
    closesAt: timestamp("closes_at", { withTimezone: true }),
    locationLabel: varchar("location_label", { length: 120 }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    radiusMeters: integer("radius_meters"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("public_check_sessions_space_created_at_idx").on(
      table.spaceId,
      table.createdAt,
    ),
    index("public_check_sessions_token_idx").on(table.publicToken),
  ],
);
