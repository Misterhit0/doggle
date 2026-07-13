import "dotenv/config";
import { getDb } from "./db";
import { users, dogs, verifications, InsertUser, InsertDog } from "../drizzle/schema";
import bcrypt from "bcryptjs";

const SEED_USERS = [
  {
    email: "admin@woofyz.fr",
    name: "Administrateur Woofyz",
    age: 30,
    bio: "Compte d'administration global pour valider les membres et gérer l'application.",
    interests: ["community", "outdoor"],
    walkingHabits: "daily",
    whatISeek: ["friend"],
    profilePhotoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400",
    latitude: 48.8566,
    longitude: 2.3522,
    role: "admin",
    isShareLocationActive: true,
  },
  {
    email: "alice@example.com",
    name: "Alice Martin",
    age: 28,
    bio: "Passionnée par la randonnée et le grand air. J'adore me promener le matin avec mon chien et rencontrer de nouvelles personnes !",
    interests: ["hiking", "nature", "outdoor", "parks"],
    walkingHabits: "morning",
    whatISeek: ["friend"],
    profilePhotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400",
    latitude: 48.8580,
    longitude: 2.3530,
    role: "user",
    isShareLocationActive: true,
  },
  {
    email: "bob@example.com",
    name: "Bob Mercier",
    age: 32,
    bio: "Sportif et adepte des parcs de agility. Rocky adore courir et courir après sa balle. Toujours partant pour une balade active !",
    interests: ["sports", "fitness", "outdoor", "parks"],
    walkingHabits: "evening",
    whatISeek: ["friend", "mentor"],
    profilePhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
    latitude: 48.8600,
    longitude: 2.3510,
    role: "user",
    isShareLocationActive: true,
  },
  {
    email: "charlie@example.com",
    name: "Charlie Dubois",
    age: 24,
    bio: "Étudiante en photographie. Luna est ma muse poilue. On se balade souvent dans les parcs calmes pour faire des photos ou lire un livre.",
    interests: ["parks", "nature", "relaxation", "reading"],
    walkingHabits: "daily",
    whatISeek: ["friend", "intergenerational"],
    profilePhotoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400",
    latitude: 48.8540,
    longitude: 2.3550,
    role: "user",
    isShareLocationActive: true,
  },
  {
    email: "david@example.com",
    name: "David Laurent",
    age: 45,
    bio: "Habitué des cafés dog-friendly. Daisy est un petit rayon de soleil. On cherche des maîtres pour s'entraider lors des balades en centre-ville.",
    interests: ["cafes", "social", "relaxation", "community"],
    walkingHabits: "frequent",
    whatISeek: ["friend"],
    profilePhotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400",
    latitude: 48.8590,
    longitude: 2.3480,
    role: "user",
    isShareLocationActive: true,
  },
  {
    email: "emma@example.com",
    name: "Emma Roche",
    age: 29,
    bio: "Nouvelle dans la région. Coco adore jouer avec tous les chiens de sa taille. On cherche à faire partie de la communauté de balades !",
    interests: ["social", "cafes", "community", "events"],
    walkingHabits: "weekend",
    whatISeek: ["friend"],
    profilePhotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
    latitude: 48.8520,
    longitude: 2.3500,
    role: "user",
    isShareLocationActive: true,
  }
];

const SEED_DOGS = [
  {
    name: "Rex",
    breed: "German Shepherd",
    age: 5,
    description: "Le fidèle compagnon protecteur de l'administrateur.",
    personality: ["protective", "calm", "loyal"],
    photoUrls: ["https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Buddy",
    breed: "Golden Retriever",
    age: 3,
    description: "Extrêmement joueur et amical. Adore rapporter la balle et nager !",
    personality: ["playful", "social", "friendly"],
    photoUrls: ["https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Rocky",
    breed: "German Shepherd",
    age: 4,
    description: "Très protecteur et obéissant. Aime faire du jogging et jouer au frisbee.",
    personality: ["protective", "loyal", "energetic"],
    photoUrls: ["https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Luna",
    breed: "Border Collie",
    age: 2,
    description: "Très intelligente et attentive. Adore apprendre des tours et courir dans les champs.",
    personality: ["energetic", "loyal", "gentle"],
    photoUrls: ["https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Daisy",
    breed: "Chihuahua",
    age: 1,
    description: "Un peu timide au début mais très câline. Adore être blottie dans les bras.",
    personality: ["shy", "calm", "friendly"],
    photoUrls: ["https://images.unsplash.com/photo-1517423568366-8b83523034fd?auto=format&fit=crop&q=80&w=600"]
  },
  {
    name: "Coco",
    breed: "Pug",
    age: 5,
    description: "Adore les siestes et manger des friandises. Très rigolo et affectueux.",
    personality: ["lazy", "calm", "friendly"],
    photoUrls: ["https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=600"]
  }
];

async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not connected. Please verify DATABASE_URL.");
    process.exit(1);
  }

  console.log("🌱 Starting database seeding...");

  try {
    const hashedPassword = await bcrypt.hash("doggle2026", 10);

    for (let i = 0; i < SEED_USERS.length; i++) {
      const userData = SEED_USERS[i];
      const dogData = SEED_DOGS[i];

      console.log(`👤 Seeding user: ${userData.name}...`);
      
      const insertUserValues: InsertUser = {
        openId: `email_${userData.email}`,
        email: userData.email,
        name: userData.name,
        hashedPassword,
        loginMethod: "email",
        role: userData.role as any,
        age: userData.age,
        interests: userData.interests,
        walkingHabits: userData.walkingHabits,
        whatISeek: userData.whatISeek as any,
        bio: userData.bio,
        profilePhotoUrl: userData.profilePhotoUrl,
        latitude: userData.latitude,
        longitude: userData.longitude,
        homeLatitude: userData.latitude - 0.001, // Offset for privacy
        homeLongitude: userData.longitude + 0.001,
        isShareLocationActive: userData.isShareLocationActive,
        lastLocationUpdate: new Date(),
        lastSignedIn: new Date()
      };

      await db.insert(users).values(insertUserValues).onDuplicateKeyUpdate({
        set: {
          name: userData.name,
          age: userData.age,
          role: userData.role as any,
          interests: JSON.stringify(userData.interests) as any,
          walkingHabits: userData.walkingHabits,
          whatISeek: JSON.stringify(userData.whatISeek) as any,
          bio: userData.bio,
          profilePhotoUrl: userData.profilePhotoUrl,
          latitude: userData.latitude,
          longitude: userData.longitude,
          isShareLocationActive: userData.isShareLocationActive,
          lastLocationUpdate: new Date()
        }
      });

      // Retrieve inserted user ID
      const user = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
      const userId = user[0]?.id;

      if (userId) {
        console.log(`🐶 Seeding dog: ${dogData.name} for User ID ${userId}...`);
        
        // Remove existing dog profiles for this user to keep it clean
        await db.delete(dogs).where(eq(dogs.userId, userId));

        const insertDogValues: InsertDog = {
          userId,
          name: dogData.name,
          breed: dogData.breed,
          age: dogData.age,
          description: dogData.description,
          personality: dogData.personality,
          photoUrls: dogData.photoUrls
        };

        await db.insert(dogs).values(insertDogValues);

        // Pre-approve verification status to have verified checkmark
        await db.insert(verifications).values({
          userId,
          photoUrl: userData.profilePhotoUrl,
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

    console.log("✅ Seeding complete ! Password for all seed users: doggle2026");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit(0);
  }
}

// Helpers missing import
import { eq } from "drizzle-orm";

seed().catch(console.error);
