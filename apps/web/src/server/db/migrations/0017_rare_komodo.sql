CREATE TABLE "public_check_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_check_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"member_id" uuid,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space_member_boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public_check_sessions" ADD CONSTRAINT "public_check_sessions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_check_sessions" ADD CONSTRAINT "public_check_sessions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_check_submissions" ADD CONSTRAINT "public_check_submissions_session_id_public_check_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."public_check_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_check_submissions" ADD CONSTRAINT "public_check_submissions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_check_submissions" ADD CONSTRAINT "public_check_submissions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_member_boards" ADD CONSTRAINT "space_member_boards_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_member_boards" ADD CONSTRAINT "space_member_boards_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_member_boards" ADD CONSTRAINT "space_member_boards_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "public_check_sessions_space_created_at_idx" ON "public_check_sessions" USING btree ("space_id","created_at");--> statement-breakpoint
CREATE INDEX "public_check_sessions_token_idx" ON "public_check_sessions" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "public_check_submissions_session_submitted_at_idx" ON "public_check_submissions" USING btree ("session_id","submitted_at");--> statement-breakpoint
CREATE INDEX "public_check_submissions_space_member_idx" ON "public_check_submissions" USING btree ("space_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "space_member_boards_space_member_key" ON "space_member_boards" USING btree ("space_id","member_id");--> statement-breakpoint
CREATE INDEX "space_member_boards_space_updated_at_idx" ON "space_member_boards" USING btree ("space_id","updated_at");
