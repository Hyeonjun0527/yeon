ALTER TABLE "member_field_definitions"
ADD COLUMN IF NOT EXISTS "source_key" varchar(50);
--> statement-breakpoint
ALTER TABLE "member_field_definitions"
ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "member_field_definitions_space_source_key_unique"
ON "member_field_definitions" USING btree ("space_id","source_key");
