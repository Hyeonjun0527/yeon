import {
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { counselingRecords } from "./counseling-records";

export const counselingTranscriptSegments = pgTable(
  "counseling_transcript_segments",
  {
    id: uuid("id").primaryKey(),
    recordId: uuid("record_id")
      .notNull()
      .references(() => counselingRecords.id, { onDelete: "cascade" }),
    segmentIndex: integer("segment_index").notNull(),
    startMs: integer("start_ms"),
    endMs: integer("end_ms"),
    speakerLabel: varchar("speaker_label", { length: 40 }).notNull(),
    speakerTone: varchar("speaker_tone", { length: 20 }).notNull(),
    text: text("text").notNull(),
  },
  (table) => [
    uniqueIndex("counseling_transcript_segments_record_index_key").on(
      table.recordId,
      table.segmentIndex,
    ),
  ],
);
