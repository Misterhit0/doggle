import { eq, and, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users, dogs, Dog, InsertDog, matches, swipes, messages, notifications, reviews, verifications, Review, Verification, InsertReview, InsertVerification, payments, walkingServices, walkingBookings, sponsorships, dogFriendlyPlaces, placeReviews, walks, walkGoals, dangerAlerts, petHealthRecords, petVaccines, petDocuments, veterinarians, vetSlots, vetAppointments } from "../drizzle/schema";
import { ENV } from './_core/env';
import { logger } from "./_core/logger";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Dedicated mysql2 pool for raw SQL queries (favorites, events, sponsorships, lost dogs).
// This is the reliable way to run parameterized raw SQL instead of reaching into drizzle internals.
export function getPool(): mysql.Pool | null {
  if (!_pool && process.env.DATABASE_URL) {
    try {
      _pool = mysql.createPool(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to create pool:", error);
      _pool = null;
    }
  }
  return _pool;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, updates: Record<string, unknown>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user profile: database not available");
    return;
  }

  await db.update(users).set(updates).where(eq(users.id, userId));
}

// Dog Profile Management
export async function createDog(dog: InsertDog) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create dog: database not available");
    return undefined;
  }

  return await db.insert(dogs).values(dog);
}

export async function getDogById(dogId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get dog: database not available");
    return undefined;
  }

  const result = await db.select().from(dogs).where(eq(dogs.id, dogId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDogsByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get dogs: database not available");
    return [];
  }

  return await db.select().from(dogs).where(eq(dogs.userId, userId));
}

export async function updateDog(dogId: number, updates: Record<string, unknown>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update dog: database not available");
    return;
  }

  await db.update(dogs).set(updates).where(eq(dogs.id, dogId));
}

export async function deleteDog(dogId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete dog: database not available");
    return;
  }

  await db.delete(dogs).where(eq(dogs.id, dogId));
}

// Swipe Management
export async function createSwipe(userId: number, targetUserId: number, liked: boolean) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create swipe: database not available");
    return undefined;
  }

  return await db.insert(swipes).values({
    userId,
    targetUserId,
    liked,
  });
}

export async function getSwipe(userId: number, targetUserId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get swipe: database not available");
    return undefined;
  }

  const result = await db.select().from(swipes).where(
    and(
      eq(swipes.userId, userId),
      eq(swipes.targetUserId, targetUserId)
    )
  ).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getMatchById(matchId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get match by ID: database not available");
    return undefined;
  }

  const result = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Match Management
export async function createMatch(userId1: number, userId2: number, compatibilityScore: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create match: database not available");
    return undefined;
  }

  return await db.insert(matches).values({
    userId1,
    userId2,
    compatibilityScore: compatibilityScore.toString(),
  });
}

export async function getMatch(userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get match: database not available");
    return undefined;
  }

  const result = await db.select().from(matches).where(
    and(
      eq(matches.userId1, userId1),
      eq(matches.userId2, userId2)
    )
  ).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getMatchesForUser(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get matches: database not available");
    return [];
  }

  try {
    const connection = getPool();
    if (!connection) return [];

    const query = `
      SELECT
        CAST(m.id AS UNSIGNED) as id,
        m.createdAt,
        m.compatibilityScore,
        CAST(m.userId1 AS UNSIGNED) as user1Id,
        CAST(m.userId2 AS UNSIGNED) as user2Id,
        u1.name as user1Name,
        u1.profilePhotoUrl as user1Photo,
        u2.name as user2Name,
        u2.profilePhotoUrl as user2Photo,
        IF(f.id IS NOT NULL, 1, 0) as isFavorite
      FROM matches m
      JOIN users u1 ON m.userId1 = u1.id
      JOIN users u2 ON m.userId2 = u2.id
      LEFT JOIN favorites f ON f.userId = ? AND f.targetUserId = IF(m.userId1 = ?, m.userId2, m.userId1)
      WHERE m.userId1 = ? OR m.userId2 = ?
      ORDER BY isFavorite DESC, m.createdAt DESC
    `;
    const [rows] = await connection.execute(query, [userId, userId, userId, userId]);
    const matchesList = (rows as any[]) || [];

    const withDogs = await Promise.all(
      matchesList.map(async (match) => {
        const isUser1 = Number(match.user1Id) === userId;
        const otherUserId = isUser1 ? Number(match.user2Id) : Number(match.user1Id);
        
        const otherDogs = await getDogsByUserId(otherUserId);
        
        return {
          ...match,
          isFavorite: Boolean(match.isFavorite),
          otherDog: otherDogs.length > 0 ? otherDogs[0] : null,
        };
      })
    );
    return withDogs;
  } catch (error) {
    console.error("[Database] Failed to get matches for user:", error);
    return [];
  }
}

export async function sendMessage(matchId: number, senderId: number, content: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot send message: database not available");
    return undefined;
  }

  return await db.insert(messages).values({
    matchId,
    senderId,
    content,
  });
}

export async function getMessagesForMatch(matchId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get messages: database not available");
    return [];
  }

  return await db.select().from(messages).where(eq(messages.matchId, matchId));
}

export async function createNotification(userId: number, type: 'match' | 'message' | 'system', title: string, content?: string, relatedMatchId?: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create notification: database not available");
    return undefined;
  }

  return await db.insert(notifications).values({
    userId,
    type,
    title,
    content,
    relatedMatchId,
  });
}

export async function getNotificationsForUser(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get notifications: database not available");
    return [];
  }

  return await db.select().from(notifications).where(eq(notifications.userId, userId));
}


export async function updateUserLocation(userId: number, latitude: number, longitude: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update location: database not available");
    return;
  }

  await db.update(users).set({
    latitude,
    longitude,
    lastLocationUpdate: new Date(),
  }).where(eq(users.id, userId));
}

