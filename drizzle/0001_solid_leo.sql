CREATE TABLE `dogs` (
`id` int AUTO_INCREMENT NOT NULL,
`userId` int NOT NULL,
`name` varchar(255) NOT NULL,
`breed` varchar(255),
`age` int,
`description` text,
`personality` json,
`photoUrls` json,
`createdAt` timestamp NOT NULL DEFAULT (now()),
`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT `dogs_id` PRIMARY KEY(`id`)
);
CREATE TABLE `matches` (
`id` int AUTO_INCREMENT NOT NULL,
`userId1` int NOT NULL,
`userId2` int NOT NULL,
`compatibilityScore` decimal(5,2),
`createdAt` timestamp NOT NULL DEFAULT (now()),
CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
CREATE TABLE `messages` (
`id` int AUTO_INCREMENT NOT NULL,
`matchId` int NOT NULL,
`senderId` int NOT NULL,
`content` text NOT NULL,
`read` boolean NOT NULL DEFAULT false,
`createdAt` timestamp NOT NULL DEFAULT (now()),
CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
CREATE TABLE `notifications` (
`id` int AUTO_INCREMENT NOT NULL,
`userId` int NOT NULL,
`type` enum('match','message','system') NOT NULL,
`title` varchar(255) NOT NULL,
`content` text,
`read` boolean NOT NULL DEFAULT false,
`relatedMatchId` int,
`createdAt` timestamp NOT NULL DEFAULT (now()),
CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
CREATE TABLE `swipes` (
`id` int AUTO_INCREMENT NOT NULL,
`userId` int NOT NULL,
`targetUserId` int NOT NULL,
`liked` boolean NOT NULL,
`createdAt` timestamp NOT NULL DEFAULT (now()),
CONSTRAINT `swipes_id` PRIMARY KEY(`id`)
);
ALTER TABLE `users` ADD `age` int;
ALTER TABLE `users` ADD `interests` json;
ALTER TABLE `users` ADD `walkingHabits` text;
ALTER TABLE `users` ADD `whatISeek` json;
ALTER TABLE `users` ADD `bio` text;
ALTER TABLE `users` ADD `profilePhotoUrl` varchar(500);
ALTER TABLE `users` ADD `latitude` double;
ALTER TABLE `users` ADD `longitude` double;
ALTER TABLE `users` ADD `lastLocationUpdate` timestamp;
