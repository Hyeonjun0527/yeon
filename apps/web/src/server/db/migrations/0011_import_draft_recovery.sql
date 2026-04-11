CREATE TABLE "import_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"preview" jsonb,
	"import_result" jsonb,
	"error_message" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_drafts" ADD CONSTRAINT "import_drafts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
