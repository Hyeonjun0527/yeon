import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { sheetIntegrations } from "./sheet-integrations";
import { spaces } from "./spaces";

export const sheetIntegrationMemberSnapshots = pgTable(
  "sheet_integration_member_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => sheetIntegrations.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull(),
    basePayload: jsonb("base_payload").notNull(),
    basePayloadHash: text("base_payload_hash").notNull(),
    exportedAt: timestamp("exported_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("sheet_integration_member_snapshots_integration_member_unique").on(
      table.integrationId,
      table.memberId,
    ),
    index("sheet_integration_member_snapshots_integration_idx").on(
      table.integrationId,
    ),
  ],
);
