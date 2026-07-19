-- Migration 0010: Dog Friendly Places and Place Reviews

CREATE TABLE IF NOT EXISTS `dog_friendly_places` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `placeType` ENUM('park', 'beach', 'restaurant', 'hotel', 'other') NOT NULL,
  `latitude` DECIMAL(10,7) NOT NULL,
  `longitude` DECIMAL(10,7) NOT NULL,
  `address` TEXT,
  `description` TEXT,
  `osmId` VARCHAR(100),
  `isDogsAllowed` BOOLEAN NOT NULL DEFAULT TRUE,
  `attributes` JSON,
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE INDEX `idx_places_osm` (`osmId`),
  INDEX `idx_places_lat_lng` (`latitude`, `longitude`)
);

CREATE TABLE IF NOT EXISTS `place_reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `placeId` INT NOT NULL,
  `userId` INT NOT NULL,
  `rating` INT NOT NULL,
  `comment` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX `idx_reviews_place` (`placeId`),
  INDEX `idx_reviews_user` (`userId`)
);
