import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { members } from "./members";
import { spaces } from "./spaces";
import { users } from "./users";

export const counselingRecords = pgTable("counseling_records", {
  id: uuid("id").primaryKey(),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  studentName: varchar("student_name", { length: 80 }).notNull(),
  sessionTitle: varchar("session_title", { length: 160 }).notNull(),
  counselingType: varchar("counseling_type", { length: 40 }).notNull(),
  counselorName: varchar("counselor_name", { length: 80 }),
  status: varchar("status", { length: 20 }).notNull(),
  audioOriginalName: varchar("audio_original_name", { length: 255 }).notNull(),
  audioMimeType: varchar("audio_mime_type", { length: 120 }).notNull(),
  audioByteSize: integer("audio_byte_size").notNull(),
  audioDurationMs: integer("audio_duration_ms"),
  audioStoragePath: varchar("audio_storage_path", { length: 1024 }).notNull(),
  audioSha256: varchar("audio_sha256", { length: 64 }).notNull(),
  language: varchar("language", { length: 12 }),
  sttModel: varchar("stt_model", { length: 64 }),
  transcriptText: text("transcript_text").notNull().default(""),
  transcriptSegmentCount: integer("transcript_segment_count")
    .notNull()
    .default(0),
  spaceId: uuid("space_id").references(() => spaces.id, {
    onDelete: "set null",
  }),
  memberId: uuid("member_id").references(() => members.id, {
    onDelete: "set null",
  }),
  analysisResult: jsonb("analysis_result"),
  errorMessage: text("error_message"),
  transcriptionCompletedAt: timestamp("transcription_completed_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
