import {
  boolean,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { spaces } from "./spaces";
import { users } from "./users";

export const memberTabDefinitions = pgTable(
  "member_tab_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /** 'system' | 'custom' */
    tabType: varchar("tab_type", { length: 20 }).notNull(),

    /**
     * 시스템 탭 식별자: 'overview' | 'counseling' | 'memos' | 'report'
     * 커스텀 탭은 null
     */
    systemKey: varchar("system_key", { length: 30 }),

    /** 운영자가 변경 가능한 표시 이름 */
    name: varchar("name", { length: 80 }).notNull(),

    /** false 이면 탭 바에서 숨김 */
    isVisible: boolean("is_visible").notNull().default(true),

    /** 탭 바 표시 순서 (오름차순) */
    displayOrder: integer("display_order").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // 스페이스 내 시스템 탭은 system_key가 유니크
    unique("member_tab_definitions_space_system_key_unique").on(
      t.spaceId,
      t.systemKey,
    ),
  ],
);
