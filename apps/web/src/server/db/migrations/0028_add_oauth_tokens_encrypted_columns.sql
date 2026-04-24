ALTER TABLE "googledrive_tokens" ADD COLUMN IF NOT EXISTS "access_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "googledrive_tokens" ADD COLUMN IF NOT EXISTS "refresh_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "onedrive_tokens" ADD COLUMN IF NOT EXISTS "access_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "onedrive_tokens" ADD COLUMN IF NOT EXISTS "refresh_token_encrypted" text;
