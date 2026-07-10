import "dotenv/config";
import { getDb } from "./db";
import { users, dogs, verifications, InsertUser, InsertDog } from "../drizzle/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const FIRST_NAMES = [
  "Thomas", "Lucas", "Léo", "Hugo", "Louis", "Nathan", "Arthur", "Enzo", "Jules", "Gabriel",
  "Emma", "Léa", "Chloé", "Manon", "Inès", "Sarah", "Camille", "Jade", "Clara", "Zoé"
];

const LAST_NAMES = [
  "Martin", "Bernard", "Thomas", "Petit", "Robert", "Richard", "Durand", "Dubois", "Moreau", "Laurent",
  "Simon", "Michel", "Lefevre", "Leroy", "Roux", "David", "Bertrand", "Morel", "Fournier", "Girard"
];

const DOG_NAMES = [
  "Rocky", "Lucky", "Max", "Rex", "Toby", "Oscar", "Filou", "Simba", "Marley", "Cooper",
  "Luna", "Nala", "Bella", "Maya", "Lola", "Daisy", "Ruby", "Rosie", "Stella", "Penny"
];

const DOG_BREEDS = [
  "Golden Retriever", "Labrador Retriever", "Border Collie", "Berger Allemand", "French Bulldog",
  "Cavalier King Charles", "Jack Russell Terrier", "Pug", "Beagle", "Cocker Spaniel",
  "Siberian Husky", "Boxer", "Shih Tzu", "Chihuahua", "Australian Shepherd",
  "Staffordshire Bull Terrier", "Yorkshire Terrier", "Rottweiler", "Poodle", "Dalmatian"
];

const BIO_TEMPLATES = [
  "Adore les balades en forêt le week-end. Cherche des copains de promenade pour son toutou.",
  "Toujours partant pour faire de l'agility ou courir au parc. Mon chien a beaucoup d'énergie !",
  "Adepte des après-midis calmes dans les espaces dog-friendly. Cherche des rencontres tranquilles.",
  "Nouvellement installé dans le quartier, j'aimerais rencontrer d'autres propriétaires de chiens.",
  "Mon chien est un peu timide mais très affectueux une fois en confiance. Allons nous promener !",
];

const INTERESTS_POOL = ["hiking", "outdoor", "parks", "nature", "cafes", "social", "relaxation", "sports", "agility"];
const WHAT_I_SEEK_POOL = ["friend", "mentor", "intergenerational"];
const PERSONALITY_POOL = ["playful", "calm", "energetic", "social", "shy", "friendly", "protective", "loyal", "lazy"];

const USER_PHOTOS = [
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1489980508314-941910ded1f4?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200",
];

const DOG_PHOTOS = [
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300",
  "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&q=80&w=300",
  "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=300",
  "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=300",
  "https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?auto=format&fit=crop&q=80&w=300",
  "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&q=80&w=300",
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=300",
  "https://images.unsplash.com/photo-1517423568366-8b83523034fd?auto=format&fit=crop&q=80&w=300",
  "https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&q=80&w=300",
  "https://images.unsplash.com/photo-1477884213984-7a4d22977a8b?auto=format&fit=crop&q=80&w=300",
];

async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not connected.");
    process.exit(1);
  }

  console.log("🌱 Seeding 20 profiles in progress...");

  try {
    const hashedPassword = await bcrypt.hash("doggle2026", 10);
    const baseLat = 48.8566; // Paris Center
    const baseLng = 2.3522;

    for (let i = 1; i <= 20; i++) {
      const firstName = FIRST_NAMES[i - 1];
      const lastName = LAST_NAMES[i - 1];
      const email = `testuser${i}@example.com`;
      const name = `${firstName} ${lastName}`;
      const age = 18 + Math.floor(Math.random() * 50);
      const bio = BIO_TEMPLATES[Math.floor(Math.random() * BIO_TEMPLATES.length)];

      // Random selection of interests and seek options
      const interests = [...INTERESTS_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);
      const whatISeek = [...WHAT_I_SEEK_POOL].sort(() => 0.5 - Math.random()).slice(0, 1) as ("friend" | "mentor" | "intergenerational")[];

      // Coordinate offset (approx 0 to 5km)
      const latOffset = (Math.random() - 0.5) * 0.08;
      const lngOffset = (Math.random() - 0.5) * 0.08;
      const lat = baseLat + latOffset;
      const lng = baseLng + lngOffset;

      const profilePhotoUrl = USER_PHOTOS[(i - 1) % USER_PHOTOS.length];

      console.log(`👤 Inserting user ${i}/20: ${name}...`);

      const insertUserValues: InsertUser = {
        openId: `email_${email}`,
        email,
        name,
        hashedPassword,
        loginMethod: "email",
        role: "user",
        age,
        interests,
        walkingHabits: "regular",
        whatISeek,
        bio,
        profilePhotoUrl,
        latitude: lat,
        longitude: lng,
        homeLatitude: lat - 0.001, // Small privacy offset
        homeLongitude: lng + 0.001,
        isShareLocationActive: true,
        lastLocationUpdate: new Date(),
        lastSignedIn: new Date()
      };

      await db.insert(users).values(insertUserValues).onDuplicateKeyUpdate({
        set: {
          name,
          age,
          role: "user",
          interests: JSON.stringify(interests) as any,
          whatISeek: JSON.stringify(whatISeek) as any,
          bio,
          profilePhotoUrl,
          latitude: lat,
          longitude: lng,
          isShareLocationActive: true,
          lastLocationUpdate: new Date(),
        }
      });

      // Fetch user ID
      const userList = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const userId = userList[0]?.id;

      if (userId) {
        // Dog profile data
        const dogName = DOG_NAMES[i - 1];
        const breed = DOG_BREEDS[i - 1];
        const dogAge = Math.floor(Math.random() * 12) + 1;
        const personality = [...PERSONALITY_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);
        const dogPhoto = DOG_PHOTOS[(i - 1) % DOG_PHOTOS.length];

        console.log(`🐶 Inserting dog: ${dogName} (${breed}) for ${name}...`);

        // Clear existing dogs to avoid duplicates
        await db.delete(dogs).where(eq(dogs.userId, userId));

        const insertDogValues: InsertDog = {
          userId,
          name: dogName,
          breed,
          age: dogAge,
          description: `Un adorable ${breed} de ${dogAge} ans, très sociable !`,
          personality,
          photoUrls: [dogPhoto]
        };

        await db.insert(dogs).values(insertDogValues);

        // Pre-approve verification status
        await db.insert(verifications).values({
          userId,
          photoUrl: profilePhotoUrl,
          status: "approved",
          verifiedAt: new Date()
        }).onDuplicateKeyUpdate({
          set: {
            status: "approved",
            verifiedAt: new Date()
          }
        });
      }
    }

    console.log("✅ Seed completed successfully! All seeded users have password 'doggle2026'.");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit(0);
  }
}

seed().catch(console.error);