/**
 * Calculate distance between two coordinates using Haversine formula (in km)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getNearbyUsers(userId: number, radiusKm: number = 5) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get nearby users: database not available");
    return [];
  }

  const currentUser = await getUserById(userId);
  
  // Get all users
  const allUsers = await db.select().from(users);

  // Filter candidates based on dogsitting preferences
  const candidates = allUsers.filter(user => {
    if (user.id === userId) return false;
    
    // If current user is a dog sitter, target must be dogsitting friendly
    if (currentUser?.isDogSitter && !user.dogsittingFriendly) {
      return false;
    }
    
    // If target is a dog sitter, current user must be dogsitting friendly
    if (user.isDogSitter && !currentUser?.dogsittingFriendly) {
      return false;
    }
    
    return true;
  });

  if (!currentUser || currentUser.latitude === null || currentUser.longitude === null) {
    return candidates;
  }

  // Filter by distance
  const nearby = candidates.filter(user => {
    if (user.latitude === null || user.longitude === null) return false;
    const distance = calculateDistance(
      currentUser.latitude,
      currentUser.longitude,
      user.latitude,
      user.longitude
    );
    return distance <= radiusKm;
  });

  if (nearby.length === 0) {
    return candidates;
  }

  return nearby;
}

export async function getNearbyDuos(userId: number, radiusKm: number = 5) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get nearby duos: database not available");
    return [];
  }

  const currentUser = await getUserById(userId);
  const nearbyUsers = await getNearbyUsers(userId, radiusKm);
  
  if (nearbyUsers.length === 0) {
    return [];
  }
  
  // Get dogs for each nearby user
  const duos = await Promise.all(
    nearbyUsers.map(async (user) => {
      let userDogs = await getDogsByUserId(user.id);
      if (currentUser?.isDogSitter) {
        userDogs = userDogs.filter(dog => dog.availableForBoarding === true || dog.availableForBoarding === 1);
      }
      return {
        user,
        dogs: userDogs,
      };
    })
  );

  return duos.filter(duo => duo.dogs.length > 0);
}

// Block and Unmatch Management
export async function blockUser(userId: number, targetUserId: number, isPermanent: boolean) {
  const db = await getDb();
  if (!db) return undefined;
  const pool = getPool();
  if (!pool) return undefined;

  try {
    const type = isPermanent ? 'permanent' : 'temporary';
    
    // Insert block record (update if already exists)
    await pool.execute(
      `INSERT INTO blocks (userId, targetUserId, type, expiresAt) 
       VALUES (?, ?, ?, IF(?, DATE_ADD(NOW(), INTERVAL 7 DAY), NULL))
       ON DUPLICATE KEY UPDATE 
         type = VALUES(type), 
         expiresAt = VALUES(expiresAt),
         createdAt = CURRENT_TIMESTAMP`,
      [userId, targetUserId, type, !isPermanent]
    );

    // Delete matches between them
    await pool.execute(
      `DELETE FROM matches WHERE (userId1 = ? AND userId2 = ?) OR (userId1 = ? AND userId2 = ?)`,
      [userId, targetUserId, targetUserId, userId]
    );

    // Delete swipes between them
    await pool.execute(
      `DELETE FROM swipes WHERE (userId = ? AND targetUserId = ?) OR (userId = ? AND targetUserId = ?)`,
      [userId, targetUserId, targetUserId, userId]
    );

    // Delete favorites between them
    await pool.execute(
      `DELETE FROM favorites WHERE (userId = ? AND targetUserId = ?) OR (userId = ? AND targetUserId = ?)`,
      [userId, targetUserId, targetUserId, userId]
    );

    return true;
  } catch (error) {
    console.error("[Database] Failed to block user:", error);
    return false;
  }
}

export async function getBlockedUserIds(userId: number): Promise<number[]> {
  const pool = getPool();
  if (!pool) return [];

  try {
    // Get all user IDs blocked by current user OR users who blocked the current user
    // only if block is permanent or not yet expired
    const [rows] = await pool.execute(
      `SELECT targetUserId FROM blocks WHERE userId = ? AND (type = 'permanent' OR expiresAt > NOW())
       UNION
       SELECT userId FROM blocks WHERE targetUserId = ? AND (type = 'permanent' OR expiresAt > NOW())`,
      [userId, userId]
    );

    return (rows as any[]).map(r => Number(r.targetUserId || r.userId));
  } catch (error) {
    console.error("[Database] Failed to get blocked user IDs:", error);
    return [];
  }
}

export async function getBlockedUsers(userId: number) {
  const pool = getPool();
  if (!pool) return [];

  try {
    const [rows] = await pool.execute(
      `SELECT b.id as blockId, b.targetUserId, b.type, b.expiresAt, b.createdAt as blockedAt,
              u.name, u.profilePhotoUrl, u.age, u.bio
       FROM blocks b
       JOIN users u ON b.targetUserId = u.id
       WHERE b.userId = ? AND (b.type = 'permanent' OR b.expiresAt > NOW())
       ORDER BY b.createdAt DESC`,
      [userId]
    );

    const blockedWithDogs = await Promise.all(
      (rows as any[]).map(async (row) => {
        const dogs = await getDogsByUserId(row.targetUserId);
        return {
          ...row,
          dogs,
        };
      })
    );

    return blockedWithDogs;
  } catch (error) {
    console.error("[Database] Failed to get blocked users list:", error);
    return [];
  }
}

export async function unblockUser(userId: number, targetUserId: number) {
  const pool = getPool();
  if (!pool) return false;

  try {
    await pool.execute(
      `DELETE FROM blocks WHERE userId = ? AND targetUserId = ?`,
      [userId, targetUserId]
    );
    return true;
  } catch (error) {
    console.error("[Database] Failed to unblock user:", error);
    return false;
  }
}

// Favorites Management
export async function addFavorite(userId: number, targetUserId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add favorite: database not available");
    return undefined;
  }

  try {
    // Using raw SQL through execute
    const connection = getPool();
    if (!connection) return undefined;
    return await connection.execute(
      `INSERT INTO favorites (userId, targetUserId) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE createdAt = CURRENT_TIMESTAMP`,
      [userId, targetUserId]
    );
  } catch (error) {
    console.error("[Database] Failed to add favorite:", error);
    return undefined;
  }
}

export async function removeFavorite(userId: number, targetUserId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot remove favorite: database not available");
    return undefined;
  }

  try {
    const connection = getPool();
    if (!connection) return undefined;
    return await connection.execute(
      `DELETE FROM favorites WHERE userId = ? AND targetUserId = ?`,
      [userId, targetUserId]
    );
  } catch (error) {
    console.error("[Database] Failed to remove favorite:", error);
    return undefined;
  }
}

export async function isFavorite(userId: number, targetUserId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot check favorite: database not available");
    return false;
  }

  try {
    const connection = getPool();
    if (!connection) return false;
    const [result] = await connection.execute(
      `SELECT id FROM favorites WHERE userId = ? AND targetUserId = ? LIMIT 1`,
      [userId, targetUserId]
    );
    return (result as any[]).length > 0;
  } catch (error) {
    console.error("[Database] Failed to check favorite:", error);
    return false;
  }
}

export async function getFavorites(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get favorites: database not available");
    return [];
  }

  try {
    const connection = getPool();
    if (!connection) return [];
    const [favorites] = await connection.execute(
      `SELECT f.id, f.targetUserId, f.createdAt, u.name, u.age, u.bio, u.profilePhotoUrl
       FROM favorites f
       JOIN users u ON f.targetUserId = u.id
       WHERE f.userId = ?
       ORDER BY f.createdAt DESC`,
      [userId]
    );
    
    // Get dogs for each favorite
    const favoritesWithDogs = await Promise.all(
      (favorites as any[]).map(async (fav) => {
        const dogs = await getDogsByUserId(fav.targetUserId);
        return {
          ...fav,
          dogs,
        };
      })
    );
    
    return favoritesWithDogs;
  } catch (error) {
    console.error("[Database] Failed to get favorites:", error);
    return [];
  }
}

export async function getSwipeHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get swipe history: database not available");
    return [];
  }

  try {
    const connection = getPool();
    if (!connection) return [];
    const [history] = await connection.execute(
      `SELECT s.id, s.targetUserId, s.liked, s.createdAt, u.name, u.age, u.bio, u.profilePhotoUrl
       FROM swipes s
       JOIN users u ON s.targetUserId = u.id
       WHERE s.userId = ?
       ORDER BY s.createdAt DESC
       LIMIT ${Number(limit)}`,
      [userId]
    );
    
    // Get dogs for each swiped user
    const historyWithDogs = await Promise.all(
      (history as any[]).map(async (swipe) => {
        const dogs = await getDogsByUserId(swipe.targetUserId);
        return {
          ...swipe,
          dogs,
        };
      })
    );
    
    return historyWithDogs;
  } catch (error) {
    console.error("[Database] Failed to get swipe history:", error);
    return [];
  }
}

// ============ EVENTS HELPERS ============

export async function createEvent(data: {
  organizerId: number;
  title: string;
  description: string;
  eventType: string;
  location: string;
  latitude: number;
  longitude: number;
  eventDate: Date;
  duration: number;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const connection = getPool();
    if (!connection) return null;
    const [result] = await connection.execute(
      `INSERT INTO events (organizerId, title, description, eventType, location, latitude, longitude, eventDate, duration, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [data.organizerId, data.title, data.description, data.eventType, data.location, data.latitude, data.longitude, data.eventDate, data.duration]
    );
    return (result as any).insertId;
  } catch (error) {
    console.error("[Database] Failed to create event:", error);
    return null;
  }
}

export async function getNearbyEvents(userId: number, latitude: number, longitude: number, radiusKm: number = 10, eventType?: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const connection = getPool();
    if (!connection) return [];
    const query = `
      SELECT e.*, u.name as organizerName, u.profilePhotoUrl as organizerPhoto,
             (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(e.latitude)) * cos(radians(e.longitude) - radians(?)) + sin(radians(?)) * sin(radians(e.latitude)), -1), 1))) as distance
      FROM events e
      JOIN users u ON e.organizerId = u.id
      WHERE (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(e.latitude)) * cos(radians(e.longitude) - radians(?)) + sin(radians(?)) * sin(radians(e.latitude)), -1), 1))) <= ?
      ${eventType ? 'AND e.eventType = ?' : ''}
      AND e.eventDate >= NOW()
      ORDER BY distance ASC
    `;
    
    const params = eventType 
      ? [latitude, longitude, latitude, latitude, longitude, latitude, radiusKm, eventType]
      : [latitude, longitude, latitude, latitude, longitude, latitude, radiusKm];
    
    const [events] = await connection.execute(query, params);
    return events || [];
  } catch (error) {
    console.error("[Database] Failed to get nearby events:", error);
    return [];
  }
}

export async function joinEvent(userId: number, eventId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    const connection = getPool();
    if (!connection) return false;
    await connection.execute(
      `INSERT INTO event_participants (eventId, userId, joinedAt) VALUES (?, ?, NOW())`,
      [eventId, userId]
    );
    return true;
  } catch (error) {
    console.error("[Database] Failed to join event:", error);
    return false;
  }
}

// ============ SPONSORSHIP HELPERS ============

export async function createSponsorshipRequest(data: {
  requesterId: number;
  volunteerId: number;
  reason: string;
  frequency: string;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const connection = getPool();
    if (!connection) return null;
    const [result] = await connection.execute(
      `INSERT INTO sponsorships (requesterId, volunteerId, reason, frequency, status, createdAt)
       VALUES (?, ?, ?, ?, 'pending', NOW())`,
      [data.requesterId, data.volunteerId, data.reason, data.frequency]
    );
    return (result as any).insertId;
  } catch (error) {
    console.error("[Database] Failed to create sponsorship:", error);
    return null;
  }
}

// ============ LOST DOGS HELPERS ============

export async function reportLostDog(data: {
  dogId: number;
  userId: number;
  description: string;
  lostDate: Date;
  lostLocation: string;
  latitude: number;
  longitude: number;
  reward?: string;
  contactPhone?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const connection = getPool();
    if (!connection) return null;

    let dogName = "Inconnu";
    let dogBreed = null;
    let dogAge = null;

    if (data.dogId) {
      const [dogRows] = await connection.execute(
        "SELECT name, breed, age FROM dogs WHERE id = ?",
        [data.dogId]
      );
      if (Array.isArray(dogRows) && dogRows.length > 0) {
        const dog = dogRows[0] as any;
        dogName = dog.name || "Inconnu";
        dogBreed = dog.breed || null;
        dogAge = dog.age !== undefined ? dog.age : null;
      }
    }

    const [result] = await connection.execute(
      `INSERT INTO lost_dogs (dogId, userId, name, breed, age, description, lostDate, lostLocation, latitude, longitude, reward, contactPhone, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'lost', NOW())`,
      [
        data.dogId,
        data.userId,
        dogName,
        dogBreed,
        dogAge,
        data.description,
        data.lostDate,
        data.lostLocation,
        data.latitude,
        data.longitude,
        data.reward || null,
        data.contactPhone || null
      ]
    );
    return (result as any).insertId;
  } catch (error) {
    console.error("[Database] Failed to report lost dog:", error);
    return null;
  }
}

export async function reportSighting(data: {
  lostDogId: number;
  userId: number;
  location: string;
  latitude: number;
  longitude: number;
  sightingDate: Date;
  description: string;
  confidence: string;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const connection = getPool();
    if (!connection) return null;
    const [result] = await connection.execute(
      `INSERT INTO sightings (lostDogId, userId, location, latitude, longitude, sightingDate, description, confidence, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [data.lostDogId, data.userId, data.location, data.latitude, data.longitude, data.sightingDate, data.description, data.confidence]
    );
    return (result as any).insertId;
  } catch (error) {
    console.error("[Database] Failed to report sighting:", error);
    return null;
  }
}

export async function getNearbyLostDogs(latitude: number, longitude: number, radiusKm: number = 25) {
  const db = await getDb();
  if (!db) return [];

  try {
    const connection = getPool();
    if (!connection) return [];
    const [lostDogs] = await connection.execute(
      `SELECT ld.*, d.name, d.breed, d.age, d.photoUrls, u.name as ownerName, u.profilePhotoUrl,
              (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(ld.latitude)) * cos(radians(ld.longitude) - radians(?)) + sin(radians(?)) * sin(radians(ld.latitude)), -1), 1))) as distance
       FROM lost_dogs ld
       JOIN dogs d ON ld.dogId = d.id
       JOIN users u ON ld.userId = u.id
       WHERE ld.status = 'lost'
       AND (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(ld.latitude)) * cos(radians(ld.longitude) - radians(?)) + sin(radians(?)) * sin(radians(ld.latitude)), -1), 1))) <= ?
       ORDER BY ld.createdAt DESC`,
      [latitude, longitude, latitude, latitude, longitude, latitude, radiusKm]
    );
    return lostDogs || [];
  } catch (error) {
    console.error("[Database] Failed to get nearby lost dogs:", error);
    return [];
  }
}

export async function getSightings(lostDogId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const connection = getPool();
    if (!connection) return [];
    const [sightings] = await connection.execute(
      `SELECT s.*, u.name as reporterName, u.profilePhotoUrl
       FROM sightings s
       JOIN users u ON s.userId = u.id
       WHERE s.lostDogId = ?
       ORDER BY s.sightingDate DESC`,
      [lostDogId]
    );
    return sightings || [];
  } catch (error) {
    console.error("[Database] Failed to get sightings:", error);
    return [];
  }
}

export async function getNearbySightings(latitude: number, longitude: number, radiusKm: number = 25) {
  const db = await getDb();
  if (!db) return [];

  try {
    const connection = getPool();
    if (!connection) return [];
    const [sightings] = await connection.execute(
      `SELECT s.*, u.name as reporterName, u.profilePhotoUrl,
              (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(?)) + sin(radians(?)) * sin(radians(s.latitude)), -1), 1))) as distance
       FROM sightings s
       JOIN users u ON s.userId = u.id
       WHERE (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(?)) + sin(radians(?)) * sin(radians(s.latitude)), -1), 1))) <= ?
       ORDER BY s.sightingDate DESC`,
      [latitude, longitude, latitude, latitude, longitude, latitude, radiusKm]
    );
    return sightings || [];
  } catch (error) {
    console.error("[Database] Failed to get nearby sightings:", error);
    return [];
  }
}

export async function markLostDogAsFound(lostDogId: number, userId: number) {
  const connection = getPool();
  if (!connection) {
    console.warn("[Database] Cannot mark lost dog as found: database not available");
    return false;
  }

  const [result] = await connection.execute(
    "UPDATE lost_dogs SET status = 'found' WHERE id = ? AND userId = ?",
    [lostDogId, userId]
  );
  return (result as any).affectedRows > 0;
}

// Home location and walking tracking
export async function setHomeLocation(userId: number, latitude: number, longitude: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot set home location: database not available");
    return;
  }

  await db.update(users).set({
    homeLatitude: latitude,
    homeLongitude: longitude,
  }).where(eq(users.id, userId));
}

export async function toggleLocationSharing(userId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot toggle location sharing: database not available");
    return;
  }

  await db.update(users).set({
    isShareLocationActive: isActive,
  }).where(eq(users.id, userId));
}

export async function getActiveWalkers(radiusKm: number = 10, latitude?: number, longitude?: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get active walkers: database not available");
    return [];
  }

  try {
    // Get all users with active location sharing
    const activeUsers = await db.select().from(users).where(
      eq(users.isShareLocationActive, true)
    );

    // If no reference location provided, return all active users
    if (!latitude || !longitude) {
      return activeUsers.filter(u => u.latitude !== null && u.longitude !== null);
    }

    // Filter by distance if reference location provided
    const nearby = activeUsers.filter(user => {
      if (user.latitude === null || user.longitude === null) return false;
      const distance = calculateDistance(
        latitude,
        longitude,
        user.latitude,
        user.longitude
      );
      return distance <= radiusKm;
    });

    return nearby;
  } catch (error) {
    console.error("[Database] Failed to get active walkers:", error);
    return [];
  }
}

// Get user by email (for password-based auth)
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by email: database not available");
    return undefined;
  }

  try {
    const { eq } = await import("drizzle-orm");
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get user by email:", error);
    return undefined;
  }
}

// Create user with password (for email-based signup)
export async function createUserWithPassword(data: {
  email: string;
  hashedPassword: string;
  name: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.insert(users).values({
      email: data.email,
      hashedPassword: data.hashedPassword,
      name: data.name,
      openId: `email_${data.email}`, // Unique identifier for email-based users
      loginMethod: "email",
      role: "user",
      lastSignedIn: new Date(),
    } as InsertUser);

    // Get the created user
    return await getUserByEmail(data.email);
  } catch (error) {
    console.error("[Database] Failed to create user with password:", error);
    throw error;
  }
}

// Get walkers filtered by dog breed and size
export async function getWalkersByFilters(options: {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  breed?: string;
  size?: string;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get walkers by filters: database not available");
    return [];
  }

  try {
    const { latitude, longitude, radiusKm = 10, breed, size } = options;

    // Get all users with active location sharing
    let activeUsers = await db.select().from(users).where(
      eq(users.isShareLocationActive, true)
    );

    // Filter by distance if reference location provided
    if (latitude && longitude) {
      activeUsers = activeUsers.filter(user => {
        if (user.latitude === null || user.longitude === null) return false;
        const distance = calculateDistance(
          latitude,
          longitude,
          user.latitude,
          user.longitude
        );
        return distance <= radiusKm;
      });
    }

    // Filter by breed and size if provided
    if (breed || size) {
      const pool = getPool();
      if (!pool) {
        console.warn("[Database] Cannot filter by breed/size: pool not available");
        return activeUsers;
      }

      const userIds = activeUsers.map(u => u.id);
      if (userIds.length === 0) return [];

      let query = `
        SELECT DISTINCT u.id FROM users u
        JOIN dogs d ON u.id = d.userId
        WHERE u.id IN (${userIds.map(() => '?').join(',')})
      `;
      const params: any[] = [...userIds];

      if (breed) {
        query += ` AND d.breed = ?`;
        params.push(breed);
      }

      if (size) {
        query += ` AND d.size = ?`;
        params.push(size);
      }

      const [rows] = await pool.query(query, params);
      const filteredUserIds = (rows as any[]).map(r => r.id);

      return activeUsers.filter(u => filteredUserIds.includes(u.id));
    }

    return activeUsers;
  } catch (error) {
    console.error("[Database] Failed to get walkers by filters:", error);
    return [];
  }
}


// Create a review
export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.insert(reviews).values(data);
    return result;
  } catch (error) {
    console.error("[Database] Failed to create review:", error);
    throw error;
  }
}

// Get reviews for a user (received reviews)
export async function getReviewsForUser(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get reviews: database not available");
    return [];
  }

  try {
    const result = await db.select().from(reviews).where(eq(reviews.reviewedId, userId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get reviews:", error);
    return [];
  }
}

// Get average rating for a user
export async function getAverageRating(userId: number) {
  const pool = getPool();
  if (!pool) {
    console.warn("[Database] Cannot get average rating: pool not available");
    return 0;
  }

  try {
    const [rows] = await pool.query(
      "SELECT AVG(rating) as avg_rating FROM reviews WHERE reviewedId = ?",
      [userId]
    );
    const result = rows as any[];
    return result[0]?.avg_rating || 0;
  } catch (error) {
    console.error("[Database] Failed to get average rating:", error);
    return 0;
  }
}

// Create verification request
export async function createVerification(data: InsertVerification) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.insert(verifications).values(data);
    return result;
  } catch (error) {
    console.error("[Database] Failed to create verification:", error);
    throw error;
  }
}

// Get verification for user
export async function getVerificationForUser(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get verification: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(verifications).where(eq(verifications.userId, userId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get verification:", error);
    return undefined;
  }
}

// Update verification status
export async function updateVerificationStatus(
  userId: number,
  status: "pending" | "approved" | "rejected",
  rejectionReason?: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const updateData: any = {
      status,
    };
    if (status === "approved") {
      updateData.verifiedAt = new Date();
    }
    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const result = await db.update(verifications)
      .set(updateData)
      .where(eq(verifications.userId, userId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to update verification:", error);
    throw error;
  }
}

export async function migrateDatabase() {
  const pool = getPool();
  if (!pool) return;

  try {
    console.log("[Database] Running migrations for monetization/payments...");

    // 1. Alter users table columns if they do not exist
    try {
      await pool.execute("ALTER TABLE users ADD COLUMN bypassPaymentLimits BOOLEAN NOT NULL DEFAULT FALSE");
      console.log("[Database] Added column bypassPaymentLimits to users table.");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME' && !e.message?.includes('duplicate column')) {
        console.warn("[Database] Warning adding bypassPaymentLimits:", e.message || e);
      }
    }

    try {
      await pool.execute("ALTER TABLE users ADD COLUMN superLikeCredits INT NOT NULL DEFAULT 0");
      console.log("[Database] Added column superLikeCredits to users table.");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME' && !e.message?.includes('duplicate column')) {
        console.warn("[Database] Warning adding superLikeCredits:", e.message || e);
      }
    }

    try {
      await pool.execute("ALTER TABLE users ADD COLUMN swipeLimitUntil TIMESTAMP NULL DEFAULT NULL");
      console.log("[Database] Added column swipeLimitUntil to users table.");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME' && !e.message?.includes('duplicate column')) {
        console.warn("[Database] Warning adding swipeLimitUntil:", e.message || e);
      }
    }

    try {
      await pool.execute("ALTER TABLE users ADD COLUMN dogsittingFriendly BOOLEAN NOT NULL DEFAULT FALSE");
      console.log("[Database] Added column dogsittingFriendly to users table.");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME' && !e.message?.includes('duplicate column')) {
        console.warn("[Database] Warning adding dogsittingFriendly:", e.message || e);
      }
    }

    try {
      await pool.execute("ALTER TABLE users MODIFY COLUMN dogSitterStatus ENUM('pending', 'approved', 'rejected', 'blocked') DEFAULT 'pending'");
      console.log("[Database] Altered users table dogSitterStatus column to support 'blocked'.");
    } catch (e: any) {
      console.warn("[Database] Warning modifying dogSitterStatus enum:", e.message || e);
    }

    // 2. Create payments table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
        packageType VARCHAR(64) NOT NULL,
        paymentMethod VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'completed',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    console.log("[Database] Payments table checked/created.");

    // 3. Create favorites table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        targetUserId INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE KEY unique_user_target (userId, targetUserId)
      )
    `);
    console.log("[Database] Favorites table checked/created.");

    // 4. Create blocks table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS blocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        targetUserId INT NOT NULL,
        type VARCHAR(16) NOT NULL DEFAULT 'permanent',
        expiresAt TIMESTAMP NULL DEFAULT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE KEY unique_user_block (userId, targetUserId)
      )
    `);
    console.log("[Database] Blocks table checked/created.");

    // Alter blocks table if it exists but is missing type or expiresAt
    try {
      await pool.execute("ALTER TABLE blocks ADD COLUMN type VARCHAR(16) NOT NULL DEFAULT 'permanent'");
      console.log("[Database] Added column type to blocks table.");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME' && !e.message?.includes('duplicate column')) {
        console.warn("[Database] Warning adding type to blocks:", e.message || e);
      }
    }

    try {
      await pool.execute("ALTER TABLE blocks ADD COLUMN expiresAt TIMESTAMP NULL DEFAULT NULL");
      console.log("[Database] Added column expiresAt to blocks table.");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME' && !e.message?.includes('duplicate column')) {
        console.warn("[Database] Warning adding expiresAt to blocks:", e.message || e);
      }
    }

    // 5. Add plan column to users if not exists
    try {
      await pool.execute("ALTER TABLE users ADD COLUMN plan VARCHAR(32) NOT NULL DEFAULT 'free'");
      console.log("[Database] Added column plan to users table.");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME' && !e.message?.includes('duplicate column')) {
        console.warn("[Database] Warning adding plan to users:", e.message || e);
      }
    }

    // 6. Create plan_settings table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS plan_settings (
        plan VARCHAR(32) PRIMARY KEY,
        maxSwipesPerDay INT NOT NULL DEFAULT 10,
        maxFavoritesPerDay INT NOT NULL DEFAULT 1,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      )
    `);
    console.log("[Database] Plan settings table checked/created.");

    // Seed default plans
    await pool.execute(`
      INSERT INTO plan_settings (plan, maxSwipesPerDay, maxFavoritesPerDay, price) VALUES
      ('free', 10, 1, 0.00),
      ('premium', -1, 999, 4.99),
      ('vip', -1, 999, 19.99)
      ON DUPLICATE KEY UPDATE 
        maxSwipesPerDay = VALUES(maxSwipesPerDay), 
        maxFavoritesPerDay = VALUES(maxFavoritesPerDay), 
        price = VALUES(price)
    `);
    console.log("[Database] Default plan settings seeded.");

    // 7. Create events table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organizerId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        eventType VARCHAR(128) NOT NULL,
        location VARCHAR(500) NOT NULL,
        latitude DOUBLE NOT NULL,
        longitude DOUBLE NOT NULL,
        eventDate DATETIME NOT NULL,
        duration INT NOT NULL DEFAULT 60,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_events_date (eventDate),
        INDEX idx_events_org (organizerId)
      )
    `);
    console.log("[Database] Events table checked/created.");

    // 8. Create event_participants table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        eventId INT NOT NULL,
        userId INT NOT NULL,
        joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE KEY unique_event_user (eventId, userId)
      )
    `);
    console.log("[Database] Event participants table checked/created.");

    // 9. Create lost_dogs table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS lost_dogs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        dogId INT,
        name VARCHAR(255) NOT NULL,
        breed VARCHAR(255),
        age INT,
        description TEXT NOT NULL,
        lostDate DATETIME NOT NULL,
        lostLocation VARCHAR(500) NOT NULL,
        latitude DOUBLE NOT NULL,
        longitude DOUBLE NOT NULL,
        reward VARCHAR(255),
        contactPhone VARCHAR(50),
        status VARCHAR(32) NOT NULL DEFAULT 'lost',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    console.log("[Database] Lost dogs table checked/created.");

    // 10. Create sightings table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS sightings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lostDogId INT NOT NULL,
        userId INT NOT NULL,
        location VARCHAR(500) NOT NULL,
        latitude DOUBLE NOT NULL,
        longitude DOUBLE NOT NULL,
        sightingDate DATETIME NOT NULL,
        description TEXT NOT NULL,
        confidence VARCHAR(32) NOT NULL DEFAULT 'likely',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    console.log("[Database] Sightings table checked/created.");

  } catch (error) {
    console.error("[Database] Migration failed:", error);
  }
}

export async function healStuckMatches() {
  const pool = getPool();
  if (!pool) return;

  try {
    // Run migrations on startup
    await migrateDatabase();

    console.log("[Database] Running self-healing check for stuck matches...");
    
    // Find all pairs (user A, user B) who have both swiped liked: true,
    // but no corresponding match exists in the matches table.
    const query = `
      SELECT s1.userId as userA, s1.targetUserId as userB
      FROM swipes s1
      JOIN swipes s2 ON s1.userId = s2.targetUserId AND s1.targetUserId = s2.userId
      LEFT JOIN matches m ON 
        (m.userId1 = s1.userId AND m.userId2 = s1.targetUserId) OR
        (m.userId1 = s1.targetUserId AND m.userId2 = s1.userId)
      WHERE s1.liked = 1 AND s2.liked = 1 AND m.id IS NULL
    `;
    
    const [stuckSwipes] = await pool.execute(query);
    const pairs = stuckSwipes as Array<{ userA: number; userB: number }>;
    
    if (pairs.length > 0) {
      console.log(`[Database] Found ${pairs.length} stuck mutual likes. Self-healing them...`);
      for (const pair of pairs) {
        // Double-check to avoid duplicates
        const checkQuery = "SELECT id FROM matches WHERE (userId1 = ? AND userId2 = ?) OR (userId1 = ? AND userId2 = ?)";
        const [existing] = await pool.execute(checkQuery, [pair.userA, pair.userB, pair.userB, pair.userA]);
        if ((existing as any[]).length === 0) {
          console.log(`[Database] Creating missing match between User ${pair.userA} and User ${pair.userB}`);
          const insertQuery = "INSERT INTO matches (userId1, userId2, compatibilityScore) VALUES (?, ?, ?)";
          await pool.execute(insertQuery, [pair.userA, pair.userB, 50.0]);
        }
      }
      console.log("[Database] Self-healing completed.");
    } else {
      console.log("[Database] No stuck matches found.");
    }
  } catch (error) {
    console.error("[Database] Error during self-healing matches check:", error);
  }
}

export async function getSwipedUserIds(userId: number): Promise<number[]> {
  const pool = getPool();
  if (!pool) return [];
  try {
    const query = "SELECT targetUserId FROM swipes WHERE userId = ?";
    const [rows] = await pool.execute(query, [userId]);
    logger.database(query);
    return (rows as any[]).map(r => Number(r.targetUserId));
  } catch (error: any) {
    logger.database("SELECT targetUserId FROM swipes WHERE userId = ?", error?.message || String(error));
    console.error("[Database] Failed to get swiped user ids:", error);
    return [];
  }
}

export async function getDailySwipeCount(userId: number): Promise<number> {
  const pool = getPool();
  if (!pool) return 0;
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM swipes WHERE userId = ? AND createdAt >= CURDATE()`,
      [userId]
    );
    return Number((rows as any[])[0]?.count ?? 0);
  } catch (error) {
    console.error("[Database] Failed to get daily swipe count:", error);
    return 0;
  }
}

export async function getDailyFavoriteCount(userId: number): Promise<number> {
  const pool = getPool();
  if (!pool) return 0;
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM favorites WHERE userId = ? AND createdAt >= CURDATE()`,
      [userId]
    );
    return Number((rows as any[])[0]?.count ?? 0);
  } catch (error) {
    console.error("[Database] Failed to get daily favorite count:", error);
    return 0;
  }
}

export async function getActiveDiscussionsCount(userId: number): Promise<number> {
  const pool = getPool();
  if (!pool) return 0;
  try {
    const query = `
      SELECT COUNT(DISTINCT m.id) as count
      FROM matches m
      JOIN messages msg ON m.id = msg.matchId
      WHERE m.userId1 = ? OR m.userId2 = ?
    `;
    const [rows] = await pool.execute(query, [userId, userId]);
    return Number((rows as any[])[0]?.count ?? 0);
  } catch (error) {
    console.error("[Database] Failed to get active discussions count:", error);
    return 0;
  }
}

export async function usersAreMatched(userId1: number, userId2: number): Promise<boolean> {
  const match1 = await getMatch(userId1, userId2);
  const match2 = await getMatch(userId2, userId1);
  return !!(match1 || match2);
}

export async function getPublicUserProfile(viewerId: number, targetUserId: number) {
  if (viewerId === targetUserId) {
    const self = await getUserById(viewerId);
    if (!self) return undefined;
    const selfDogs = await getDogsByUserId(viewerId);
    return {
      id: self.id,
      name: self.name,
      age: self.age,
      bio: self.bio,
      profilePhotoUrl: self.profilePhotoUrl,
      interests: self.interests,
      walkingHabits: self.walkingHabits,
      whatISeek: self.whatISeek,
      dogs: selfDogs,
    };
  }

  const isMatched = await usersAreMatched(viewerId, targetUserId);
  const hasSwiped = await getSwipe(viewerId, targetUserId);
  const isFav = await isFavorite(viewerId, targetUserId);

  if (!isMatched && !hasSwiped && !isFav) {
    return undefined;
  }

  const target = await getUserById(targetUserId);
  if (!target) return undefined;

  const targetDogs = await getDogsByUserId(targetUserId);
  return {
    id: target.id,
    name: target.name,
    age: target.age,
    bio: target.bio,
    profilePhotoUrl: target.profilePhotoUrl,
    interests: target.interests,
    walkingHabits: target.walkingHabits,
    whatISeek: target.whatISeek,
    dogs: targetDogs,
    isMatched,
  };
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;

  const userList = await db.select().from(users);
  const dogList = await db.select().from(dogs);
  const swipeList = await db.select().from(swipes);
  const matchList = await db.select().from(matches);
  const messageList = await db.select().from(messages);
  const verificationList = await db.select().from(verifications);

  const totalUsers = userList.length;
  const totalDogs = dogList.length;
  const totalSwipes = swipeList.length;
  const totalMatches = matchList.length;
  const totalMessages = messageList.length;

  const likesCount = swipeList.filter(s => s.liked).length;
  const passesCount = swipeList.filter(s => !s.liked).length;
  const likeRate = totalSwipes > 0 ? (likesCount / totalSwipes) * 100 : 0;
  const matchRate = totalSwipes > 0 ? (totalMatches * 2 / totalSwipes) * 100 : 0;

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const activeUsers24h = userList.filter(u => u.lastSignedIn && new Date(u.lastSignedIn) > oneDayAgo).length;

  const pendingVerifications = verificationList.filter(v => v.status === "pending").map(v => {
    const user = userList.find(u => u.id === v.userId);
    return {
      ...v,
      userName: user?.name || "Inconnu",
      userEmail: user?.email || "Inconnu"
    };
  });

  const activeWalkersCount = userList.filter(u => u.isShareLocationActive).length;

  const pool = getPool();
  let totalRevenue = 0.0;
  let totalSales = 0;
  let packageStats = { extra_favorites: 0, unlimited_swipes: 0, premium_pass: 0 };
  let paymentMethodStats = { card: 0, google_pay: 0, apple_pay: 0 };

  if (pool) {
    try {
      const [paymentsRows] = await pool.execute("SELECT amount, packageType, paymentMethod FROM payments WHERE status = 'completed'");
      const paymentsList = (paymentsRows as any[]) || [];
      totalSales = paymentsList.length;
      paymentsList.forEach(p => {
        totalRevenue += parseFloat(p.amount || 0);
        if (p.packageType in packageStats) {
          packageStats[p.packageType as keyof typeof packageStats]++;
        }
        if (p.paymentMethod in paymentMethodStats) {
          paymentMethodStats[p.paymentMethod as keyof typeof paymentMethodStats]++;
        }
      });
    } catch (err) {
      console.error("[Database] Failed to get payment statistics in admin stats:", err);
    }
  }

  return {
    totalUsers,
    totalDogs,
    totalSwipes,
    totalMatches,
    totalMessages,
    likesCount,
    passesCount,
    likeRate,
    matchRate,
    activeUsers24h,
    activeWalkersCount,
    pendingVerifications,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalSales,
    packageStats,
    paymentMethodStats,
  };
}

export async function getAdminUsers() {
  const db = await getDb();
  if (!db) return [];

  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
  const allDogs = await db.select().from(dogs);
  const allVerifications = await db.select().from(verifications);

  return allUsers.map(user => {
    const userDogs = allDogs.filter(d => d.userId === user.id);
    const userVerif = allVerifications.find(v => v.userId === user.id);
    return {
      ...user,
      dogs: userDogs,
      verificationStatus: userVerif ? userVerif.status : "none",
      verificationUrl: userVerif ? userVerif.photoUrl : null,
      verificationRejectionReason: userVerif ? userVerif.rejectionReason : null,
    };
  });
}

export async function deleteUserAdmin(userId: number) {
  const db = await getDb();
  if (!db) return false;

  await db.delete(dogs).where(eq(dogs.userId, userId));
  await db.delete(swipes).where(eq(swipes.userId, userId));
  await db.delete(swipes).where(eq(swipes.targetUserId, userId));
  await db.delete(matches).where(sql`userId1 = ${userId} OR userId2 = ${userId}`);
  await db.delete(messages).where(eq(messages.senderId, userId));
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(reviews).where(sql`reviewerId = ${userId} OR reviewedId = ${userId}`);
  await db.delete(verifications).where(eq(verifications.userId, userId));
  await db.delete(users).where(eq(users.id, userId));

  return true;
}

export async function recordPayment(userId: number, amount: number, packageType: string, paymentMethod: string) {
  const pool = getPool();
  if (!pool) return undefined;
  try {
    const [result] = await pool.execute(
      `INSERT INTO payments (userId, amount, packageType, paymentMethod) VALUES (?, ?, ?, ?)`,
      [userId, amount, packageType, paymentMethod]
    );
    return result;
  } catch (error) {
    console.error("[Database] Failed to record payment:", error);
    return undefined;
  }
}

export async function getPaymentsForUser(userId: number) {
  const pool = getPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM payments WHERE userId = ? ORDER BY createdAt DESC`,
      [userId]
    );
    return (rows as any[]) || [];
  } catch (error) {
    console.error("[Database] Failed to get user payments:", error);
    return [];
  }
}

export async function getAdminPayments() {
  const pool = getPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.execute(
      `SELECT p.*, u.name as userName, u.email as userEmail 
       FROM payments p 
       JOIN users u ON p.userId = u.id 
       ORDER BY p.createdAt DESC`
    );
    return (rows as any[]) || [];
  } catch (error) {
    console.error("[Database] Failed to get admin payments:", error);
    return [];
  }
}

export async function togglePaymentBypass(userId: number, bypass: boolean) {
  const db = await getDb();
  if (!db) return false;
  await db.update(users).set({ bypassPaymentLimits: bypass }).where(eq(users.id, userId));
  return true;
}

export async function addSuperLikeCredits(userId: number, credits: number) {
  const db = await getDb();
  if (!db) return false;
  const user = await getUserById(userId);
  if (!user) return false;
  await db.update(users).set({ superLikeCredits: (user.superLikeCredits || 0) + credits }).where(eq(users.id, userId));
  return true;
}

export async function addSwipeLimitExtension(userId: number, hours: number) {
  const db = await getDb();
  if (!db) return false;
  const now = new Date();
  const limitUntil = new Date(now.getTime() + hours * 60 * 60 * 1000);
  await db.update(users).set({ swipeLimitUntil: limitUntil }).where(eq(users.id, userId));
  return true;
}

let _preprodPool: mysql.Pool | null = null;
let _prodPool: mysql.Pool | null = null;

export function getDbPoolForAdmin(target: "preprod" | "prod"): mysql.Pool {
  if (target === "preprod") {
    if (!_preprodPool) {
      const url = process.env.DATABASE_URL || "mysql://root@127.0.0.1:3306/doggle?multipleStatements=true";
      _preprodPool = mysql.createPool(url);
    }
    return _preprodPool;
  } else {
    if (!_prodPool) {
      const rawUrl = process.env.VPS_MYSQL_URL || "mysql://doggle_user:doggle2026_prod_pass@127.0.0.1:3306/doggle?multipleStatements=true";
      _prodPool = mysql.createPool(rawUrl);
    }
    return _prodPool;
  }
}

const ALLOWED_TABLES = ["users", "dogs", "swipes", "matches", "messages", "notifications", "reviews", "verifications", "payments"];

function validateTableName(table: string) {
  if (!ALLOWED_TABLES.includes(table)) {
    throw new Error(`Access denied: Invalid table name "${table}"`);
  }
}

async function validateTableColumns(target: "preprod" | "prod", table: string, columns: string[]) {
  const schema = await adminGetTableSchema(target, table);
  const validColumns = schema.map(c => c.Field);
  for (const col of columns) {
    if (!validColumns.includes(col)) {
      throw new Error(`Access denied: Invalid column "${col}" for table "${table}"`);
    }
  }
}

export async function adminListTables(target: "preprod" | "prod"): Promise<string[]> {
  const pool = getDbPoolForAdmin(target);
  const [rows] = await pool.query("SHOW TABLES");
  const list = rows as any[];
  const tableNames = list.map(r => Object.values(r)[0] as string);
  // Return only allowlisted tables to prevent leakage of other system tables
  return tableNames.filter(name => ALLOWED_TABLES.includes(name));
}

export async function adminGetTableSchema(target: "preprod" | "prod", table: string): Promise<any[]> {
  validateTableName(table);
  const pool = getDbPoolForAdmin(target);
  const sanitizedTable = table.replace(/[^a-zA-Z0-9_]/g, "");
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${sanitizedTable}\``);
  return rows as any[];
}

export async function adminGetTableRows(target: "preprod" | "prod", table: string): Promise<any[]> {
  validateTableName(table);
  const pool = getDbPoolForAdmin(target);
  const sanitizedTable = table.replace(/[^a-zA-Z0-9_]/g, "");
  const [rows] = await pool.query(`SELECT * FROM \`${sanitizedTable}\` LIMIT 200`);
  return rows as any[];
}

export async function adminInsertTableRow(target: "preprod" | "prod", table: string, rowData: Record<string, any>): Promise<any> {
  validateTableName(table);
  const cols = Object.keys(rowData);
  await validateTableColumns(target, table, cols);

  const pool = getDbPoolForAdmin(target);
  const sanitizedTable = table.replace(/[^a-zA-Z0-9_]/g, "");
  
  const columns = cols.map(c => `\`${c.replace(/[^a-zA-Z0-9_]/g, "")}\``).join(", ");
  const values = Object.values(rowData);
  const placeholders = values.map(() => "?").join(", ");

  const [result] = await pool.query(
    `INSERT INTO \`${sanitizedTable}\` (${columns}) VALUES (${placeholders})`,
    values
  );
  return result;
}

export async function adminUpdateTableRow(
  target: "preprod" | "prod",
  table: string,
  primaryKey: string,
  primaryValue: any,
  rowData: Record<string, any>
): Promise<any> {
  validateTableName(table);
  const cols = Object.keys(rowData);
  await validateTableColumns(target, table, [...cols, primaryKey]);

  const pool = getDbPoolForAdmin(target);
  const sanitizedTable = table.replace(/[^a-zA-Z0-9_]/g, "");
  const sanitizedKey = primaryKey.replace(/[^a-zA-Z0-9_]/g, "");

  const sets: string[] = [];
  const values: any[] = [];

  Object.entries(rowData).forEach(([col, val]) => {
    sets.push(`\`${col.replace(/[^a-zA-Z0-9_]/g, "")}\` = ?`);
    values.push(val);
  });
  values.push(primaryValue);

  const [result] = await pool.query(
    `UPDATE \`${sanitizedTable}\` SET ${sets.join(", ")} WHERE \`${sanitizedKey}\` = ?`,
    values
  );
  return result;
}

export async function adminDeleteTableRowCascade(
  target: "preprod" | "prod",
  table: string,
  primaryKey: string,
  primaryValue: any
): Promise<any> {
  validateTableName(table);
  await validateTableColumns(target, table, [primaryKey]);

  const pool = getDbPoolForAdmin(target);
  const sanitizedTable = table.replace(/[^a-zA-Z0-9_]/g, "");
  const sanitizedKey = primaryKey.replace(/[^a-zA-Z0-9_]/g, "");

  if (sanitizedTable === "users") {
    await pool.query("DELETE FROM verifications WHERE userId = ?", [primaryValue]);
    await pool.query("DELETE FROM dogs WHERE userId = ?", [primaryValue]);
    await pool.query("DELETE FROM swipes WHERE userId = ? OR targetUserId = ?", [primaryValue, primaryValue]);
    await pool.query("DELETE FROM messages WHERE senderId = ? OR recipientId = ?", [primaryValue, primaryValue]);
    await pool.query("DELETE FROM matches WHERE user1Id = ? OR user2Id = ?", [primaryValue, primaryValue]);
    await pool.query("DELETE FROM payments WHERE userId = ?", [primaryValue]);
  }

  const [result] = await pool.query(
    `DELETE FROM \`${sanitizedTable}\` WHERE \`${sanitizedKey}\` = ?`,
    [primaryValue]
  );
  return result;
}

// Plan Settings Helpers
export async function getPlanSettings(): Promise<any[]> {
  const pool = getPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.execute(`SELECT * FROM plan_settings`);
    return rows as any[];
  } catch (error) {
    console.error("[Database] Failed to get plan settings:", error);
    return [];
  }
}

export async function updatePlanSettings(
  plan: string,
  maxSwipesPerDay: number,
  maxFavoritesPerDay: number,
  price: number
) {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(
      `INSERT INTO plan_settings (plan, maxSwipesPerDay, maxFavoritesPerDay, price)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         maxSwipesPerDay = VALUES(maxSwipesPerDay),
         maxFavoritesPerDay = VALUES(maxFavoritesPerDay),
         price = VALUES(price)`,
      [plan, maxSwipesPerDay, maxFavoritesPerDay, price]
    );
    return true;
  } catch (error) {
    console.error("[Database] Failed to update plan setting:", error);
    return false;
  }
}

export async function getPlanConfig(plan: string): Promise<any> {
  const pool = getPool();
  if (!pool) return { maxSwipesPerDay: 10, maxFavoritesPerDay: 1 };
  try {
    const [rows] = await pool.execute(
      `SELECT maxSwipesPerDay, maxFavoritesPerDay FROM plan_settings WHERE plan = ?`,
      [plan]
    );
    const results = rows as any[];
    if (results.length > 0) {
      return results[0];
    }
  } catch (error) {
    console.error("[Database] Failed to get plan config:", error);
  }
  // Fallbacks based on plan name
  if (plan === "premium") {
    return { maxSwipesPerDay: 20, maxFavoritesPerDay: 2 };
  } else if (plan === "vip") {
    return { maxSwipesPerDay: -1, maxFavoritesPerDay: 5 };
  }
  return { maxSwipesPerDay: 10, maxFavoritesPerDay: 1 };
}

// ============ BOARDING (DOG-SITTER) HELPERS ============

export async function registerAsDogSitter(userId: number, data: {
  dogSitterBio?: string;
  dogSitterRates?: { night?: number; halfDay?: number; walk?: number };
  dogSitterMaxDogs?: number;
}) {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(
      `UPDATE users SET isDogSitter = TRUE, dogSitterBio = ?, dogSitterRates = ?, dogSitterMaxDogs = ?, dogSitterStatus = 'pending' WHERE id = ?`,
      [
        data.dogSitterBio ?? null,
        data.dogSitterRates ? JSON.stringify(data.dogSitterRates) : null,
        data.dogSitterMaxDogs ?? 1,
        userId,
      ]
    );
    return true;
  } catch (error) {
    console.error("[Database] Failed to register as dog sitter:", error);
    return false;
  }
}

export async function updateDogSitterProfile(userId: number, data: {
  dogSitterBio?: string;
  dogSitterRates?: { night?: number; halfDay?: number; walk?: number };
  dogSitterAvailable?: boolean;
  dogSitterMaxDogs?: number;
}) {
  const pool = getPool();
  if (!pool) return false;
  try {
    const sets: string[] = [];
    const params: any[] = [];
    if (data.dogSitterBio !== undefined) { sets.push("dogSitterBio = ?"); params.push(data.dogSitterBio); }
    if (data.dogSitterRates !== undefined) { sets.push("dogSitterRates = ?"); params.push(JSON.stringify(data.dogSitterRates)); }
    if (data.dogSitterAvailable !== undefined) { sets.push("dogSitterAvailable = ?"); params.push(data.dogSitterAvailable ? 1 : 0); }
    if (data.dogSitterMaxDogs !== undefined) { sets.push("dogSitterMaxDogs = ?"); params.push(data.dogSitterMaxDogs); }
    if (sets.length === 0) return true;
    params.push(userId);
    await pool.execute(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);
    return true;
  } catch (error) {
    console.error("[Database] Failed to update dog sitter profile:", error);
    return false;
  }
}

export async function toggleDogForBoarding(dogId: number, userId: number, available: boolean) {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(
      `UPDATE dogs SET availableForBoarding = ? WHERE id = ? AND userId = ?`,
      [available ? 1 : 0, dogId, userId]
    );
    return true;
  } catch (error) {
    console.error("[Database] Failed to toggle dog for boarding:", error);
    return false;
  }
}

export async function getAvailableDogsForBoarding(sitterId: number) {
  const pool = getPool();
  if (!pool) return [];
  try {
    // Dogs marked as available, owned by someone who is NOT the sitter
    const [rows] = await pool.execute(
      `SELECT d.*, u.name as ownerName, u.profilePhotoUrl as ownerPhoto, u.phoneNumber as ownerPhone,
              u.latitude as ownerLat, u.longitude as ownerLng, u.bio as ownerBio
       FROM dogs d
       JOIN users u ON d.userId = u.id
       WHERE d.availableForBoarding = TRUE AND d.userId != ?
       ORDER BY d.updatedAt DESC`,
      [sitterId]
    );
    return rows as any[];
  } catch (error) {
    console.error("[Database] Failed to get available dogs for boarding:", error);
    return [];
  }
}

export async function createBoardingRequest(data: {
  dogId: number;
  ownerId: number;
  sitterId: number;
  startDate: Date;
  endDate: Date;
  message?: string;
  totalPrice?: number;
  ownerPhone?: string;
}) {
  const pool = getPool();
  if (!pool) return null;
  try {
    const [result] = await pool.execute(
      `INSERT INTO boarding_requests (dogId, ownerId, sitterId, startDate, endDate, message, totalPrice, ownerPhone, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [data.dogId, data.ownerId, data.sitterId, data.startDate, data.endDate, data.message ?? null, data.totalPrice ?? null, data.ownerPhone ?? null]
    );
    return (result as any).insertId as number;
  } catch (error) {
    console.error("[Database] Failed to create boarding request:", error);
    return null;
  }
}

export async function getBoardingRequestsForSitter(sitterId: number) {
  const pool = getPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.execute(
      `SELECT br.*, d.name as dogName, d.breed as dogBreed, d.age as dogAge, d.photoUrls as dogPhotoUrls,
              u.name as ownerName, u.profilePhotoUrl as ownerPhoto, u.phoneNumber as ownerPhone
       FROM boarding_requests br
       JOIN dogs d ON br.dogId = d.id
       JOIN users u ON br.ownerId = u.id
       WHERE br.sitterId = ?
       ORDER BY br.createdAt DESC`,
      [sitterId]
    );
    return rows as any[];
  } catch (error) {
    console.error("[Database] Failed to get boarding requests for sitter:", error);
    return [];
  }
}

export async function getBoardingRequestsForOwner(ownerId: number) {
  const pool = getPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.execute(
      `SELECT br.*, d.name as dogName, d.breed as dogBreed, d.photoUrls as dogPhotoUrls,
              u.name as sitterName, u.profilePhotoUrl as sitterPhoto, u.phoneNumber as sitterPhone,
              u.dogSitterRates as sitterRates, u.dogSitterBio as sitterBio
       FROM boarding_requests br
       JOIN dogs d ON br.dogId = d.id
       JOIN users u ON br.sitterId = u.id
       WHERE br.ownerId = ?
       ORDER BY br.createdAt DESC`,
      [ownerId]
    );
    return rows as any[];
  } catch (error) {
    console.error("[Database] Failed to get boarding requests for owner:", error);
    return [];
  }
}

export async function respondToBoardingRequest(requestId: number, sitterId: number, status: 'accepted' | 'rejected') {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(
      `UPDATE boarding_requests SET status = ? WHERE id = ? AND sitterId = ?`,
      [status, requestId, sitterId]
    );
    return true;
  } catch (error) {
    console.error("[Database] Failed to respond to boarding request:", error);
    return false;
  }
}

export async function completeBoardingRequest(requestId: number, sitterId: number) {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(
      `UPDATE boarding_requests SET status = 'completed' WHERE id = ? AND sitterId = ?`,
      [requestId, sitterId]
    );
    return true;
  } catch (error) {
    console.error("[Database] Failed to complete boarding request:", error);
    return false;
  }
}

export async function getActiveBoardingsForSitter(sitterId: number) {
  const pool = getPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.execute(
      `SELECT br.*, d.name as dogName, d.breed as dogBreed, d.age as dogAge, d.photoUrls as dogPhotoUrls,
              u.name as ownerName, u.phoneNumber as ownerPhone, u.profilePhotoUrl as ownerPhoto
       FROM boarding_requests br
       JOIN dogs d ON br.dogId = d.id
       JOIN users u ON br.ownerId = u.id
       WHERE br.sitterId = ? AND br.status = 'accepted' AND br.endDate >= NOW()
       ORDER BY br.startDate ASC`,
      [sitterId]
    );
    return rows as any[];
  } catch (error) {
    console.error("[Database] Failed to get active boardings:", error);
    return [];
  }
}

export async function updateDogSitterStatusAdmin(userId: number, status: 'approved' | 'rejected' | 'blocked') {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(
      `UPDATE users SET dogSitterStatus = ? WHERE id = ?`,
      [status, userId]
    );
    return true;
  } catch (error) {
    console.error("[Database] Failed to update dog sitter status:", error);
    return false;
  }
}

export async function getPendingDogSitters() {
  const pool = getPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, email, phoneNumber, dogSitterBio, dogSitterRates, dogSitterMaxDogs, dogSitterStatus, createdAt
       FROM users WHERE isDogSitter = TRUE AND dogSitterStatus = 'pending'
       ORDER BY createdAt DESC`
    );
    return rows as any[];
  } catch (error) {
    console.error("[Database] Failed to get pending dog sitters:", error);
    return [];
  }
}

export async function getAllDogSitters() {
  const pool = getPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, email, phoneNumber, dogSitterBio, dogSitterRates, dogSitterMaxDogs, dogSitterStatus, createdAt
       FROM users WHERE isDogSitter = TRUE
       ORDER BY createdAt DESC`
    );
    return rows as any[];
  } catch (error) {
    console.error("[Database] Failed to get all dog sitters:", error);
    return [];
  }
}

// ============ WALKING SERVICES HELPERS ============
export async function createWalkingService(userId: number, data: {
  title: string;
  description: string;
  pricePerWalk?: number;
  frequency?: "daily" | "weekly" | "biweekly" | "monthly";
  availableDays: string[];
}) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(walkingServices).values({
    userId,
    title: data.title,
    description: data.description,
    pricePerWalk: data.pricePerWalk ? String(data.pricePerWalk) : null,
    frequency: data.frequency || null,
    availableDays: data.availableDays,
  });

  return result[0].insertId;
}

export async function getNearbyWalkingServices(latitude: number, longitude: number, radiusKm: number = 10) {
  const connection = getPool();
  if (!connection) return [];

  try {
    const [services] = await connection.execute(
      `SELECT ws.*, u.name as providerName, u.profilePhotoUrl, u.latitude, u.longitude,
              (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + sin(radians(?)) * sin(radians(u.latitude)), -1), 1))) as distance
       FROM walking_services ws
       JOIN users u ON ws.userId = u.id
       WHERE u.latitude IS NOT NULL AND u.longitude IS NOT NULL
         AND (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + sin(radians(?)) * sin(radians(u.latitude)), -1), 1))) <= ?
       ORDER BY distance ASC`,
      [latitude, longitude, latitude, latitude, longitude, latitude, radiusKm]
    );
    return services || [];
  } catch (error) {
    console.error("[Database] Failed to get nearby walking services:", error);
    return [];
  }
}

export async function createWalkingBooking(userId: number, data: {
  serviceId: number;
  scheduledDate: Date;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(walkingBookings).values({
    userId,
    serviceId: data.serviceId,
    scheduledDate: data.scheduledDate,
    notes: data.notes || null,
  });

  return result[0].insertId;
}

export async function getWalkingBookingsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(walkingBookings)
    .where(eq(walkingBookings.userId, userId));
}

export async function rateWalkingBooking(bookingId: number, userId: number, rating: number, review?: string) {
  const db = await getDb();
  if (!db) return false;

  const result = await db.update(walkingBookings)
    .set({ rating, review: review || null })
    .where(and(eq(walkingBookings.id, bookingId), eq(walkingBookings.userId, userId)));

  return result[0].affectedRows > 0;
}

// ============ SPONSORSHIP HELPERS ============
export async function requestSponsorship(userId: number, reason: string, frequency: "weekly" | "biweekly" | "monthly") {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(sponsorships).values({
    userId,
    reason,
    frequency,
    status: "pending",
  });

  return result[0].insertId;
}

export async function getAvailableSponsors(latitude: number, longitude: number, radiusKm: number = 10) {
  const connection = getPool();
  if (!connection) return [];

  try {
    const [sits] = await connection.execute(
      `SELECT s.*, u.name as elderName, u.profilePhotoUrl, u.latitude, u.longitude,
              (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + sin(radians(?)) * sin(radians(u.latitude)), -1), 1))) as distance
       FROM sponsorships s
       JOIN users u ON s.userId = u.id
       WHERE s.status = 'pending' AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL
         AND (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + sin(radians(?)) * sin(radians(u.latitude)), -1), 1))) <= ?
       ORDER BY distance ASC`,
      [latitude, longitude, latitude, latitude, longitude, latitude, radiusKm]
    );
    return sits || [];
  } catch (error) {
    console.error("[Database] Failed to get available sponsors:", error);
    return [];
  }
}

export async function acceptSponsorship(sponsorshipId: number, sitterId: number) {
  const db = await getDb();
  if (!db) return false;

  const result = await db.update(sponsorships)
    .set({ sitterId, status: "accepted" })
    .where(eq(sponsorships.id, sponsorshipId));

  return result[0].affectedRows > 0;
}

export async function getMySponsorships(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(sponsorships)
    .where(eq(sponsorships.userId, userId));
}

export async function rateSponsorship(sponsorshipId: number, userId: number, rating: number, review?: string) {
  const db = await getDb();
  if (!db) return false;

  const result = await db.update(sponsorships)
    .set({ rating, review: review || null })
    .where(and(eq(sponsorships.id, sponsorshipId), eq(sponsorships.userId, userId)));

  return result[0].affectedRows > 0;
}

// ============ DOG FRIENDLY PLACES HELPERS ============
export async function createDogFriendlyPlace(data: {
  name: string;
  placeType: "park" | "beach" | "restaurant" | "hotel" | "other";
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
  osmId?: string;
  isDogsAllowed?: boolean;
  attributes?: any;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(dogFriendlyPlaces).values({
    name: data.name,
    placeType: data.placeType,
    latitude: String(data.latitude),
    longitude: String(data.longitude),
    address: data.address || null,
    description: data.description || null,
    osmId: data.osmId || null,
    isDogsAllowed: data.isDogsAllowed !== false,
    attributes: data.attributes || null,
  });

  return result[0].insertId;
}

export async function getNearbyDogFriendlyPlaces(latitude: number, longitude: number, radiusKm: number = 25) {
  const connection = getPool();
  if (!connection) return [];

  try {
    const [places] = await connection.execute(
      `SELECT dfp.*,
              (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(dfp.latitude)) * cos(radians(dfp.longitude) - radians(?)) + sin(radians(?)) * sin(radians(dfp.latitude)), -1), 1))) as distance
       FROM dog_friendly_places dfp
       WHERE (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(dfp.latitude)) * cos(radians(dfp.longitude) - radians(?)) + sin(radians(?)) * sin(radians(dfp.latitude)), -1), 1))) <= ?
       ORDER BY distance ASC`,
      [latitude, longitude, latitude, latitude, longitude, latitude, radiusKm]
    );
    return places || [];
  } catch (error) {
    console.error("[Database] Failed to get nearby dog friendly places:", error);
    return [];
  }
}

export async function getPlaceDetails(placeId: number) {
  const db = await getDb();
  if (!db) return null;

  const places = await db.select().from(dogFriendlyPlaces).where(eq(dogFriendlyPlaces.id, placeId));
  if (places.length === 0) return null;

  const reviewsList = await db.select().from(placeReviews).where(eq(placeReviews.placeId, placeId));
  const avgRating = reviewsList.length > 0
    ? reviewsList.reduce((acc, curr) => acc + curr.rating, 0) / reviewsList.length
    : 0;

  return {
    ...places[0],
    averageRating: parseFloat(avgRating.toFixed(1)),
    reviewsCount: reviewsList.length,
  };
}

export async function addPlaceReview(placeId: number, userId: number, rating: number, comment?: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(placeReviews).values({
    placeId,
    userId,
    rating,
    comment: comment || null,
  });

  return result[0].insertId;
}

export async function getPlaceReviews(placeId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(placeReviews).where(eq(placeReviews.placeId, placeId));
}

// ============ WALKS & GOALS HELPERS ============
export async function createWalk(userId: number, data: {
  distanceMeter: number;
  durationSecond: number;
  gpsPath: { lat: number; lng: number; timestamp: number }[];
}) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(walks).values({
    userId,
    distanceMeter: data.distanceMeter,
    durationSecond: data.durationSecond,
    gpsPath: data.gpsPath,
  });

  return result[0].insertId;
}

export async function getMyWalks(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(walks).where(eq(walks.userId, userId)).orderBy(desc(walks.createdAt));
}

export async function setOrUpdateGoal(userId: number, data: {
  goalType: "distance" | "duration";
  targetValue: number;
  period: "weekly" | "monthly";
}) {
  const db = await getDb();
  if (!db) return undefined;

  const now = new Date();
  const startDate = new Date();
  const endDate = new Date();

  if (data.period === "weekly") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    startDate.setHours(0, 0, 0, 0);

    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    endDate.setMonth(startDate.getMonth() + 1);
    endDate.setDate(0);
    endDate.setHours(23, 59, 59, 999);
  }

  // Delete existing goals for same type and period
  await db.delete(walkGoals).where(
    and(
      eq(walkGoals.userId, userId),
      eq(walkGoals.goalType, data.goalType),
      eq(walkGoals.period, data.period)
    )
  );

  const result = await db.insert(walkGoals).values({
    userId,
    goalType: data.goalType,
    targetValue: data.targetValue,
    currentValue: 0,
    period: data.period,
    startDate,
    endDate,
  });

  return result[0].insertId;
}

export async function getCurrentGoals(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const activeGoals = await db.select().from(walkGoals).where(eq(walkGoals.userId, userId));
  const userWalks = await db.select().from(walks).where(eq(walks.userId, userId));

  return activeGoals.map(goal => {
    const matchingWalks = userWalks.filter(walk => {
      const walkDate = new Date(walk.createdAt);
      return walkDate >= new Date(goal.startDate) && walkDate <= new Date(goal.endDate);
    });

    const sum = matchingWalks.reduce((acc, curr) => {
      return acc + (goal.goalType === "distance" ? curr.distanceMeter : curr.durationSecond);
    }, 0);

    return {
      ...goal,
      currentValue: sum,
    };
  });
}

// ============ DANGER ALERTS HELPERS ============
export async function createDangerAlert(userId: number, data: {
  dangerType: "cyanobacteria" | "hunting" | "poison_bait" | "stray_animal" | "other";
  latitude: number;
  longitude: number;
  description?: string;
  durationHours?: number;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const durationHours = data.durationHours || 24;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + durationHours);

  const result = await db.insert(dangerAlerts).values({
    userId,
    dangerType: data.dangerType,
    latitude: String(data.latitude),
    longitude: String(data.longitude),
    description: data.description || null,
    status: "active",
    expiresAt,
  });

  return result[0].insertId;
}

export async function getNearbyDangerAlerts(latitude: number, longitude: number, radiusKm: number = 5) {
  const connection = getPool();
  if (!connection) return [];

  try {
    const [alerts] = await connection.execute(
      `SELECT da.*,
              (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(da.latitude)) * cos(radians(da.longitude) - radians(?)) + sin(radians(?)) * sin(radians(da.latitude)), -1), 1))) as distance
       FROM danger_alerts da
       WHERE da.status = 'active' AND da.expiresAt > NOW()
         AND (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(da.latitude)) * cos(radians(da.longitude) - radians(?)) + sin(radians(?)) * sin(radians(da.latitude)), -1), 1))) <= ?
       ORDER BY distance ASC`,
      [latitude, longitude, latitude, latitude, longitude, latitude, radiusKm]
    );
    return alerts || [];
  } catch (error) {
    console.error("[Database] Failed to get nearby danger alerts:", error);
    return [];
  }
}

export async function resolveDangerAlert(alertId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;

  const result = await db.update(dangerAlerts)
    .set({ status: "resolved" })
    .where(and(eq(dangerAlerts.id, alertId), eq(dangerAlerts.userId, userId)));

  return result[0].affectedRows > 0;
}

export async function getNearbyUsersToNotify(latitude: number, longitude: number, radiusKm: number = 5) {
  const connection = getPool();
  if (!connection) return [];

  try {
    const [usersList] = await connection.execute(
      `SELECT u.id, u.name, u.phoneNumber, u.latitude, u.longitude,
              (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + sin(radians(?)) * sin(radians(u.latitude)), -1), 1))) as distance
       FROM users u
       WHERE u.latitude IS NOT NULL AND u.longitude IS NOT NULL AND u.phoneNumber IS NOT NULL
         AND (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + sin(radians(?)) * sin(radians(u.latitude)), -1), 1))) <= ?`,
      [latitude, longitude, latitude, latitude, longitude, latitude, radiusKm]
    );
    return usersList as any[] || [];
  } catch (error) {
    console.error("[Database] Failed to get nearby users to notify:", error);
    return [];
  }
}

// ============ PET HEALTH & VET APPOINTMENTS HELPERS ============

export async function canUserAccessPetHealth(dogId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;

  const [dog] = await db.select().from(dogs).where(eq(dogs.id, dogId));
  if (dog && dog.userId === userId) return true;

  const pool = getPool();
  if (pool) {
    try {
      const [rows] = await pool.execute(
        `SELECT id FROM boarding_requests
         WHERE dogId = ? AND sitterId = ? AND status IN ('accepted', 'completed')`,
        [dogId, userId]
      );
      if (Array.isArray(rows) && rows.length > 0) return true;
    } catch (err) {
      console.error("[Database] Failed to check dogsitter health access:", err);
    }
  }
  return false;
}

export async function upsertHealthRecord(dogId: number, data: {
  weight?: number;
  allergies?: string;
  medicalHistory?: string;
  treatmentInfo?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const existing = await db.select().from(petHealthRecords).where(eq(petHealthRecords.dogId, dogId));
  if (existing.length > 0) {
    await db.update(petHealthRecords)
      .set({
        weight: data.weight !== undefined ? String(data.weight) : undefined,
        allergies: data.allergies !== undefined ? data.allergies : undefined,
        medicalHistory: data.medicalHistory !== undefined ? data.medicalHistory : undefined,
        treatmentInfo: data.treatmentInfo !== undefined ? data.treatmentInfo : undefined,
      })
      .where(eq(petHealthRecords.dogId, dogId));
    return existing[0].id;
  } else {
    const result = await db.insert(petHealthRecords).values({
      dogId,
      weight: data.weight !== undefined ? String(data.weight) : null,
      allergies: data.allergies || null,
      medicalHistory: data.medicalHistory || null,
      treatmentInfo: data.treatmentInfo || null,
    });
    return result[0].insertId;
  }
}

export async function getHealthRecord(dogId: number) {
  const db = await getDb();
  if (!db) return null;

  const [record] = await db.select().from(petHealthRecords).where(eq(petHealthRecords.dogId, dogId));
  return record || null;
}

export async function addVaccine(dogId: number, data: {
  name: string;
  administeredDate: Date;
  nextBoosterDate: Date;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(petVaccines).values({
    dogId,
    name: data.name,
    administeredDate: data.administeredDate,
    nextBoosterDate: data.nextBoosterDate,
    status: "active",
  });
  return result[0].insertId;
}

export async function getVaccines(dogId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(petVaccines).where(eq(petVaccines.dogId, dogId)).orderBy(desc(petVaccines.nextBoosterDate));
}

export async function addDocument(dogId: number, data: {
  documentName: string;
  documentUrl: string;
  documentType: "prescription" | "certificate" | "other";
}) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(petDocuments).values({
    dogId,
    documentName: data.documentName,
    documentUrl: data.documentUrl,
    documentType: data.documentType,
  });
  return result[0].insertId;
}

export async function getDocuments(dogId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(petDocuments).where(eq(petDocuments.dogId, dogId)).orderBy(desc(petDocuments.createdAt));
}

export async function createVeterinarian(data: {
  name: string;
  specialty?: string;
  clinicName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string;
  email?: string;
  isPartner?: boolean;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(veterinarians).values({
    name: data.name,
    specialty: data.specialty || null,
    clinicName: data.clinicName || null,
    address: data.address || null,
    latitude: data.latitude !== undefined ? String(data.latitude) : null,
    longitude: data.longitude !== undefined ? String(data.longitude) : null,
    phoneNumber: data.phoneNumber || null,
    email: data.email || null,
    isPartner: data.isPartner === true,
  });
  return result[0].insertId;
}

export async function createVetSlot(vetId: number, slotTime: Date) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(vetSlots).values({
    vetId,
    slotTime,
    isBooked: false,
  });
  return result[0].insertId;
}

export async function getNearbyVets(latitude: number, longitude: number, radiusKm: number = 10) {
  const connection = getPool();
  if (!connection) return [];

  try {
    const [vets] = await connection.execute(
      `SELECT v.*,
              (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(?)) + sin(radians(?)) * sin(radians(v.latitude)), -1), 1))) as distance
       FROM veterinarians v
       WHERE v.latitude IS NOT NULL AND v.longitude IS NOT NULL
         AND (6371 * acos(LEAST(GREATEST(cos(radians(?)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(?)) + sin(radians(?)) * sin(radians(v.latitude)), -1), 1))) <= ?
       ORDER BY distance ASC`,
      [latitude, longitude, latitude, latitude, longitude, latitude, radiusKm]
    );
    return vets || [];
  } catch (error) {
    console.error("[Database] Failed to get nearby vets:", error);
    return [];
  }
}

export async function getVetSlots(vetId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(vetSlots).where(and(eq(vetSlots.vetId, vetId), eq(vetSlots.isBooked, false)));
}

export async function createVetAppointment(userId: number, data: {
  dogId: number;
  vetId?: number;
  customVetName?: string;
  appointmentTime: Date;
  reason: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;

  if (data.vetId) {
    const slotsList = await db.select().from(vetSlots).where(and(eq(vetSlots.vetId, data.vetId), eq(vetSlots.slotTime, data.appointmentTime)));
    if (slotsList.length > 0) {
      await db.update(vetSlots).set({ isBooked: true }).where(eq(vetSlots.id, slotsList[0].id));
    }
  }

  const result = await db.insert(vetAppointments).values({
    dogId: data.dogId,
    userId,
    vetId: data.vetId || null,
    customVetName: data.customVetName || null,
    appointmentTime: data.appointmentTime,
    reason: data.reason,
    notes: data.notes || null,
    status: "scheduled",
  });
  return result[0].insertId;
}

export async function cancelVetAppointment(appointmentId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;

  const [appointment] = await db.select().from(vetAppointments).where(and(eq(vetAppointments.id, appointmentId), eq(vetAppointments.userId, userId)));
  if (!appointment) return false;

  if (appointment.vetId) {
    const slotsList = await db.select().from(vetSlots).where(and(eq(vetSlots.vetId, appointment.vetId), eq(vetSlots.slotTime, appointment.appointmentTime)));
    if (slotsList.length > 0) {
      await db.update(vetSlots).set({ isBooked: false }).where(eq(vetSlots.id, slotsList[0].id));
    }
  }

  const result = await db.update(vetAppointments)
    .set({ status: "cancelled" })
    .where(and(eq(vetAppointments.id, appointmentId), eq(vetAppointments.userId, userId)));

  return result[0].affectedRows > 0;
}

export async function getVetAppointments(dogId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(vetAppointments).where(eq(vetAppointments.dogId, dogId)).orderBy(desc(vetAppointments.appointmentTime));
}





