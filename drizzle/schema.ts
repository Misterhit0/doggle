import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, double, unique } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extended with master profile fields for Compagnon.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  hashedPassword: varchar("hashedPassword", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  
  // Master profile fields
  age: int("age"),
  interests: json("interests").$type<string[]>(),
  walkingHabits: text("walkingHabits"), // e.g., "morning", "evening", "weekend"
  whatISeek: json("whatISeek").$type<string[]>(), // "friend", "mentor", "intergenerational"
  bio: text("bio"),
  profilePhotoUrl: varchar("profilePhotoUrl", { length: 500 }),
  latitude: double("latitude"),
  longitude: double("longitude"),
  lastLocationUpdate: timestamp("lastLocationUpdate"),
  
  // Home location (for privacy)
  homeLatitude: double("homeLatitude"),
  homeLongitude: double("homeLongitude"),
  
  // Walking tracking settings
  isShareLocationActive: boolean("isShareLocationActive").default(false).notNull(),
  
  phoneNumber: varchar("phoneNumber", { length: 20 }),

  // Dog Sitter Profile
  isDogSitter: boolean("isDogSitter").default(false).notNull(),
  dogSitterBio: text("dogSitterBio"),
  dogSitterRates: json("dogSitterRates").$type<{ night?: number; halfDay?: number; walk?: number }>(),
  dogSitterAvailable: boolean("dogSitterAvailable").default(false).notNull(),
  dogSitterMaxDogs: int("dogSitterMaxDogs").default(1),
  dogSitterStatus: mysqlEnum("dogSitterStatus", ["pending", "approved", "rejected", "blocked"]).default("pending"),
  dogsittingFriendly: boolean("dogsittingFriendly").default(false).notNull(),

  // Payment / Monetization Limits
  plan: varchar("plan", { length: 32 }).default("free").notNull(),
  bypassPaymentLimits: boolean("bypassPaymentLimits").default(false).notNull(),
  superLikeCredits: int("superLikeCredits").default(0).notNull(),
  swipeLimitUntil: timestamp("swipeLimitUntil"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Dog profile table - each user can have multiple dogs
 */
export const dogs = mysqlTable("dogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  breed: varchar("breed", { length: 255 }),
  age: int("age"), // in years
  description: text("description"),
  personality: json("personality").$type<string[]>(), // e.g., "playful", "calm", "energetic"
  photoUrls: json("photoUrls").$type<string[]>(),

  // Boarding
  availableForBoarding: boolean("availableForBoarding").default(false).notNull(),

  // Breeding
  sex: mysqlEnum("sex", ["male", "female", "unknown"]).default("unknown"),
  openToBreeding: boolean("openToBreeding").default(false).notNull(),
  breedingInfo: text("breedingInfo"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Dog = typeof dogs.$inferSelect;
export type InsertDog = typeof dogs.$inferInsert;

/**
 * Swipes table - tracks user interactions (like/pass)
 */
export const swipes = mysqlTable("swipes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // who swiped
  targetUserId: int("targetUserId").notNull(), // who was swiped on
  liked: boolean("liked").notNull(), // true = like, false = pass
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Swipe = typeof swipes.$inferSelect;
export type InsertSwipe = typeof swipes.$inferInsert;

/**
 * Favorites table - tracks user interactions (adding to favorites)
 */
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  targetUserId: int("targetUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  unique("unique_user_target").on(table.userId, table.targetUserId),
]);

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

/**
 * Blocks table - tracks users blocked or unmatched
 */
export const blocks = mysqlTable("blocks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // who blocked
  targetUserId: int("targetUserId").notNull(), // who was blocked
  type: varchar("type", { length: 16 }).default("permanent").notNull(), // 'temporary' or 'permanent'
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  unique("unique_user_block").on(table.userId, table.targetUserId),
]);

export type Block = typeof blocks.$inferSelect;
export type InsertBlock = typeof blocks.$inferInsert;

/**
 * Matches table - created when two users like each other
 */
export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  userId1: int("userId1").notNull(),
  userId2: int("userId2").notNull(),
  compatibilityScore: decimal("compatibilityScore", { precision: 5, scale: 2 }), // 0-100
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

/**
 * Messages table - direct messages between matched users
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),
  senderId: int("senderId").notNull(),
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Notifications table
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["match", "message", "system"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  read: boolean("read").default(false).notNull(),
  relatedMatchId: int("relatedMatchId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Reviews table - ratings and comments after meetings
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  reviewerId: int("reviewerId").notNull(),
  reviewedId: int("reviewedId").notNull(),
  matchId: int("matchId"),
  rating: int("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Verification table - identity verification via selfie
 */
export const verifications = mysqlTable("verifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  photoUrl: varchar("photoUrl", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  rejectionReason: text("rejectionReason"),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Verification = typeof verifications.$inferSelect;
export type InsertVerification = typeof verifications.$inferInsert;

/**
 * Relations
 */
export const usersRelations = relations(users, ({ many, one }) => ({
  dogs: many(dogs),
  sentSwipes: many(swipes),
  matches1: many(matches),
  sentMessages: many(messages),
  notifications: many(notifications),
  givenReviews: many(reviews),
  verification: one(verifications, {
    fields: [users.id],
    references: [verifications.userId],
  }),
}));

export const dogsRelations = relations(dogs, ({ one }) => ({
  user: one(users, {
    fields: [dogs.userId],
    references: [users.id],
  }),
}));

export const swipesRelations = relations(swipes, ({ one }) => ({
  user: one(users, {
    fields: [swipes.userId],
    references: [users.id],
  }),
  targetUser: one(users, {
    fields: [swipes.targetUserId],
    references: [users.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  user1: one(users, {
    fields: [matches.userId1],
    references: [users.id],
  }),
  user2: one(users, {
    fields: [matches.userId2],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  match: one(matches, {
    fields: [messages.matchId],
    references: [matches.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  match: one(matches, {
    fields: [notifications.relatedMatchId],
    references: [matches.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
  }),
  reviewed: one(users, {
    fields: [reviews.reviewedId],
    references: [users.id],
  }),
  match: one(matches, {
    fields: [reviews.matchId],
    references: [matches.id],
  }),
}));

export const verificationsRelations = relations(verifications, ({ one }) => ({
  user: one(users, {
    fields: [verifications.userId],
    references: [users.id],
  }),
}));

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("EUR").notNull(),
  packageType: varchar("packageType", { length: 64 }).notNull(), // 'extra_favorites', 'unlimited_swipes', 'premium_pass'
  paymentMethod: varchar("paymentMethod", { length: 32 }).notNull(), // 'card', 'google_pay', 'apple_pay'
  status: varchar("status", { length: 32 }).default("completed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const planSettings = mysqlTable("plan_settings", {
  plan: varchar("plan", { length: 32 }).primaryKey(),
  maxSwipesPerDay: int("maxSwipesPerDay").notNull().default(10),
  maxFavoritesPerDay: int("maxFavoritesPerDay").notNull().default(1),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlanSetting = typeof planSettings.$inferSelect;
export type InsertPlanSetting = typeof planSettings.$inferInsert;

/**
 * Boarding requests — dog-sitter system
 */
export const boardingRequests = mysqlTable("boarding_requests", {
  id: int("id").autoincrement().primaryKey(),
  dogId: int("dogId").notNull(),         // chien à garder
  ownerId: int("ownerId").notNull(),     // propriétaire du chien
  sitterId: int("sitterId").notNull(),   // dog-sitter
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  message: text("message"),
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "completed"]).default("pending").notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }),
  ownerPhone: varchar("ownerPhone", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BoardingRequest = typeof boardingRequests.$inferSelect;
export type InsertBoardingRequest = typeof boardingRequests.$inferInsert;

export const boardingRequestsRelations = relations(boardingRequests, ({ one }) => ({
  dog: one(dogs, { fields: [boardingRequests.dogId], references: [dogs.id] }),
  owner: one(users, { fields: [boardingRequests.ownerId], references: [users.id] }),
  sitter: one(users, { fields: [boardingRequests.sitterId], references: [users.id] }),
}));

// ═══════════════════════════════════════════════════════════════════════════
// FORUM COMMUNAUTAIRE
// ═══════════════════════════════════════════════════════════════════════════

/** Catégories du forum (seeded, gérées par admin) */
export const forumCategories = mysqlTable("forum_categories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 10 }).notNull().default("💬"),
  color: varchar("color", { length: 20 }).notNull().default("#6366f1"),
  position: int("position").notNull().default(0),
  isOfficial: boolean("isOfficial").default(false).notNull(),
  postCount: int("postCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ForumCategory = typeof forumCategories.$inferSelect;

/** Posts du forum */
export const forumPosts = mysqlTable("forum_posts", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["open", "solved", "closed"]).default("open").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  isLocked: boolean("isLocked").default(false).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  replyCount: int("replyCount").default(0).notNull(),
  upvotes: int("upvotes").default(0).notNull(),
  downvotes: int("downvotes").default(0).notNull(),
  tags: json("tags").$type<string[]>().default([]),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ForumPost = typeof forumPosts.$inferSelect;
export type InsertForumPost = typeof forumPosts.$inferInsert;

/** Réponses imbriquées (2 niveaux max côté UI) */
export const forumReplies = mysqlTable("forum_replies", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  authorId: int("authorId").notNull(),
  parentReplyId: int("parentReplyId"),  // NULL = réponse root
  body: text("body").notNull(),
  isAcceptedAnswer: boolean("isAcceptedAnswer").default(false).notNull(),
  upvotes: int("upvotes").default(0).notNull(),
  downvotes: int("downvotes").default(0).notNull(),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ForumReply = typeof forumReplies.$inferSelect;
export type InsertForumReply = typeof forumReplies.$inferInsert;

/** Votes (+1/-1) sur posts ET réponses — un vote par user+target */
export const forumVotes = mysqlTable("forum_votes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  targetType: mysqlEnum("targetType", ["post", "reply"]).notNull(),
  targetId: int("targetId").notNull(),
  value: int("value").notNull(), // +1 ou -1
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  uniq: unique().on(t.userId, t.targetType, t.targetId),
}));

export type ForumVote = typeof forumVotes.$inferSelect;

/** Réactions emoji sur posts et réponses */
export const forumReactions = mysqlTable("forum_reactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  targetType: mysqlEnum("targetType", ["post", "reply"]).notNull(),
  targetId: int("targetId").notNull(),
  emoji: mysqlEnum("emoji", ["heart", "laugh", "celebrate", "eyes", "paw"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  uniq: unique().on(t.userId, t.targetType, t.targetId, t.emoji),
}));

export type ForumReaction = typeof forumReactions.$inferSelect;

/** Bookmarks / sauvegardes de posts */
export const forumBookmarks = mysqlTable("forum_bookmarks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  postId: int("postId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  uniq: unique().on(t.userId, t.postId),
}));

export type ForumBookmark = typeof forumBookmarks.$inferSelect;

/** Signalements (reports) */
export const forumReports = mysqlTable("forum_reports", {
  id: int("id").autoincrement().primaryKey(),
  reporterId: int("reporterId").notNull(),
  targetType: mysqlEnum("targetType", ["post", "reply"]).notNull(),
  targetId: int("targetId").notNull(),
  reason: mysqlEnum("reason", [
    "spam", "inappropriate", "harassment", "misinformation", "other"
  ]).notNull(),
  status: mysqlEnum("status", ["pending", "reviewed", "dismissed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ForumReport = typeof forumReports.$inferSelect;

/** Dog Walking Services */
export const walkingServices = mysqlTable("walking_services", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  pricePerWalk: decimal("pricePerWalk", { precision: 10, scale: 2 }),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "biweekly", "monthly"]),
  availableDays: json("availableDays").$type<string[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WalkingService = typeof walkingServices.$inferSelect;

/** Dog Walking Bookings */
export const walkingBookings = mysqlTable("walking_bookings", {
  id: int("id").autoincrement().primaryKey(),
  serviceId: int("serviceId").notNull(),
  userId: int("userId").notNull(),
  scheduledDate: timestamp("scheduledDate").notNull(),
  notes: text("notes"),
  rating: int("rating"),
  review: text("review"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WalkingBooking = typeof walkingBookings.$inferSelect;

/** Sponsorships System */
export const sponsorships = mysqlTable("sponsorships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sitterId: int("sitterId"),
  reason: text("reason").notNull(),
  frequency: mysqlEnum("frequency", ["weekly", "biweekly", "monthly"]).notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  rating: int("rating"),
  review: text("review"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Sponsorship = typeof sponsorships.$inferSelect;

/** Dog Friendly Places (PlayDogs Style) */
export const dogFriendlyPlaces = mysqlTable("dog_friendly_places", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  placeType: mysqlEnum("placeType", ["park", "beach", "restaurant", "hotel", "other"]).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  address: text("address"),
  description: text("description"),
  osmId: varchar("osmId", { length: 100 }),
  isDogsAllowed: boolean("isDogsAllowed").default(true).notNull(),
  attributes: json("attributes").$type<{ leashRequired?: boolean; waterAvailable?: boolean; fenced?: boolean; [key: string]: any }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DogFriendlyPlace = typeof dogFriendlyPlaces.$inferSelect;

/** Place Reviews */
export const placeReviews = mysqlTable("place_reviews", {
  id: int("id").autoincrement().primaryKey(),
  placeId: int("placeId").notNull(),
  userId: int("userId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlaceReview = typeof placeReviews.$inferSelect;

/** Walks */
export const walks = mysqlTable("walks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  distanceMeter: int("distanceMeter").notNull(),
  durationSecond: int("durationSecond").notNull(),
  gpsPath: json("gpsPath").$type<{ lat: number; lng: number; timestamp: number }[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Walk = typeof walks.$inferSelect;

/** Walk Goals */
export const walkGoals = mysqlTable("walk_goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  goalType: mysqlEnum("goalType", ["distance", "duration"]).notNull(),
  targetValue: int("targetValue").notNull(),
  currentValue: int("currentValue").default(0).notNull(),
  period: mysqlEnum("period", ["weekly", "monthly"]).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WalkGoal = typeof walkGoals.$inferSelect;

/** Danger Alerts */
export const dangerAlerts = mysqlTable("danger_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  dangerType: mysqlEnum("dangerType", ["cyanobacteria", "hunting", "poison_bait", "stray_animal", "other"]).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["active", "resolved"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type DangerAlert = typeof dangerAlerts.$inferSelect;

/** Pet Health Records */
export const petHealthRecords = mysqlTable("pet_health_records", {
  id: int("id").autoincrement().primaryKey(),
  dogId: int("dogId").notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  allergies: text("allergies"),
  medicalHistory: text("medicalHistory"),
  treatmentInfo: text("treatmentInfo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PetHealthRecord = typeof petHealthRecords.$inferSelect;

/** Pet Vaccines */
export const petVaccines = mysqlTable("pet_vaccines", {
  id: int("id").autoincrement().primaryKey(),
  dogId: int("dogId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  administeredDate: timestamp("administeredDate").notNull(),
  nextBoosterDate: timestamp("nextBoosterDate").notNull(),
  status: mysqlEnum("status", ["active", "overdue"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PetVaccine = typeof petVaccines.$inferSelect;

/** Pet Documents */
export const petDocuments = mysqlTable("pet_documents", {
  id: int("id").autoincrement().primaryKey(),
  dogId: int("dogId").notNull(),
  documentName: varchar("documentName", { length: 255 }).notNull(),
  documentUrl: varchar("documentUrl", { length: 500 }).notNull(),
  documentType: mysqlEnum("documentType", ["prescription", "certificate", "other"]).default("other").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PetDocument = typeof petDocuments.$inferSelect;

/** Veterinarians */
export const veterinarians = mysqlTable("veterinarians", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  specialty: varchar("specialty", { length: 255 }),
  clinicName: varchar("clinicName", { length: 255 }),
  address: text("address"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  email: varchar("email", { length: 255 }),
  isPartner: boolean("isPartner").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Veterinarian = typeof veterinarians.$inferSelect;

/** Vet Slots */
export const vetSlots = mysqlTable("vet_slots", {
  id: int("id").autoincrement().primaryKey(),
  vetId: int("vetId").notNull(),
  slotTime: timestamp("slotTime").notNull(),
  isBooked: boolean("isBooked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VetSlot = typeof vetSlots.$inferSelect;

/** Vet Appointments */
export const vetAppointments = mysqlTable("vet_appointments", {
  id: int("id").autoincrement().primaryKey(),
  dogId: int("dogId").notNull(),
  userId: int("userId").notNull(),
  vetId: int("vetId"),
  customVetName: varchar("customVetName", { length: 255 }),
  appointmentTime: timestamp("appointmentTime").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled"]).default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VetAppointment = typeof vetAppointments.$inferSelect;

// ─── Relations Forum ─────────────────────────────────────────────────────────

export const forumCategoriesRelations = relations(forumCategories, ({ many }) => ({
  posts: many(forumPosts),
}));

export const forumPostsRelations = relations(forumPosts, ({ one, many }) => ({
  category: one(forumCategories, { fields: [forumPosts.categoryId], references: [forumCategories.id] }),
  author: one(users, { fields: [forumPosts.authorId], references: [users.id] }),
  replies: many(forumReplies),
  votes: many(forumVotes),
  reactions: many(forumReactions),
  bookmarks: many(forumBookmarks),
}));

export const forumRepliesRelations = relations(forumReplies, ({ one, many }) => ({
  post: one(forumPosts, { fields: [forumReplies.postId], references: [forumPosts.id] }),
  author: one(users, { fields: [forumReplies.authorId], references: [users.id] }),
  parent: one(forumReplies, { fields: [forumReplies.parentReplyId], references: [forumReplies.id] }),
  children: many(forumReplies),
}));

export const forumVotesRelations = relations(forumVotes, ({ one }) => ({
  user: one(users, { fields: [forumVotes.userId], references: [users.id] }),
}));

export const forumBookmarksRelations = relations(forumBookmarks, ({ one }) => ({
  user: one(users, { fields: [forumBookmarks.userId], references: [users.id] }),
  post: one(forumPosts, { fields: [forumBookmarks.postId], references: [forumPosts.id] }),
}));
