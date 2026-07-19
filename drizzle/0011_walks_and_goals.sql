-- Migration 0011: Walks and Walk Goals

CREATE TABLE IF NOT EXISTS `walks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `distanceMeter` INT NOT NULL,
  `durationSecond` INT NOT NULL,
  `gpsPath` JSON NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX `idx_walks_user` (`userId`)
);

CREATE TABLE IF NOT EXISTS `walk_goals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `goalType` ENUM('distance', 'duration') NOT NULL,
  `targetValue` INT NOT NULL,
  `currentValue` INT NOT NULL DEFAULT 0,
  `period` ENUM('weekly', 'monthly') NOT NULL,
  `startDate` TIMESTAMP NOT NULL,
  `endDate` TIMESTAMP NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX `idx_goals_user` (`userId`)
);
