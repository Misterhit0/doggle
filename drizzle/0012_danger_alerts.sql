-- Migration 0012: Danger Alerts

CREATE TABLE IF NOT EXISTS `danger_alerts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `dangerType` ENUM('cyanobacteria', 'hunting', 'poison_bait', 'stray_animal', 'other') NOT NULL,
  `latitude` DECIMAL(10,7) NOT NULL,
  `longitude` DECIMAL(10,7) NOT NULL,
  `description` TEXT,
  `status` ENUM('active', 'resolved') NOT NULL DEFAULT 'active',
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW(),
  `expiresAt` TIMESTAMP NOT NULL,
  INDEX `idx_dangers_status` (`status`),
  INDEX `idx_dangers_lat_lng` (`latitude`, `longitude`)
);
