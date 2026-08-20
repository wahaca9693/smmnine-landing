import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function migrate() {
  // Ensure is_banned column exists
  try {
    await db.execute("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0");
    console.log("Added users.is_banned");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("duplicate column")) console.error(message);
  }

  // Add theme columns to existing site_settings if missing
  const columns = ["backgroundColor", "cardColor", "surfaceColor", "borderColor"];
  for (const col of columns) {
    try {
      await db.execute(`ALTER TABLE site_settings ADD COLUMN ${col} TEXT`);
      console.log(`Added site_settings.${col}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("duplicate column")) console.error(message);
    }
  }

  // Seed default row if missing
  const existing = await db.execute("SELECT id FROM site_settings LIMIT 1");
  if (existing.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO site_settings (id, siteName, primaryColor, backgroundColor, cardColor, surfaceColor, borderColor)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ["default", "smmnine", "#f97316", "#050505", "#111111", "#1a1a1a", "#27272a"],
    });
    console.log("Seeded default site settings");
  } else {
    // ensure colors are set
    await db.execute({
      sql: `UPDATE site_settings
            SET primaryColor = COALESCE(primaryColor, ?),
                backgroundColor = COALESCE(backgroundColor, ?),
                cardColor = COALESCE(cardColor, ?),
                surfaceColor = COALESCE(surfaceColor, ?),
                borderColor = COALESCE(borderColor, ?)`,
      args: ["#f97316", "#050505", "#111111", "#1a1a1a", "#27272a"],
    });
  }

  // Create super admin account from deployment-provided secrets only.
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!username || !password) throw new Error("Set ADMIN_USERNAME and ADMIN_INITIAL_PASSWORD before running this migration");
  const hash = await bcrypt.hash(password, 10);

  await db.execute({ sql: "DELETE FROM users WHERE username = ?", args: [username] });
  await db.execute({
    sql: "INSERT INTO users (username, email, password_hash, balance, role, terms_accepted, is_banned) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [username, "superadmin@follower.com", hash, 0, "admin", 1, 0],
  });

  console.log("Admin features migration complete");
  console.log("Super admin created:", username);
}

migrate().catch(console.error);
