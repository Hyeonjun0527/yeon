ALTER TABLE "counseling_records"
ADD COLUMN IF NOT EXISTS "record_source" varchar(30) NOT NULL DEFAULT 'audio_upload';
--> statement-breakpoint
UPDATE "counseling_records"
SET "record_source" = CASE
	WHEN "audio_storage_path" LIKE 'local://demo/%' THEN 'demo_placeholder'
	WHEN "audio_storage_path" LIKE 'text_memo://%' THEN 'text_memo'
	ELSE 'audio_upload'
END;
