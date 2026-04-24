CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
	"token" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "login_attempts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "login_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"email" varchar(320) NOT NULL,
	"ip_address" varchar(64) NOT NULL,
	"success" boolean NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"password_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
	"token" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "password_credentials" ADD CONSTRAINT "password_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN duplicate_table THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_verification_tokens_user_id_idx" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "login_attempts_email_attempted_at_idx" ON "login_attempts" USING btree ("email","attempted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "login_attempts_ip_attempted_at_idx" ON "login_attempts" USING btree ("ip_address","attempted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
-- 기존 소셜 로그인 사용자(user_identities row 존재)는 provider에서 이미 이메일 인증을 마쳤으므로
-- email_verified_at 을 created_at 시각으로 backfill. 멱등: email_verified_at 이 이미 NOT NULL 이면 no-op.
UPDATE "users"
SET "email_verified_at" = COALESCE("email_verified_at", "created_at")
WHERE "email_verified_at" IS NULL
	AND EXISTS (
		SELECT 1 FROM "user_identities" WHERE "user_identities"."user_id" = "users"."id"
	);
