import {
  bigint,
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * 스페이스 템플릿
 *
 * tabs_config JSONB 구조:
 * [
 *   {
 *     name: string,
 *     tab_type: 'system' | 'custom',
 *     system_key?: string,
 *     display_order: number,
 *     fields: [
 *       { name: string, field_type: string, options?: any[], is_required: boolean, display_order: number }
 *     ]
 *   }
 * ]
 */
export const spaceTemplates = pgTable("space_templates", {
  id: bigint("id", { mode: "bigint" })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  publicId: text("public_id").notNull().unique(),

  /**
   * null 이면 시스템 제공 템플릿 (삭제 불가)
   * 값이 있으면 해당 운영자가 만든 사용자 정의 템플릿
   */
  createdByUserId: uuid("created_by_user_id").references(() => users.id, {
    onDelete: "cascade",
  }),

  name: varchar("name", { length: 80 }).notNull(),
  description: text("description"),

  /** true 이면 플랫폼 기본 제공 (삭제 불가) */
  isSystem: boolean("is_system").notNull().default(false),

  /**
   * 탭 + 필드 구조 스냅샷
   * 스페이스 생성 시 이 JSON 기반으로 탭/필드 자동 생성
   */
  tabsConfig: jsonb("tabs_config").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
