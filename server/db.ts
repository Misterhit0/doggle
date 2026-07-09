import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users, dogs, Dog, InsertDog, matches, swipes, messages, notifications, reviews, verifications, Review, Verification, InsertReview, InsertVerification } from "../drizzle/schema";
import { ENV } from './_core/env';

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
        u2.profilePhotoUrl as user2Photo
      FROM matches m
      JOIN users u1 ON m.userId1 = u1.id
      JOIN users u2 ON m.userId2 = u2.id
      WHERE m.userId1 = ? OR m.userId2 = ?
      ORDER BY m.createdAt DESC
    `;
    const [rows] = await connection.execute(query, [userId, userId]);
    return (rows as any[]) || [];
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
  if (!currentUser || currentUser.latitude === null || currentUser.longitude === null) {
    return [];
  }

  // Get all users with location
  const allUsers = await db.select().from(users);

  // Filter by distance
  const nearby = allUsers.filter(user => {
    if (user.id === userId || user.latitude === null || user.longitude === null) return false;
    if (currentUser.latitude === null || currentUser.longitude === null) return false;
    const distance = calculateDistance(
      currentUser.latitude,
      currentUser.longitude,
      user.latitude,
      user.longitude
    );
    return distance <= radiusKm;
  });

  return nearby;
}

export async function getNearbyDuos(userId: number, radiusKm: number = 5) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get nearby duos: database not available");
    return [];
  }

  const nearbyUsers = await getNearbyUsers(userId, radiusKm);
  
  if (nearbyUsers.length === 0) {
    return [];
  }
  
  // Get dogs for each nearby user
  const duos = await Promise.all(
    nearbyUsers.map(async (user) => {
      const userDogs = await getDogsByUserId(user.id);
      return {
        user,
        dogs: userDogs,
      };
    })
  );

  return duos.filter(duo => duo.dogs.length > 0);
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
       LIMIT ?`,
      [userId, limit]
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
             (6371 * acos(cos(radians(?)) * cos(radians(e.latitude)) * cos(radians(e.longitude) - radians(?)) + sin(radians(?)) * sin(radians(e.latitude)))) as distance
      FROM events e
      JOIN users u ON e.organizerId = u.id
      WHERE (6371 * acos(cos(radians(?)) * cos(radians(e.latitude)) * cos(radians(e.longitude) - radians(?)) + sin(radians(?)) * sin(radians(e.latitude)))) <= ?
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
    const [result] = await connection.execute(
      `INSERT INTO lost_dogs (dogId, userId, description, lostDate, lostLocation, latitude, longitude, reward, contactPhone, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'lost', NOW())`,
      [data.dogId, data.userId, data.description, data.lostDate, data.lostLocation, data.latitude, data.longitude, data.reward || null, data.contactPhone || null]
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
      `INSERT INTO lost_dog_sightings (lostDogId, userId, location, latitude, longitude, sightingDate, description, confidence, createdAt)
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
              (6371 * acos(cos(radians(?)) * cos(radians(ld.latitude)) * cos(radians(ld.longitude) - radians(?)) + sin(radians(?)) * sin(radians(ld.latitude)))) as distance
       FROM lost_dogs ld
       JOIN dogs d ON ld.dogId = d.id
       JOIN users u ON ld.userId = u.id
       WHERE ld.status = 'lost'
       AND (6371 * acos(cos(radians(?)) * cos(radians(ld.latitude)) * cos(radians(ld.longitude) - radians(?)) + sin(radians(?)) * sin(radians(ld.latitude)))) <= ?
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
       FROM lost_dog_sightings s
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
        JOIN dogs d ON u.id = d.ownerId
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

export async function healStuckMatches() {
  const pool = getPool();
  if (!pool) return;

  try {
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
