CREATE TABLE "sheet_integration_member_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"base_payload" jsonb NOT NULL,
	"base_payload_hash" text NOT NULL,
	"exported_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sheet_integration_member_snapshots_integration_member_unique" UNIQUE("integration_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "sheet_integration_member_snapshots" ADD CONSTRAINT "sheet_integration_member_snapshots_integration_id_sheet_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."sheet_integrations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sheet_integration_member_snapshots" ADD CONSTRAINT "sheet_integration_member_snapshots_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "sheet_integration_member_snapshots_integration_idx" ON "sheet_integration_member_snapshots" USING btree ("integration_id");
