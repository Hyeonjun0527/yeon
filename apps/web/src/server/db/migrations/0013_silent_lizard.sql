CREATE INDEX "activity_logs_member_space_recorded_at_idx" ON "activity_logs" USING btree ("member_id","space_id","recorded_at");--> statement-breakpoint
CREATE INDEX "counseling_records_user_created_at_idx" ON "counseling_records" USING btree ("created_by_user_id","created_at");--> statement-breakpoint
CREATE INDEX "counseling_records_space_created_at_idx" ON "counseling_records" USING btree ("space_id","created_at");--> statement-breakpoint
CREATE INDEX "counseling_records_member_created_at_idx" ON "counseling_records" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "members_space_created_at_idx" ON "members" USING btree ("space_id","created_at");
