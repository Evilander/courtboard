CREATE INDEX IF NOT EXISTS `idx_schedule_entries_date` ON `schedule_entries` (`date`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_content_items_zone_filter` ON `content_items` (`zone_filter`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_content_items_is_emergency` ON `content_items` (`is_emergency`);
