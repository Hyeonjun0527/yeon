import {
  bigint,
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { members } from "./members";
import { memberTabDefinitions } from "./member-tabs";
import { spaces } from "./spaces";
import { users } from "./users";

/**
 * 커스텀 필드 정의 (스페이스 단위)
 *
 * field_type 지원 목록:
 *   text | long_text | number | date | select | multi_select | checkbox | url | email | phone
 *
 * options JSONB 형식 (select / multi_select):
 *   [{ value: string, color: string }]
 */
export const memberFieldDefinitions = pgTable(
  "member_field_definitions",
  {
    id: bigint("id", { mode: "bigint" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    publicId: text("public_id").notNull().unique(),
    spaceId: bigint("space_id", { mode: "bigint" })
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /** 이 필드가 속한 탭 (overview 탭 또는 custom 탭만 허용) */
    tabId: bigint("tab_id", { mode: "bigint" })
      .notNull()
      .references(() => memberTabDefinitions.id, { onDelete: "cascade" }),

    /** 운영자가 지정한 필드 이름 (예: "GitHub 링크", "직전 직장") */
    name: varchar("name", { length: 80 }).notNull(),

    /**
     * 기본 overview 필드가 어떤 원본 값을 가리키는지 나타내는 식별자.
     * null 이면 일반 커스텀 필드다.
     */
    sourceKey: varchar("source_key", { length: 50 }),

    /** text | long_text | number | date | select | multi_select | checkbox | url | email | phone */
    fieldType: varchar("field_type", { length: 30 }).notNull(),

    /**
     * select / multi_select 선택지 배열
     * [{ value: "서울", color: "#818cf8" }, ...]
     */
    options: jsonb("options"),

    /** true 이면 프로필 완성도 분모에 포함 */
    isRequired: boolean("is_required").notNull().default(false),

    /** 탭 내 표시 순서 (오름차순) */
    displayOrder: integer("display_order").notNull().default(0),

    /** null 이 아니면 사용자에게는 삭제된 상태로 본다 */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("member_field_definitions_space_source_key_unique").on(
      t.spaceId,
      t.sourceKey,
    ),
  ],
);

/**
 * 커스텀 필드 값 (수강생 × 필드 정의 단위)
 *
 * field_type 별 사용 컬럼:
 *   text / long_text / url / email / phone / date → value_text
 *   number → value_number
 *   checkbox → value_boolean
 *   select / multi_select → value_json
 */
export const memberFieldValues = pgTable(
  "member_field_values",
  {
    id: bigint("id", { mode: "bigint" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    publicId: text("public_id").notNull().unique(),
    memberId: bigint("member_id", { mode: "bigint" })
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    fieldDefinitionId: bigint("field_definition_id", { mode: "bigint" })
      .notNull()
      .references(() => memberFieldDefinitions.id, { onDelete: "cascade" }),

    /** text, long_text, url, email, phone, date(ISO 8601) */
    valueText: text("value_text"),

    /** number */
    valueNumber: numeric("value_number"),

    /** checkbox */
    valueBoolean: boolean("value_boolean"),

    /** select(string), multi_select(string[]) */
    valueJson: jsonb("value_json"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("member_field_values_member_field_unique").on(
      t.memberId,
      t.fieldDefinitionId,
    ),
  ],
);
