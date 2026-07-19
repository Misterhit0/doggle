-- Migration 0013: Vet & Pet Health Management

CREATE TABLE IF NOT EXISTS `pet_health_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dogId` INT NOT NULL,
  `weight` DECIMAL(5,2),
  `allergies` TEXT,
  `medicalHistory` TEXT,
  `treatmentInfo` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX `idx_health_dog` (`dogId`)
);

CREATE TABLE IF NOT EXISTS `pet_vaccines` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dogId` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `administeredDate` TIMESTAMP NOT NULL,
  `nextBoosterDate` TIMESTAMP NOT NULL,
  `status` ENUM('active', 'overdue') NOT NULL DEFAULT 'active',
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX `idx_vaccines_dog` (`dogId`)
);

CREATE TABLE IF NOT EXISTS `pet_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dogId` INT NOT NULL,
  `documentName` VARCHAR(255) NOT NULL,
  `documentUrl` VARCHAR(500) NOT NULL,
  `documentType` ENUM('prescription', 'certificate', 'other') NOT NULL DEFAULT 'other',
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX `idx_docs_dog` (`dogId`)
);

CREATE TABLE IF NOT EXISTS `veterinarians` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `specialty` VARCHAR(255),
  `clinicName` VARCHAR(255),
  `address` TEXT,
  `latitude` DECIMAL(10,7),
  `longitude` DECIMAL(10,7),
  `phoneNumber` VARCHAR(50),
  `email` VARCHAR(255),
  `isPartner` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX `idx_vets_lat_lng` (`latitude`, `longitude`)
);

CREATE TABLE IF NOT EXISTS `vet_slots` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `vetId` INT NOT NULL,
  `slotTime` TIMESTAMP NOT NULL,
  `isBooked` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX `idx_slots_vet` (`vetId`),
  INDEX `idx_slots_time` (`slotTime`)
);

CREATE TABLE IF NOT EXISTS `vet_appointments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dogId` INT NOT NULL,
  `userId` INT NOT NULL,
  `vetId` INT,
  `customVetName` VARCHAR(255),
  `appointmentTime` TIMESTAMP NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `notes` TEXT,
  `status` ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  `createdAt` TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX `idx_appointments_user` (`userId`),
  INDEX `idx_appointments_dog` (`dogId`),
  INDEX `idx_appointments_vet` (`vetId`)
);
