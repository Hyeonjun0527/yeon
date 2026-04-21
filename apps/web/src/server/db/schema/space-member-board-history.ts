import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { members } from "./members";
import { publicCheckSessions } from "./public-check-sessions";
import { spaces } from "./spaces";
import { users } from "./users";

export const spaceMemberBoardHistory = pgTable(
  "space_member_board_history",
  {
    id: bigint("id", { mode: "bigint" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    publicId: text("public_id").notNull().unique(),
    spaceId: bigint("space_id", { mode: "bigint" })
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    memberId: bigint("member_id", { mode: "bigint" })
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    sessionId: bigint("session_id", { mode: "bigint" }).references(
      () => publicCheckSessions.id,
      {
        onDelete: "set null",
      },
    ),
    attendanceStatus: varchar("attendance_status", { length: 20 })
      .notNull()
      .default("unknown"),
    assignmentStatus: varchar("assignment_status", { length: 20 })
      .notNull()
      .default("unknown"),
    assignmentLink: varchar("assignment_link", { length: 1000 }),
    source: varchar("source", { length: 30 }).notNull(),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    happenedAt: timestamp("happened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("space_member_board_history_space_happened_at_idx").on(
      table.spaceId,
      table.happenedAt,
    ),
    index("space_member_board_history_member_happened_at_idx").on(
      table.memberId,
      table.happenedAt,
    ),
  ],
);
