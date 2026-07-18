-- Migration 0007: Boarding (dog-sitter) and Breeding features

-- ── Dog Sitter fields on users ─────────────────────────────────────────────
ALTER TABLE `users`
  ADD COLUMN `isDogSitter` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `dogSitterBio` TEXT,
  ADD COLUMN `dogSitterRates` JSON,
  ADD COLUMN `dogSitterAvailable` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `dogSitterMaxDogs` INT DEFAULT 1,
  ADD COLUMN `dogSitterStatus` ENUM('pending','approved','rejected') DEFAULT 'pending';

-- ── Boarding & Breeding fields on dogs ────────────────────────────────────
ALTER TABLE `dogs`
  ADD COLUMN `availableForBoarding` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `sex` ENUM('male','female','unknown') DEFAULT 'unknown',
  ADD COLUMN `openToBreeding` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `breedingInfo` TEXT;

-- ── Boarding requests table ───────────────────────────────────────────────
CREATE TABLE `boarding_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dogId` INT NOT NULL,
  `ownerId` INT NOT NULL,
  `sitterId` INT NOT NULL,
  `startDate` DATETIME NOT NULL,
  `endDate` DATETIME NOT NULL,
  `message` TEXT,
  `status` ENUM('pending','accepted','rejected','completed') NOT NULL DEFAULT 'pending',
  `totalPrice` DECIMAL(10,2),
  `ownerPhone` VARCHAR(20),
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW(),
  `updatedAt` TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  INDEX `idx_boarding_owner` (`ownerId`),
  INDEX `idx_boarding_sitter` (`sitterId`),
  INDEX `idx_boarding_dog` (`dogId`),
  INDEX `idx_boarding_status` (`status`)
);
