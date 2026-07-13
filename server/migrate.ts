import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql2 from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

// Parse mysql://[user[:pass]@]host[:port]/dbname[?params]
// Supports: mysql://root@host/db, mysql://user:pass@host:port/db
function parseDbUrl(url: string) {
  // Remove query params
  const cleanUrl = url.split("?")[0];
  // Remove scheme
  const withoutScheme = cleanUrl.replace(/^mysql:\/\//, "");
  
  let auth = "";
  let hostPart = withoutScheme;
  
  if (withoutScheme.includes("@")) {
    const atIdx = withoutScheme.lastIndexOf("@");
    auth = withoutScheme.substring(0, atIdx);
    hostPart = withoutScheme.substring(atIdx + 1);
  }
  
  const [userRaw, passRaw] = auth.includes(":") ? auth.split(":") : [auth, ""];
  const [hostRaw, portRaw, dbRaw] = hostPart.includes("/")
    ? [hostPart.split(":")[0], hostPart.split(":")[1]?.split("/")[0], hostPart.split("/")[1]]
    : [hostPart, undefined, undefined];
  
  const result = {
    user: userRaw || "root",
    password: passRaw || "",
    host: hostRaw || "127.0.0.1",
    port: parseInt(portRaw || "3306", 10),
    database: dbRaw || "",
  };
  
  if (!result.database) {
    throw new Error("Could not parse database name from DATABASE_URL");
  }
  
  return result;
}

const { user, password, host, port, database } = parseDbUrl(DB_URL!);

// ─── Migration Runner ────────────────────────────────────────────────────────

async function runMigrations() {
  console.log(`\n🔌 Connecting to database: ${database}@${host}:${port}`);

  const pool = await mysql2.createPool({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
  });

  // Ensure tracking table exists
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS _app_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      checksum VARCHAR(64)
    )
  `);

  // Get already applied migrations
  const [applied] = await pool.execute("SELECT filename FROM _app_migrations") as any[];
  const appliedSet = new Set(applied.map((r: any) => r.filename));

  // Read SQL migration files from drizzle/ folder
  const migrationsDir = path.resolve(__dirname, "../drizzle");
  const sqlFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // alphabetical = chronological (0000, 0001, ...)

  const pending = sqlFiles.filter((f) => !appliedSet.has(f));

  if (pending.length === 0) {
    console.log("✅ All migrations already applied — nothing to do.\n");
    await pool.end();
    return;
  }

  console.log(`📋 ${pending.length} pending migration(s): ${pending.join(", ")}\n`);

  for (const filename of pending) {
    const filepath = path.join(migrationsDir, filename);
    let sql = fs.readFileSync(filepath, "utf-8");

    // Strip Drizzle's breakpoint markers (they are not valid SQL)
    sql = sql.replace(/^--> statement-breakpoint\s*$/gm, "");

    console.log(`⏳ Applying: ${filename} ...`);
    try {
      await pool.query(sql);
      await pool.execute(
        "INSERT INTO _app_migrations (filename) VALUES (?) ON DUPLICATE KEY UPDATE applied_at = NOW()",
        [filename]
      );
      console.log(`   ✅ ${filename} applied successfully`);
    } catch (err: any) {
      // Ignore "already exists" errors (idempotent)
      if (
        err.code === "ER_TABLE_EXISTS_ERROR" ||
        err.code === "ER_DUP_FIELDNAME" ||
        (err.message && err.message.includes("Duplicate column"))
      ) {
        console.log(`   ℹ️  ${filename} — already applied (schema already exists), marking as done`);
        await pool.execute(
          "INSERT IGNORE INTO _app_migrations (filename) VALUES (?)",
          [filename]
        );
      } else {
        console.error(`   ❌ ${filename} FAILED:`, err.message);
        await pool.end();
        process.exit(1);
      }
    }
  }

  console.log(`\n✅ All migrations applied successfully!\n`);
  await pool.end();
}

// ─── Admin Seed ──────────────────────────────────────────────────────────────

async function seedAdmin() {
  const bcrypt = (await import("bcryptjs")).default;

  const pool = await mysql2.createPool({ host, port, user, password, database });

  const email = "contact@woofyz.com";
  const hash = await bcrypt.hash("doggle2026", 10);

  const [rows] = await pool.execute(
    "SELECT id FROM users WHERE email = ?",
    [email]
  ) as any[];

  if (rows.length > 0) {
    await pool.execute(
      "UPDATE users SET hashedPassword = ?, role = 'admin', updatedAt = NOW() WHERE email = ?",
      [hash, email]
    );
    console.log(`👤 Admin user updated: ${email}`);
  } else {
    await pool.execute(
      `INSERT INTO users (openId, email, name, hashedPassword, loginMethod, role, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, 'Admin Woofyz', ?, 'email', 'admin', NOW(), NOW(), NOW())`,
      [`email_${email}`, email, hash]
    );
    console.log(`👤 Admin user created: ${email}`);
  }

  await pool.end();
}

// ─── Main ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const skipAdmin = args.includes("--no-admin");
const adminOnly = args.includes("--admin-only");

if (adminOnly) {
  console.log("\n👤 Running admin seed only...");
  seedAdmin()
    .then(() => console.log("✅ Done\n"))
    .catch((e) => { console.error("❌", e.message); process.exit(1); });
} else {
  runMigrations()
    .then(() => {
      if (!skipAdmin) return seedAdmin();
    })
    .then(() => console.log("✅ Migration + seed complete\n"))
    .catch((e) => { console.error("❌", e.message); process.exit(1); });
}
