import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { members } from "./members";
import { spaces } from "./spaces";
import { users } from "./users";

export const spaceMemberBoards = pgTable(
  "space_member_boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    attendanceStatus: varchar("attendance_status", { length: 20 })
      .notNull()
      .default("unknown"),
    attendanceMarkedAt: timestamp("attendance_marked_at", {
      withTimezone: true,
    }),
    attendanceMarkedSource: varchar("attendance_marked_source", { length: 30 }),
    assignmentStatus: varchar("assignment_status", { length: 20 })
      .notNull()
      .default("unknown"),
    assignmentLink: varchar("assignment_link", { length: 1000 }),
    assignmentMarkedAt: timestamp("assignment_marked_at", {
      withTimezone: true,
    }),
    assignmentMarkedSource: varchar("assignment_marked_source", { length: 30 }),
    lastPublicCheckAt: timestamp("last_public_check_at", {
      withTimezone: true,
    }),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
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
    uniqueIndex("space_member_boards_space_member_key").on(
      table.spaceId,
      table.memberId,
    ),
    index("space_member_boards_space_updated_at_idx").on(
      table.spaceId,
      table.updatedAt,
    ),
  ],
);
