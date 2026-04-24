-- 0024 schema drift recovery
-- 이 마이그레이션은 schema/snapshot drift를 회복하기 위한 멱등(idempotent) 변환이다.
-- 모든 변경은 fd69d6e, dfbb6c0, d6fbb1c commit에서 schema 파일에 반영됐지만
-- drizzle-kit generate가 누락되어 마이그레이션 SQL이 빠진 상태였다.
-- 이미 적용된 환경에서는 모든 statement가 no-op이 되도록 IF [NOT] EXISTS 와
-- DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$; 패턴을 사용한다.

CREATE TABLE IF NOT EXISTS "home_insight_banner_dismissals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"banner_key" varchar(40) NOT NULL,
	"hidden_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "space_member_board_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"session_id" uuid,
	"attendance_status" varchar(20) DEFAULT 'unknown' NOT NULL,
	"assignment_status" varchar(20) DEFAULT 'unknown' NOT NULL,
	"assignment_link" varchar(1000),
	"source" varchar(30) NOT NULL,
	"updated_by_user_id" uuid,
	"happened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "users_email_key";--> statement-breakpoint
ALTER TABLE "counseling_records" ADD COLUMN IF NOT EXISTS "record_source" varchar(30) DEFAULT 'audio_upload' NOT NULL;--> statement-breakpoint
ALTER TABLE "member_field_definitions" ADD COLUMN IF NOT EXISTS "source_key" varchar(50);--> statement-breakpoint
ALTER TABLE "member_field_definitions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "home_insight_banner_dismissals" ADD CONSTRAINT "home_insight_banner_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
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
CREATE UNIQUE INDEX IF NOT EXISTS "home_insight_banner_dismissals_user_banner_key" ON "home_insight_banner_dismissals" USING btree ("user_id","banner_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "home_insight_banner_dismissals_user_hidden_until_idx" ON "home_insight_banner_dismissals" USING btree ("user_id","hidden_until");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "space_member_board_history_space_happened_at_idx" ON "space_member_board_history" USING btree ("space_id","happened_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "space_member_board_history_member_happened_at_idx" ON "space_member_board_history" USING btree ("member_id","happened_at");--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "member_field_definitions" ADD CONSTRAINT "member_field_definitions_space_source_key_unique" UNIQUE("space_id","source_key");
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN duplicate_table THEN null;
END $$;
