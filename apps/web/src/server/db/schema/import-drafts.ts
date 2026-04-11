import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const importDrafts = pgTable("import_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  sourceFileId: varchar("source_file_id", { length: 255 }),
  sourceFileName: varchar("source_file_name", { length: 255 }).notNull(),
  sourceMimeType: varchar("source_mime_type", { length: 120 }),
  sourceFileKind: varchar("source_file_kind", { length: 30 }).notNull(),
  sourceByteSize: integer("source_byte_size").notNull(),
  sourceLastModifiedAt: timestamp("source_last_modified_at", {
    withTimezone: true,
  }),
  sourceFileBase64: text("source_file_base64"),
  processingStage: varchar("processing_stage", { length: 30 })
    .notNull()
    .default("queued"),
  processingProgress: integer("processing_progress").notNull().default(0),
  processingMessage: text("processing_message"),
  preview: jsonb("preview"),
  importResult: jsonb("import_result"),
  errorMessage: text("error_message"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
