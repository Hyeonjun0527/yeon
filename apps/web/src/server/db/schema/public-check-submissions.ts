import {
  bigint,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { members } from "./members";
import { publicCheckSessions } from "./public-check-sessions";
import { spaces } from "./spaces";

export const publicCheckSubmissions = pgTable(
  "public_check_submissions",
  {
    id: bigint("id", { mode: "bigint" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    publicId: text("public_id").notNull().unique(),
    sessionId: bigint("session_id", { mode: "bigint" })
      .notNull()
      .references(() => publicCheckSessions.id, { onDelete: "cascade" }),
    spaceId: bigint("space_id", { mode: "bigint" })
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    memberId: bigint("member_id", { mode: "bigint" }).references(
      () => members.id,
      {
        onDelete: "set null",
      },
    ),
    checkMethod: varchar("check_method", { length: 20 }).notNull(),
    verificationStatus: varchar("verification_status", {
      length: 30,
    }).notNull(),
    submittedName: varchar("submitted_name", { length: 100 }).notNull(),
    submittedPhoneLast4: varchar("submitted_phone_last4", {
      length: 4,
    }).notNull(),
    assignmentStatus: varchar("assignment_status", { length: 20 }),
    assignmentLink: varchar("assignment_link", { length: 1000 }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    distanceMeters: doublePrecision("distance_meters"),
    metadata: jsonb("metadata"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("public_check_submissions_session_submitted_at_idx").on(
      table.sessionId,
      table.submittedAt,
    ),
    index("public_check_submissions_space_member_idx").on(
      table.spaceId,
      table.memberId,
    ),
  ],
);
