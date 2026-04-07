CREATE TABLE "counseling_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"student_name" varchar(80) NOT NULL,
	"session_title" varchar(160) NOT NULL,
	"grade_label" varchar(80),
	"counseling_type" varchar(40) NOT NULL,
	"counselor_name" varchar(80),
	"status" varchar(20) NOT NULL,
	"audio_original_name" varchar(255) NOT NULL,
	"audio_mime_type" varchar(120) NOT NULL,
	"audio_byte_size" integer NOT NULL,
	"audio_duration_ms" integer,
	"audio_storage_path" varchar(1024) NOT NULL,
	"audio_sha256" varchar(64) NOT NULL,
	"language" varchar(12),
	"stt_model" varchar(64),
	"transcript_text" text DEFAULT '' NOT NULL,
	"transcript_segment_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"transcription_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counseling_transcript_segments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"record_id" uuid NOT NULL,
	"segment_index" integer NOT NULL,
	"start_ms" integer,
	"end_ms" integer,
	"speaker_label" varchar(40) NOT NULL,
	"speaker_tone" varchar(20) NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "counseling_records" ADD CONSTRAINT "counseling_records_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_transcript_segments" ADD CONSTRAINT "counseling_transcript_segments_record_id_counseling_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."counseling_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "counseling_transcript_segments_record_index_key" ON "counseling_transcript_segments" USING btree ("record_id","segment_index");