import { db } from "../src/lib/db";

async function migrate() {
  // Add method column to transactions if missing
  try {
    await db.execute("ALTER TABLE transactions ADD COLUMN method TEXT");
    console.log("Added transactions.method");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes("duplicate column")) console.error(message);
  }

  // Add phone column to users if missing
  try {
    await db.execute("ALTER TABLE users ADD COLUMN phone TEXT");
    console.log("Added users.phone");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes("duplicate column")) console.error(message);
  }

  // Add payment_methods columns
  try {
    await db.execute("ALTER TABLE payment_methods ADD COLUMN is_auto INTEGER DEFAULT 0");
    console.log("Added payment_methods.is_auto");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes("duplicate column")) console.error(message);
  }
  try {
    await db.execute("ALTER TABLE payment_methods ADD COLUMN config TEXT");
    console.log("Added payment_methods.config");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes("duplicate column")) console.error(message);
  }

  // Create Asiacell tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS asiacell_admin (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      phone TEXT,
      device_id TEXT,
      access_token TEXT,
      pid TEXT,
      authenticated INTEGER DEFAULT 0,
      exchange_rate INTEGER DEFAULT 1000,
      store_phone TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS asiacell_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      phone TEXT,
      device_id TEXT,
      access_token TEXT,
      pid TEXT,
      amount INTEGER DEFAULT 0,
      transfer_pid TEXT,
      username TEXT,
      step TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS asiacell_processed_records (
      record_id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert Asiacell payment method
  await db.execute({
    sql: `INSERT OR IGNORE INTO payment_methods (name, name_en, icon, instructions, is_active, is_auto)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      "آسياسيل (Asiacell)",
      "Asiacell",
      "asiacell",
      "شحن فوري عبر كرت آسياسيل. أدخل رقم الكارت وسيتم إضافة الرصيد تلقائياً بعد التحقق.",
      1,
      1,
    ],
  });

  console.log("Asiacell migration complete");
}

migrate().catch(console.error);
