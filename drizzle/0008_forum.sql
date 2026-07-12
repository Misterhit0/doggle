-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0008 — Forum Communautaire Doggle
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Catégories du forum
CREATE TABLE `forum_categories` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `slug` varchar(80) NOT NULL UNIQUE,
  `title` varchar(120) NOT NULL,
  `description` text,
  `icon` varchar(10) NOT NULL DEFAULT '💬',
  `color` varchar(20) NOT NULL DEFAULT '#6366f1',
  `position` int NOT NULL DEFAULT 0,
  `isOfficial` boolean NOT NULL DEFAULT false,
  `postCount` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now())
);

-- 2. Posts du forum
CREATE TABLE `forum_posts` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `categoryId` int NOT NULL,
  `authorId` int NOT NULL,
  `title` varchar(300) NOT NULL,
  `body` text NOT NULL,
  `status` enum('open','solved','closed') NOT NULL DEFAULT 'open',
  `isPinned` boolean NOT NULL DEFAULT false,
  `isLocked` boolean NOT NULL DEFAULT false,
  `viewCount` int NOT NULL DEFAULT 0,
  `replyCount` int NOT NULL DEFAULT 0,
  `upvotes` int NOT NULL DEFAULT 0,
  `downvotes` int NOT NULL DEFAULT 0,
  `tags` json,
  `deletedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`categoryId`) REFERENCES `forum_categories`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 3. Réponses imbriquées
CREATE TABLE `forum_replies` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `postId` int NOT NULL,
  `authorId` int NOT NULL,
  `parentReplyId` int DEFAULT NULL,
  `body` text NOT NULL,
  `isAcceptedAnswer` boolean NOT NULL DEFAULT false,
  `upvotes` int NOT NULL DEFAULT 0,
  `downvotes` int NOT NULL DEFAULT 0,
  `deletedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`postId`) REFERENCES `forum_posts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`parentReplyId`) REFERENCES `forum_replies`(`id`) ON DELETE SET NULL
);

-- 4. Votes (+1/-1) sur posts et réponses
CREATE TABLE `forum_votes` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `targetType` enum('post','reply') NOT NULL,
  `targetId` int NOT NULL,
  `value` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  UNIQUE KEY `forum_votes_user_target_uniq` (`userId`, `targetType`, `targetId`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 5. Réactions emoji
CREATE TABLE `forum_reactions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `targetType` enum('post','reply') NOT NULL,
  `targetId` int NOT NULL,
  `emoji` enum('heart','laugh','celebrate','eyes','paw') NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  UNIQUE KEY `forum_reactions_uniq` (`userId`, `targetType`, `targetId`, `emoji`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 6. Bookmarks (sauvegardes)
CREATE TABLE `forum_bookmarks` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `postId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  UNIQUE KEY `forum_bookmarks_uniq` (`userId`, `postId`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`postId`) REFERENCES `forum_posts`(`id`) ON DELETE CASCADE
);

-- 7. Signalements
CREATE TABLE `forum_reports` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `reporterId` int NOT NULL,
  `targetType` enum('post','reply') NOT NULL,
  `targetId` int NOT NULL,
  `reason` enum('spam','inappropriate','harassment','misinformation','other') NOT NULL,
  `status` enum('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  FOREIGN KEY (`reporterId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- ─── Seed : 11 catégories Doggle ────────────────────────────────────────────

INSERT INTO `forum_categories` (`slug`, `title`, `description`, `icon`, `color`, `position`, `isOfficial`) VALUES
  ('questions-generales',    'Questions générales',      'Toutes vos questions sur les chiens',                        '❓', '#6366f1', 1, false),
  ('sante-veterinaire',      'Santé & Vétérinaire',      'Conseils santé, vétérinaires recommandés, urgences',         '🏥', '#ef4444', 2, false),
  ('education-comportement', 'Éducation & Comportement', 'Dressage, problèmes comportementaux, astuces',               '🎓', '#f59e0b', 3, false),
  ('alimentation',           'Alimentation',             'Croquettes, BARF, compléments alimentaires',                 '🍖', '#10b981', 4, false),
  ('races-elevage',          'Races & Élevage',          'Questions par race, reproduction, éleveurs certifiés',       '🐕', '#8b5cf6', 5, false),
  ('chiens-perdus-trouves',  'Chiens perdus / trouvés',  'Entraide communautaire, signalements, retrouvailles',        '🔴', '#dc2626', 6, false),
  ('gardiennage-sitters',    'Gardiennage & Dog-sitters','Expériences, recommandations, tarifs',                       '🏠', '#0ea5e9', 7, false),
  ('sorties-balades',        'Sorties & Balades',        'Spots dog-friendly, parcs, plages, cafés',                   '🌳', '#22c55e', 8, false),
  ('accessoires-produits',   'Accessoires & Produits',   'Avis et recommandations d\'achat',                           '🛒', '#f97316', 9, false),
  ('photos-videos',          'Photos & Vidéos',          'Partagez vos plus beaux moments avec votre chien',           '📸', '#ec4899', 10, false),
  ('annonces',               'Annonces Doggle',          'Posts officiels de l\'équipe Doggle',                        '📢', '#64748b', 11, true);
