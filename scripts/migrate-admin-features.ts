import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function migrate() {
  // Add is_banned column
  try {
    await db.execute("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0");
    console.log("Added users.is_banned");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes("duplicate column")) console.error(message);
  }

  // Create site_settings table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default colors
  const defaults = [
    ["primary", "#f97316"],
    ["primaryDark", "#ea580c"],
    ["background", "#050505"],
    ["card", "#111111"],
    ["surface", "#1a1a1a"],
    ["border", "#27272a"],
  ];
  for (const [k, v] of defaults) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)",
      args: [k, v],
    });
  }

  // Create super admin account from deployment-provided secrets only.
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!username || !password) throw new Error("Set ADMIN_USERNAME and ADMIN_INITIAL_PASSWORD before running this migration");
  const hash = await bcrypt.hash(password, 10);

  // Delete if exists then insert to update password
  await db.execute({ sql: "DELETE FROM users WHERE username = ?", args: [username] });
  await db.execute({
    sql: "INSERT INTO users (username, email, password_hash, balance, role, terms_accepted, is_banned) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [username, "superadmin@follower.com", hash, 0, "admin", 1, 0],
  });

  console.log("Admin features migration complete");
  console.log("Super admin created:", username);
}

migrate().catch(console.error);
