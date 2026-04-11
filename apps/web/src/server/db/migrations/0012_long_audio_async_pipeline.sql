ALTER TABLE "counseling_records"
	ADD COLUMN "processing_stage" varchar(30) DEFAULT 'queued' NOT NULL,
	ADD COLUMN "processing_progress" integer DEFAULT 0 NOT NULL,
	ADD COLUMN "processing_message" text,
	ADD COLUMN "processing_chunk_count" integer DEFAULT 0 NOT NULL,
	ADD COLUMN "processing_chunk_completed_count" integer DEFAULT 0 NOT NULL,
	ADD COLUMN "transcription_attempt_count" integer DEFAULT 0 NOT NULL,
	ADD COLUMN "transcription_chunks" jsonb,
	ADD COLUMN "analysis_status" varchar(20) DEFAULT 'idle' NOT NULL,
	ADD COLUMN "analysis_progress" integer DEFAULT 0 NOT NULL,
	ADD COLUMN "analysis_error_message" text,
	ADD COLUMN "analysis_attempt_count" integer DEFAULT 0 NOT NULL,
	ADD COLUMN "analysis_completed_at" timestamp with time zone;

UPDATE "counseling_records"
SET
	"processing_stage" = CASE
		WHEN "status" = 'ready' THEN 'completed'
		WHEN "status" = 'error' THEN 'error'
		ELSE 'queued'
	END,
	"processing_progress" = CASE
		WHEN "status" = 'ready' THEN 100
		WHEN "status" = 'error' THEN 0
		ELSE 5
	END,
	"processing_message" = CASE
		WHEN "status" = 'ready' THEN '원문 준비가 완료되었습니다.'
		WHEN "status" = 'error' THEN COALESCE("error_message", '전사 처리에 실패했습니다.')
		ELSE '백그라운드에서 전사 작업을 준비하고 있습니다.'
	END,
	"analysis_status" = CASE
		WHEN "analysis_result" IS NOT NULL THEN 'ready'
		WHEN "status" = 'ready' THEN 'queued'
		WHEN "status" = 'error' THEN 'idle'
		ELSE 'idle'
	END,
	"analysis_progress" = CASE
		WHEN "analysis_result" IS NOT NULL THEN 100
		ELSE 0
	END,
	"analysis_completed_at" = CASE
		WHEN "analysis_result" IS NOT NULL THEN "updated_at"
		ELSE NULL
	END;
