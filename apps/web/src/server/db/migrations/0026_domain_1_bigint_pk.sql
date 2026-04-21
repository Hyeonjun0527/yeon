-- Domain 1 bigint PK migration.
-- 18개 도메인 테이블의 PK를 uuid → bigint identity + public_id(text unique)로 전환.
-- uuid→bigint 값 캐스팅은 불가능하므로 DROP TABLE CASCADE 후 재생성한다.
-- 운영 데이터가 거의 없어 데이터 손실은 허용한다 (사용자 명시적 승인).
-- DROP은 FK 의존도가 높은 테이블부터, CREATE는 부모 테이블부터 수행한다.
-- 모든 구문은 IF NOT EXISTS / DO $$ 로 감싸 재실행 안전.

-- users 관련 테이블은 이 마이그레이션에서 건드리지 않는다.
-- home_insight_banner_dismissals는 0025 PoC로 이미 전환 완료되어 제외.

-- 1. FK로 얽힌 도메인 테이블 전부 DROP CASCADE. 순서 무관하지만 안전하게 leaf부터.
DROP TABLE IF EXISTS "activity_logs" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "counseling_transcript_segments" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "counseling_records" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "space_member_board_history" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "space_member_boards" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public_check_submissions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public_check_sessions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "sheet_integration_member_snapshots" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "sheet_integrations" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "member_field_values" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "member_field_definitions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "member_tab_definitions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "members" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "spaces" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "space_templates" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "import_drafts" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "googledrive_tokens" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "onedrive_tokens" CASCADE;--> statement-breakpoint

