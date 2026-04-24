import {
  bigint,
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

/**
 * member_id는 외부 sheet row의 식별자로 쓰이는 uuid 값이라 FK를 걸지 않고
 * uuid를 그대로 유지한다 (다른 도메인 테이블의 bigint FK와 구분).
 */
export const sheetIntegrationMemberSnapshots = pgTable(
  "sheet_integration_member_snapshots",
  {
    id: bigint("id", { mode: "bigint" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    publicId: text("public_id").notNull().unique(),
    integrationId: bigint("integration_id", { mode: "bigint" })
      .notNull()
      .references(() => sheetIntegrations.id, { onDelete: "cascade" }),
    spaceId: bigint("space_id", { mode: "bigint" })
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
