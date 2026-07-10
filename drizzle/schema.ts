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
  
  // Payment / Monetization Limits
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
