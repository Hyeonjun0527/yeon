ALTER TABLE "counseling_records"
ADD COLUMN "assistant_messages" jsonb NOT NULL DEFAULT '[]'::jsonb;
