import { db } from "../src/lib/db";

async function migrate() {
  try {
    await db.execute("ALTER TABLE users ADD COLUMN verified_phone TEXT");
    console.log("Added users.verified_phone");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes("duplicate column")) console.error(message);
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS asiacell_pending_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      amount_iqd INTEGER,
      receiver_phone TEXT,
      transfer_pid TEXT,
      status TEXT DEFAULT 'pending',
      admin_otp TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log("Migration complete");
}

migrate().catch(console.error);
