-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `daily_entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`date` integer NOT NULL,
	`rating` integer NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `supplements` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`average_rating` integer,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP),
	`hidden` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `supplements_taken` (
	`id` integer PRIMARY KEY NOT NULL,
	`supplement_id` integer,
	`entry_id` integer,
	FOREIGN KEY (`entry_id`) REFERENCES `daily_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplement_id`) REFERENCES `supplements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `supplement_tags` (
	`supplement_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`supplement_id`) REFERENCES `supplements`(`id`) ON UPDATE no action ON DELETE cascade
);

*/