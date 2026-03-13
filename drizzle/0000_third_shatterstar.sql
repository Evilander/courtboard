CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`details` text,
	`ip_address` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `auth_accounts` (
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `provider_account_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `auth_authenticators` (
	`credential_id` text NOT NULL,
	`user_id` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`credential_public_key` text NOT NULL,
	`counter` integer NOT NULL,
	`credential_device_type` text NOT NULL,
	`credential_backed_up` integer NOT NULL,
	`transports` text,
	PRIMARY KEY(`user_id`, `credential_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_authenticators_credential_id_unique` ON `auth_authenticators` (`credential_id`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `auth_verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`image_path` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`zone_filter` text DEFAULT 'all' NOT NULL,
	`starts_at` integer,
	`expires_at` integer,
	`is_emergency` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedule_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`screen_id` text,
	`case_number` text NOT NULL,
	`case_title` text NOT NULL,
	`case_type` text NOT NULL,
	`judge_name` text NOT NULL,
	`courtroom` text NOT NULL,
	`scheduled_time` text NOT NULL,
	`estimated_duration` integer,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`date` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`screen_id`) REFERENCES `screens`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `screens` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`zone` text NOT NULL,
	`location_description` text,
	`rotation_interval_seconds` integer DEFAULT 15 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_seen_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `screens_slug_unique` ON `screens` (`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`image` text,
	`email_verified` integer,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`totp_secret` text,
	`totp_enabled` integer DEFAULT false NOT NULL,
	`last_login_at` integer,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);