-- 2. 부모 테이블부터 CREATE.
CREATE TABLE "spaces" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "spaces_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "start_date" date,
  "end_date" date,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "spaces_public_id_unique" UNIQUE("public_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "spaces" ADD CONSTRAINT "spaces_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint

CREATE TABLE "space_templates" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "space_templates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "created_by_user_id" uuid,
  "name" varchar(80) NOT NULL,
  "description" text,
  "is_system" boolean DEFAULT false NOT NULL,
  "tabs_config" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "space_templates_public_id_unique" UNIQUE("public_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "space_templates" ADD CONSTRAINT "space_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint

CREATE TABLE "members" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "space_id" bigint NOT NULL,
  "name" varchar(100) NOT NULL,
  "email" varchar(255),
  "phone" varchar(20),
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "initial_risk_level" varchar(10),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "members_public_id_unique" UNIQUE("public_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "members" ADD CONSTRAINT "members_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "members_space_created_at_idx" ON "members" USING btree ("space_id","created_at");--> statement-breakpoint

CREATE TABLE "member_tab_definitions" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "member_tab_definitions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "space_id" bigint NOT NULL,
  "created_by_user_id" uuid,
  "tab_type" varchar(20) NOT NULL,
  "system_key" varchar(30),
  "name" varchar(80) NOT NULL,
  "is_visible" boolean DEFAULT true NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "member_tab_definitions_public_id_unique" UNIQUE("public_id"),
  CONSTRAINT "member_tab_definitions_space_system_key_unique" UNIQUE("space_id","system_key")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "member_tab_definitions" ADD CONSTRAINT "member_tab_definitions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "member_tab_definitions" ADD CONSTRAINT "member_tab_definitions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint

CREATE TABLE "member_field_definitions" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "member_field_definitions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "space_id" bigint NOT NULL,
  "created_by_user_id" uuid,
  "tab_id" bigint NOT NULL,
  "name" varchar(80) NOT NULL,
  "source_key" varchar(50),
  "field_type" varchar(30) NOT NULL,
  "options" jsonb,
  "is_required" boolean DEFAULT false NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "member_field_definitions_public_id_unique" UNIQUE("public_id"),
  CONSTRAINT "member_field_definitions_space_source_key_unique" UNIQUE("space_id","source_key")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "member_field_definitions" ADD CONSTRAINT "member_field_definitions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "member_field_definitions" ADD CONSTRAINT "member_field_definitions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "member_field_definitions" ADD CONSTRAINT "member_field_definitions_tab_id_member_tab_definitions_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."member_tab_definitions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint

CREATE TABLE "member_field_values" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "member_field_values_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "member_id" bigint NOT NULL,
  "field_definition_id" bigint NOT NULL,
  "value_text" text,
  "value_number" numeric,
  "value_boolean" boolean,
  "value_json" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "member_field_values_public_id_unique" UNIQUE("public_id"),
  CONSTRAINT "member_field_values_member_field_unique" UNIQUE("member_id","field_definition_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "member_field_values" ADD CONSTRAINT "member_field_values_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "member_field_values" ADD CONSTRAINT "member_field_values_field_definition_id_member_field_definitions_id_fk" FOREIGN KEY ("field_definition_id") REFERENCES "public"."member_field_definitions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint

CREATE TABLE "public_check_sessions" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "public_check_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "space_id" bigint NOT NULL,
  "title" varchar(120) NOT NULL,
  "public_token" varchar(120) NOT NULL,
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "check_mode" varchar(30) DEFAULT 'attendance_and_assignment' NOT NULL,
  "enabled_methods" jsonb NOT NULL,
  "verification_method" varchar(40) DEFAULT 'name_phone_last4' NOT NULL,
  "opens_at" timestamp with time zone,
  "closes_at" timestamp with time zone,
  "location_label" varchar(120),
  "latitude" double precision,
  "longitude" double precision,
  "radius_meters" integer,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "public_check_sessions_public_id_unique" UNIQUE("public_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "public_check_sessions" ADD CONSTRAINT "public_check_sessions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "public_check_sessions" ADD CONSTRAINT "public_check_sessions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "public_check_sessions_space_created_at_idx" ON "public_check_sessions" USING btree ("space_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "public_check_sessions_token_idx" ON "public_check_sessions" USING btree ("public_token");--> statement-breakpoint

CREATE TABLE "public_check_submissions" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "public_check_submissions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "session_id" bigint NOT NULL,
  "space_id" bigint NOT NULL,
  "member_id" bigint,
  "check_method" varchar(20) NOT NULL,
  "verification_status" varchar(30) NOT NULL,
  "submitted_name" varchar(100) NOT NULL,
  "submitted_phone_last4" varchar(4) NOT NULL,
  "assignment_status" varchar(20),
  "assignment_link" varchar(1000),
  "latitude" double precision,
  "longitude" double precision,
  "distance_meters" double precision,
  "metadata" jsonb,
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "public_check_submissions_public_id_unique" UNIQUE("public_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "public_check_submissions" ADD CONSTRAINT "public_check_submissions_session_id_public_check_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."public_check_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "public_check_submissions" ADD CONSTRAINT "public_check_submissions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "public_check_submissions" ADD CONSTRAINT "public_check_submissions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "public_check_submissions_session_submitted_at_idx" ON "public_check_submissions" USING btree ("session_id","submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "public_check_submissions_space_member_idx" ON "public_check_submissions" USING btree ("space_id","member_id");--> statement-breakpoint

CREATE TABLE "space_member_boards" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "space_member_boards_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "space_id" bigint NOT NULL,
  "member_id" bigint NOT NULL,
  "attendance_status" varchar(20) DEFAULT 'unknown' NOT NULL,
  "attendance_marked_at" timestamp with time zone,
  "attendance_marked_source" varchar(30),
  "assignment_status" varchar(20) DEFAULT 'unknown' NOT NULL,
  "assignment_link" varchar(1000),
  "assignment_marked_at" timestamp with time zone,
  "assignment_marked_source" varchar(30),
  "last_public_check_at" timestamp with time zone,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "space_member_boards_public_id_unique" UNIQUE("public_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "space_member_boards" ADD CONSTRAINT "space_member_boards_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "space_member_boards" ADD CONSTRAINT "space_member_boards_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "space_member_boards" ADD CONSTRAINT "space_member_boards_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "space_member_boards_space_member_key" ON "space_member_boards" USING btree ("space_id","member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "space_member_boards_space_updated_at_idx" ON "space_member_boards" USING btree ("space_id","updated_at");--> statement-breakpoint

CREATE TABLE "space_member_board_history" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "space_member_board_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "space_id" bigint NOT NULL,
  "member_id" bigint NOT NULL,
  "session_id" bigint,
  "attendance_status" varchar(20) DEFAULT 'unknown' NOT NULL,
  "assignment_status" varchar(20) DEFAULT 'unknown' NOT NULL,
  "assignment_link" varchar(1000),
  "source" varchar(30) NOT NULL,
  "updated_by_user_id" uuid,
  "happened_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "space_member_board_history_public_id_unique" UNIQUE("public_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "space_member_board_history" ADD CONSTRAINT "space_member_board_history_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "space_member_board_history" ADD CONSTRAINT "space_member_board_history_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "space_member_board_history" ADD CONSTRAINT "space_member_board_history_session_id_public_check_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."public_check_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "space_member_board_history" ADD CONSTRAINT "space_member_board_history_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "space_member_board_history_space_happened_at_idx" ON "space_member_board_history" USING btree ("space_id","happened_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "space_member_board_history_member_happened_at_idx" ON "space_member_board_history" USING btree ("member_id","happened_at");--> statement-breakpoint

CREATE TABLE "sheet_integrations" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sheet_integrations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "space_id" bigint NOT NULL,
  "sheet_url" text NOT NULL,
  "sheet_id" varchar(200) NOT NULL,
  "data_type" varchar(30) NOT NULL,
  "column_mapping" jsonb,
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sheet_integrations_public_id_unique" UNIQUE("public_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sheet_integrations" ADD CONSTRAINT "sheet_integrations_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint

CREATE TABLE "sheet_integration_member_snapshots" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sheet_integration_member_snapshots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "integration_id" bigint NOT NULL,
  "space_id" bigint NOT NULL,
  "member_id" uuid NOT NULL,
  "base_payload" jsonb NOT NULL,
  "base_payload_hash" text NOT NULL,
  "exported_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sheet_integration_member_snapshots_public_id_unique" UNIQUE("public_id"),
  CONSTRAINT "sheet_integration_member_snapshots_integration_member_unique" UNIQUE("integration_id","member_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sheet_integration_member_snapshots" ADD CONSTRAINT "sheet_integration_member_snapshots_integration_id_sheet_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."sheet_integrations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sheet_integration_member_snapshots" ADD CONSTRAINT "sheet_integration_member_snapshots_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sheet_integration_member_snapshots_integration_idx" ON "sheet_integration_member_snapshots" USING btree ("integration_id");--> statement-breakpoint

CREATE TABLE "googledrive_tokens" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "googledrive_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "user_id" uuid NOT NULL,
  "access_token" text NOT NULL,
  "refresh_token" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "googledrive_tokens_public_id_unique" UNIQUE("public_id"),
  CONSTRAINT "googledrive_tokens_user_id_unique" UNIQUE("user_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "googledrive_tokens" ADD CONSTRAINT "googledrive_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint

CREATE TABLE "onedrive_tokens" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "onedrive_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "user_id" uuid NOT NULL,
  "access_token" text NOT NULL,
  "refresh_token" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "onedrive_tokens_public_id_unique" UNIQUE("public_id"),
  CONSTRAINT "onedrive_tokens_user_id_unique" UNIQUE("user_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "onedrive_tokens" ADD CONSTRAINT "onedrive_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint

CREATE TABLE "import_drafts" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "import_drafts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "provider" varchar(20) NOT NULL,
  "status" varchar(20) NOT NULL,
  "source_file_id" varchar(255),
  "source_file_name" varchar(255) NOT NULL,
  "source_mime_type" varchar(120),
  "source_file_kind" varchar(30) NOT NULL,
  "source_byte_size" integer NOT NULL,
  "source_last_modified_at" timestamp with time zone,
  "source_file_base64" text,
  "processing_stage" varchar(30) DEFAULT 'queued' NOT NULL,
  "processing_progress" integer DEFAULT 0 NOT NULL,
  "processing_message" text,
  "preview" jsonb,
  "import_result" jsonb,
  "error_message" text,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "import_drafts_public_id_unique" UNIQUE("public_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "import_drafts" ADD CONSTRAINT "import_drafts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint

CREATE TABLE "counseling_records" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "counseling_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "student_name" varchar(80) NOT NULL,
  "session_title" varchar(160) NOT NULL,
  "counseling_type" varchar(40) NOT NULL,
  "counselor_name" varchar(80),
  "status" varchar(20) NOT NULL,
  "record_source" varchar(30) DEFAULT 'audio_upload' NOT NULL,
  "audio_original_name" varchar(255) NOT NULL,
  "audio_mime_type" varchar(120) NOT NULL,
  "audio_byte_size" integer NOT NULL,
  "audio_duration_ms" integer,
  "audio_storage_path" varchar(1024) NOT NULL,
  "audio_sha256" varchar(64) NOT NULL,
  "language" varchar(12),
  "stt_model" varchar(64),
  "transcript_text" text DEFAULT '' NOT NULL,
  "transcript_segment_count" integer DEFAULT 0 NOT NULL,
  "processing_stage" varchar(30) DEFAULT 'queued' NOT NULL,
  "processing_progress" integer DEFAULT 0 NOT NULL,
  "processing_message" text,
  "processing_chunk_count" integer DEFAULT 0 NOT NULL,
  "processing_chunk_completed_count" integer DEFAULT 0 NOT NULL,
  "transcription_attempt_count" integer DEFAULT 0 NOT NULL,
  "transcription_chunks" jsonb,
  "analysis_status" varchar(20) DEFAULT 'idle' NOT NULL,
  "analysis_progress" integer DEFAULT 0 NOT NULL,
  "analysis_error_message" text,
  "analysis_attempt_count" integer DEFAULT 0 NOT NULL,
  "space_id" bigint,
  "member_id" bigint,
  "analysis_result" jsonb,
  "assistant_messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "error_message" text,
  "transcription_completed_at" timestamp with time zone,
  "analysis_completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "counseling_records_public_id_unique" UNIQUE("public_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "counseling_records" ADD CONSTRAINT "counseling_records_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "counseling_records" ADD CONSTRAINT "counseling_records_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "counseling_records" ADD CONSTRAINT "counseling_records_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "counseling_records_user_created_at_idx" ON "counseling_records" USING btree ("created_by_user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "counseling_records_space_created_at_idx" ON "counseling_records" USING btree ("space_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "counseling_records_member_created_at_idx" ON "counseling_records" USING btree ("member_id","created_at");--> statement-breakpoint

CREATE TABLE "counseling_transcript_segments" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "counseling_transcript_segments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "record_id" bigint NOT NULL,
  "segment_index" integer NOT NULL,
  "start_ms" integer,
  "end_ms" integer,
  "speaker_label" varchar(40) NOT NULL,
  "speaker_tone" varchar(20) NOT NULL,
  "text" text NOT NULL,
  CONSTRAINT "counseling_transcript_segments_public_id_unique" UNIQUE("public_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "counseling_transcript_segments" ADD CONSTRAINT "counseling_transcript_segments_record_id_counseling_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."counseling_records"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "counseling_transcript_segments_record_index_key" ON "counseling_transcript_segments" USING btree ("record_id","segment_index");--> statement-breakpoint

CREATE TABLE "activity_logs" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activity_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
  "public_id" text NOT NULL,
  "member_id" bigint NOT NULL,
  "space_id" bigint NOT NULL,
  "type" varchar(30) NOT NULL,
  "status" varchar(30),
  "recorded_at" timestamp with time zone NOT NULL,
  "source" varchar(30) DEFAULT 'manual' NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "activity_logs_public_id_unique" UNIQUE("public_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_logs_member_space_recorded_at_idx" ON "activity_logs" USING btree ("member_id","space_id","recorded_at");
