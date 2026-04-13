CREATE TABLE IF NOT EXISTS "home_insight_banner_dismissals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"banner_key" varchar(40) NOT NULL,
	"hidden_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "home_insight_banner_dismissals" ADD CONSTRAINT "home_insight_banner_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "home_insight_banner_dismissals_user_banner_key" ON "home_insight_banner_dismissals" USING btree ("user_id","banner_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "home_insight_banner_dismissals_user_hidden_until_idx" ON "home_insight_banner_dismissals" USING btree ("user_id","hidden_until");
