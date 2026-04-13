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
DO $$ BEGIN
	ALTER TABLE "space_member_board_history" ADD CONSTRAINT "space_member_board_history_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "space_member_board_history" ADD CONSTRAINT "space_member_board_history_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "space_member_board_history" ADD CONSTRAINT "space_member_board_history_session_id_public_check_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."public_check_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "space_member_board_history" ADD CONSTRAINT "space_member_board_history_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "space_member_board_history_space_happened_at_idx" ON "space_member_board_history" USING btree ("space_id","happened_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "space_member_board_history_member_happened_at_idx" ON "space_member_board_history" USING btree ("member_id","happened_at");
