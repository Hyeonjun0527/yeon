CREATE TABLE "chat_service_ask_posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"question" varchar(240) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"options_json" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_service_ask_votes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"voter_id" uuid NOT NULL,
	"option_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_service_auth_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_service_auth_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"session_token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_service_blocks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_service_chat_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"room_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_service_chat_rooms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"room_key" varchar(80) NOT NULL,
	"user_a_id" uuid NOT NULL,
	"user_b_id" uuid NOT NULL,
	"unlocked_by_payment" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_service_demo_meta" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chat_service_demo_meta_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"seed_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_service_dm_unlocks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"room_id" uuid NOT NULL,
	"opener_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_service_feed_posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"reply_to_post_id" uuid,
	"body" varchar(400) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_service_friend_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"status" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_service_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"nickname" varchar(40) NOT NULL,
	"age_label" varchar(20) NOT NULL,
	"region_label" varchar(40) NOT NULL,
	"avatar_url" varchar(2048),
	"bio" varchar(160) DEFAULT '' NOT NULL,
	"points" integer DEFAULT 1000 NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_service_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_type" varchar(24) NOT NULL,
	"target_id" text NOT NULL,
	"reason" varchar(240) NOT NULL,
	"status" varchar(16) DEFAULT 'received' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_service_ask_posts" ADD CONSTRAINT "chat_service_ask_posts_author_id_chat_service_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."chat_service_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_ask_votes" ADD CONSTRAINT "chat_service_ask_votes_post_id_chat_service_ask_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."chat_service_ask_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_ask_votes" ADD CONSTRAINT "chat_service_ask_votes_voter_id_chat_service_profiles_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."chat_service_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_auth_sessions" ADD CONSTRAINT "chat_service_auth_sessions_profile_id_chat_service_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."chat_service_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_blocks" ADD CONSTRAINT "chat_service_blocks_blocker_id_chat_service_profiles_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."chat_service_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_blocks" ADD CONSTRAINT "chat_service_blocks_blocked_id_chat_service_profiles_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."chat_service_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_chat_messages" ADD CONSTRAINT "chat_service_chat_messages_room_id_chat_service_chat_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_service_chat_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_chat_messages" ADD CONSTRAINT "chat_service_chat_messages_sender_id_chat_service_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."chat_service_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_chat_rooms" ADD CONSTRAINT "chat_service_chat_rooms_user_a_id_chat_service_profiles_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."chat_service_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_chat_rooms" ADD CONSTRAINT "chat_service_chat_rooms_user_b_id_chat_service_profiles_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."chat_service_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_dm_unlocks" ADD CONSTRAINT "chat_service_dm_unlocks_room_id_chat_service_chat_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_service_chat_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_dm_unlocks" ADD CONSTRAINT "chat_service_dm_unlocks_opener_id_chat_service_profiles_id_fk" FOREIGN KEY ("opener_id") REFERENCES "public"."chat_service_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_dm_unlocks" ADD CONSTRAINT "chat_service_dm_unlocks_target_id_chat_service_profiles_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."chat_service_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_feed_posts" ADD CONSTRAINT "chat_service_feed_posts_author_id_chat_service_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."chat_service_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_friend_links" ADD CONSTRAINT "chat_service_friend_links_requester_id_chat_service_profiles_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."chat_service_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_friend_links" ADD CONSTRAINT "chat_service_friend_links_addressee_id_chat_service_profiles_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."chat_service_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_service_reports" ADD CONSTRAINT "chat_service_reports_reporter_id_chat_service_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."chat_service_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_service_ask_posts_author_created_idx" ON "chat_service_ask_posts" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_service_ask_votes_post_voter_key" ON "chat_service_ask_votes" USING btree ("post_id","voter_id");--> statement-breakpoint
CREATE INDEX "chat_service_auth_challenges_phone_idx" ON "chat_service_auth_challenges" USING btree ("phone_number","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_service_auth_sessions_token_hash_key" ON "chat_service_auth_sessions" USING btree ("session_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_service_blocks_blocker_blocked_key" ON "chat_service_blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX "chat_service_chat_messages_room_created_idx" ON "chat_service_chat_messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_service_chat_rooms_room_key_key" ON "chat_service_chat_rooms" USING btree ("room_key");--> statement-breakpoint
CREATE INDEX "chat_service_chat_rooms_user_a_last_message_idx" ON "chat_service_chat_rooms" USING btree ("user_a_id","last_message_at");--> statement-breakpoint
CREATE INDEX "chat_service_chat_rooms_user_b_last_message_idx" ON "chat_service_chat_rooms" USING btree ("user_b_id","last_message_at");--> statement-breakpoint
CREATE INDEX "chat_service_dm_unlocks_opener_created_idx" ON "chat_service_dm_unlocks" USING btree ("opener_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_service_feed_posts_author_created_idx" ON "chat_service_feed_posts" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_service_feed_posts_reply_idx" ON "chat_service_feed_posts" USING btree ("reply_to_post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_service_friend_links_requester_addressee_key" ON "chat_service_friend_links" USING btree ("requester_id","addressee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_service_profiles_phone_number_key" ON "chat_service_profiles" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "chat_service_reports_reporter_created_idx" ON "chat_service_reports" USING btree ("reporter_id","created_at");