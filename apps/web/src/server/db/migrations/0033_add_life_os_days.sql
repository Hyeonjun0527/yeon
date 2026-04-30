CREATE TABLE IF NOT EXISTS "life_os_days" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "life_os_days_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" text NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"local_date" varchar(10) NOT NULL,
	"timezone" varchar(80) DEFAULT 'Asia/Seoul' NOT NULL,
	"mindset" text DEFAULT '' NOT NULL,
	"backlog_text" text DEFAULT '' NOT NULL,
	"entries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "life_os_days_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "life_os_days" ADD CONSTRAINT "life_os_days_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN duplicate_table THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "life_os_days_public_id_unique" ON "life_os_days" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "life_os_days_owner_local_date_unique" ON "life_os_days" USING btree ("owner_user_id","local_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "life_os_days_owner_updated_at_idx" ON "life_os_days" USING btree ("owner_user_id","updated_at");
