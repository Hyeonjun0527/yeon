ALTER TABLE "counseling_records" ADD COLUMN "member_id" uuid;--> statement-breakpoint
ALTER TABLE "counseling_records" ADD CONSTRAINT "counseling_records_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "counseling_record_id";