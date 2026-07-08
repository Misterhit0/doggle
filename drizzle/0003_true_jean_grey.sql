ALTER TABLE `users` ADD `homeLatitude` double;--> statement-breakpoint
ALTER TABLE `users` ADD `homeLongitude` double;--> statement-breakpoint
ALTER TABLE `users` ADD `isShareLocationActive` boolean DEFAULT false NOT NULL;