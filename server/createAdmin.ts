import "dotenv/config";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function createAdmin() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not connected.");
    process.exit(1);
  }

  const email = "admin@woofyz.com";
  const name = "Admin Woofyz";
  const hashedPassword = await bcrypt.hash("doggle2026", 10);
  const openId = `email_${email}`;

  console.log(`👤 Inserting admin: ${email}...`);

  try {
    await db.insert(users).values({
      openId,
      email,
      name,
      hashedPassword,
      loginMethod: "email",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date()
    }).onDuplicateKeyUpdate({
      set: {
        name,
        hashedPassword,
        role: "admin",
        updatedAt: new Date()
      }
    });

    console.log(`✅ Admin ${email} created/updated successfully!`);
  } catch (error) {
    console.error("❌ Insertion failed:", error);
  } finally {
    process.exit(0);
  }
}

createAdmin().catch(console.error);
