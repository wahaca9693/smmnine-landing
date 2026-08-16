import { createClient } from "@libsql/client";

let url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (process.env.USE_LOCAL_DB === "1") {
  url = `file:${process.env.LOCAL_DB_PATH || "/tmp/follower-local.db"}`;
}

if (!url || (!authToken && process.env.USE_LOCAL_DB !== "1")) {
  throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
}

export const db = createClient({ url, authToken });

export async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      balance REAL DEFAULT 0,
      role TEXT DEFAULT 'user',
      terms_accepted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      smmnine_order_id INTEGER,
      service_id INTEGER NOT NULL,
      service_name TEXT,
      link TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      charge REAL DEFAULT 0,
      status TEXT DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      description TEXT,
      method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT,
      icon TEXT,
      instructions TEXT,
      min_amount REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      is_auto INTEGER DEFAULT 0,
      config TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS auto_refills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      service_name TEXT,
      link TEXT NOT NULL,
      target_quantity INTEGER NOT NULL,
      interval_hours INTEGER DEFAULT 24,
      last_refill DATETIME,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS reseller_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      site_name TEXT,
      contact TEXT,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      order_id TEXT,
      status TEXT DEFAULT 'open',
      admin_reply TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ticket_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      user_id INTEGER,
      is_admin INTEGER DEFAULT 0,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      siteName TEXT DEFAULT 'Follower',
      primaryColor TEXT DEFAULT '#f97316',
      backgroundColor TEXT DEFAULT '#050505',
      cardColor TEXT DEFAULT '#111111',
      surfaceColor TEXT DEFAULT '#1a1a1a',
      borderColor TEXT DEFAULT '#27272a',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(`
    INSERT OR IGNORE INTO site_settings (id)
    VALUES ('default')
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'update',
      icon TEXT,
      body TEXT NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS service_requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_pattern TEXT NOT NULL,
      service_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      image_file TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      balance TEXT,
      balance_fetched_at DATETIME,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS provider_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL,
      remote_service_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      rate REAL NOT NULL,
      min REAL DEFAULT 0,
      max REAL DEFAULT 0,
      type TEXT,
      markup_percent REAL DEFAULT 30,
      sell_rate REAL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
    )
  `);

  // عمود وسم "جديد" للخدمات المضافة حديثًا من المزودين
  const colCheck = await db.execute({ sql: "PRAGMA table_info(provider_services)" });
  if (!(colCheck.rows as any[]).some((c: any) => c.name === "is_new")) {
    await db.execute(`ALTER TABLE provider_services ADD COLUMN is_new INTEGER DEFAULT 1`);
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS provider_order_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_order_id INTEGER,
      provider_id INTEGER,
      remote_order_id TEXT,
      status TEXT DEFAULT 'pending',
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // مفاتيح API للمستخدمين (كل مستخدم يمكنه إنشاء مفتاح لاستخدام المنصة من موقعه/بوته)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      api_key TEXT NOT NULL UNIQUE,
      name TEXT DEFAULT 'مفتاحي الرئيسي',
      requests_count INTEGER DEFAULT 0,
      last_used_at DATETIME,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // توسعة ترقية آمنة: أعمدة ألوان إضافية للثيم المتقدم
  for (const col of [
    "secondaryColor TEXT DEFAULT '#fbbf24'",
    "primaryLight TEXT DEFAULT '#fdba74'",
  ]) {
    try {
      await db.execute(`ALTER TABLE site_settings ADD COLUMN ${col}`);
    } catch {
      // العمود موجود مسبقًا — تخطى
    }
  }
}
