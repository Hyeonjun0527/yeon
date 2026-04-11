ALTER TABLE "import_drafts"
	ADD COLUMN "processing_stage" varchar(30) DEFAULT 'queued' NOT NULL,
	ADD COLUMN "processing_progress" integer DEFAULT 0 NOT NULL,
	ADD COLUMN "processing_message" text;

UPDATE "import_drafts"
SET
	"processing_stage" = CASE
		WHEN "status" = 'imported' THEN 'completed'
		WHEN "status" IN ('analyzed', 'edited') THEN 'preview_ready'
		WHEN "status" = 'error' THEN 'error'
		WHEN "status" = 'analyzing' THEN 'queued'
		ELSE 'queued'
	END,
	"processing_progress" = CASE
		WHEN "status" = 'imported' THEN 100
		WHEN "status" IN ('analyzed', 'edited') THEN 100
		WHEN "status" = 'error' THEN 0
		WHEN "status" = 'analyzing' THEN 5
		ELSE 0
	END,
	"processing_message" = CASE
		WHEN "status" = 'imported' THEN '가져오기가 완료되었습니다.'
		WHEN "status" = 'edited' THEN '수정된 미리보기가 저장되었습니다.'
		WHEN "status" = 'analyzed' THEN '분석이 완료되었습니다.'
		WHEN "status" = 'error' THEN COALESCE("error_message", '분석에 실패했습니다.')
		WHEN "status" = 'analyzing' THEN '분석을 준비하고 있습니다.'
		ELSE '분석 대기 중입니다.'
	END;
