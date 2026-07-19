-- Migration 0009: Walking Services and Sponsorship tables

CREATE TABLE IF NOT EXISTS `walking_services` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `pricePerWalk` DECIMAL(10,2),
  `frequency` ENUM('daily', 'weekly', 'biweekly', 'monthly'),
  `availableDays` JSON NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS `walking_bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `serviceId` INT NOT NULL,
  `userId` INT NOT NULL,
  `scheduledDate` TIMESTAMP NOT NULL,
  `notes` TEXT,
  `rating` INT,
  `review` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS `sponsorships` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `sitterId` INT,
  `reason` TEXT NOT NULL,
  `frequency` ENUM('weekly', 'biweekly', 'monthly') NOT NULL,
  `status` ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
  `rating` INT,
  `review` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW()
);
