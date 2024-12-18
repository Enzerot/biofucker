PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_supplements` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`average_rating` integer,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP),
	`hidden` integer DEFAULT 0 NOT NULL,
	`rating_difference` integer DEFAULT 0
);
--> statement-breakpoint
INSERT INTO `__new_supplements`("id", "name", "description", "average_rating", "created_at", "hidden", "rating_difference") SELECT "id", "name", "description", "average_rating", "created_at", "hidden", "rating_difference" FROM `supplements`;--> statement-breakpoint
DROP TABLE `supplements`;--> statement-breakpoint
ALTER TABLE `__new_supplements` RENAME TO `supplements`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_tags`("id", "name") SELECT "id", "name" FROM `tags`;--> statement-breakpoint
DROP TABLE `tags`;--> statement-breakpoint
ALTER TABLE `__new_tags` RENAME TO `tags`;