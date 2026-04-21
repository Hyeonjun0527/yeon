import { sql } from "drizzle-orm";
import {
  bigint,
  index,
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

export const counselingRecords = pgTable(
  "counseling_records",
  {
    id: bigint("id", { mode: "bigint" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    publicId: text("public_id").notNull().unique(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentName: varchar("student_name", { length: 80 }).notNull(),
    sessionTitle: varchar("session_title", { length: 160 }).notNull(),
    counselingType: varchar("counseling_type", { length: 40 }).notNull(),
    counselorName: varchar("counselor_name", { length: 80 }),
    status: varchar("status", { length: 20 }).notNull(),
    recordSource: varchar("record_source", { length: 30 })
      .notNull()
      .default("audio_upload"),
    audioOriginalName: varchar("audio_original_name", {
      length: 255,
    }).notNull(),
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
    processingStage: varchar("processing_stage", { length: 30 })
      .notNull()
      .default("queued"),
    processingProgress: integer("processing_progress").notNull().default(0),
    processingMessage: text("processing_message"),
    processingChunkCount: integer("processing_chunk_count")
      .notNull()
      .default(0),
    processingChunkCompletedCount: integer("processing_chunk_completed_count")
      .notNull()
      .default(0),
    transcriptionAttemptCount: integer("transcription_attempt_count")
      .notNull()
      .default(0),
    transcriptionChunks: jsonb("transcription_chunks").$type<unknown[]>(),
    analysisStatus: varchar("analysis_status", { length: 20 })
      .notNull()
      .default("idle"),
    analysisProgress: integer("analysis_progress").notNull().default(0),
    analysisErrorMessage: text("analysis_error_message"),
    analysisAttemptCount: integer("analysis_attempt_count")
      .notNull()
      .default(0),
    spaceId: bigint("space_id", { mode: "bigint" }).references(
      () => spaces.id,
      {
        onDelete: "set null",
      },
    ),
    memberId: bigint("member_id", { mode: "bigint" }).references(
      () => members.id,
      {
        onDelete: "set null",
      },
    ),
    analysisResult: jsonb("analysis_result"),
    assistantMessages: jsonb("assistant_messages")
      .$type<unknown[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    errorMessage: text("error_message"),
    transcriptionCompletedAt: timestamp("transcription_completed_at", {
      withTimezone: true,
    }),
    analysisCompletedAt: timestamp("analysis_completed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("counseling_records_user_created_at_idx").on(
      table.createdByUserId,
      table.createdAt,
    ),
    index("counseling_records_space_created_at_idx").on(
      table.spaceId,
      table.createdAt,
    ),
    index("counseling_records_member_created_at_idx").on(
      table.memberId,
      table.createdAt,
    ),
  ],
);
