import { createClient } from "@libsql/client";

let url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const useLocalDb = process.env.USE_LOCAL_DB === "1" && process.env.NODE_ENV !== "production";

if (useLocalDb) {
  url = `file:${process.env.LOCAL_DB_PATH || "/tmp/follower-local.db"}`;
}

if (!url || (!authToken && !useLocalDb)) {
  throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
}

export const db = createClient({ url, authToken });

let initPromise: Promise<void> | null = null;

export function initDb(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      balance REAL DEFAULT 0,
      role TEXT DEFAULT 'user',
      terms_accepted INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INTEGER PRIMARY KEY,
      email_notifications INTEGER DEFAULT 1,
      order_status_notifications INTEGER DEFAULT 1,
      auto_refresh_orders INTEGER DEFAULT 1,
      refresh_interval_seconds INTEGER DEFAULT 30,
      compact_mode INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

  const orderColumns = await db.execute({ sql: "PRAGMA table_info(orders)" });
  const existingOrderColumns = new Set((orderColumns.rows as any[]).map((c: any) => c.name));
  for (const [name, definition] of [
    ["provider_id", "INTEGER"],
    ["start_count", "INTEGER"],
    ["remains", "INTEGER"],
    ["cancel_requested_at", "DATETIME"],
    ["refunded_at", "DATETIME"],
  ] as const) {
    if (!existingOrderColumns.has(name)) {
      await db.execute(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`);
    }
  }

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
    CREATE TABLE IF NOT EXISTS crypto_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      coin TEXT NOT NULL,
      network TEXT NOT NULL,
      amount REAL NOT NULL,
      address TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      note TEXT,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  const cryptoDepositColumns = await db.execute({ sql: "PRAGMA table_info(crypto_deposits)" });
  const existingCryptoDepositColumns = new Set((cryptoDepositColumns.rows as any[]).map((c: any) => c.name));
  if (!existingCryptoDepositColumns.has("payment_id")) {
    await db.execute(`ALTER TABLE crypto_deposits ADD COLUMN payment_id TEXT`);
  }
  if (!existingCryptoDepositColumns.has("order_id")) {
    await db.execute(`ALTER TABLE crypto_deposits ADD COLUMN order_id TEXT`);
  }
  if (!existingCryptoDepositColumns.has("payment_status")) {
    await db.execute(`ALTER TABLE crypto_deposits ADD COLUMN payment_status TEXT`);
  }
  if (!existingCryptoDepositColumns.has("actually_paid")) {
    await db.execute(`ALTER TABLE crypto_deposits ADD COLUMN actually_paid REAL`);
  }
  if (!existingCryptoDepositColumns.has("pay_currency")) {
    await db.execute(`ALTER TABLE crypto_deposits ADD COLUMN pay_currency TEXT`);
  }
  if (!existingCryptoDepositColumns.has("ipn_received_at")) {
    await db.execute(`ALTER TABLE crypto_deposits ADD COLUMN ipn_received_at DATETIME`);
  }
  if (!existingCryptoDepositColumns.has("confirmed_at")) {
    await db.execute(`ALTER TABLE crypto_deposits ADD COLUMN confirmed_at DATETIME`);
  }
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_crypto_deposits_payment_id ON crypto_deposits(payment_id) WHERE payment_id IS NOT NULL`);

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
      siteDescription TEXT DEFAULT 'منصة خدمات تسويق اجتماعي احترافية',
      defaultCurrency TEXT DEFAULT 'USD',
      cryptoMinAmount REAL DEFAULT 1,
      asiacellMinAmount REAL DEFAULT 0,
      apiV2Enabled INTEGER DEFAULT 1,
      registrationEnabled INTEGER DEFAULT 1,
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

  // حقول حالة الاتصال: تُحدّث بشكل مستقل عن حفظ بيانات المزود
  const providerColumns = await db.execute({ sql: "PRAGMA table_info(providers)" });
  const existingProviderColumns = new Set((providerColumns.rows as any[]).map((c: any) => c.name));
  if (!existingProviderColumns.has("connection_status")) {
    await db.execute(`ALTER TABLE providers ADD COLUMN connection_status TEXT DEFAULT 'unknown'`);
  }
  if (!existingProviderColumns.has("last_error")) {
    await db.execute(`ALTER TABLE providers ADD COLUMN last_error TEXT`);
  }
  if (!existingProviderColumns.has("last_probe_at")) {
    await db.execute(`ALTER TABLE providers ADD COLUMN last_probe_at DATETIME`);
  }

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

  // ترقيات آمنة للخدمات: نمط التسعير وقيمة البيع اليدوية الدقيقة
  const serviceColumns = await db.execute({ sql: "PRAGMA table_info(provider_services)" });
  const existingServiceColumns = new Set((serviceColumns.rows as any[]).map((c: any) => c.name));
  if (!existingServiceColumns.has("is_new")) {
    await db.execute(`ALTER TABLE provider_services ADD COLUMN is_new INTEGER DEFAULT 1`);
  }
  if (!existingServiceColumns.has("pricing_mode")) {
    await db.execute(`ALTER TABLE provider_services ADD COLUMN pricing_mode TEXT DEFAULT 'markup'`);
  }
  if (!existingServiceColumns.has("manual_price")) {
    await db.execute(`ALTER TABLE provider_services ADD COLUMN manual_price REAL`);
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

  // فهارس القراءة المتكررة في لوحة الإدارة وكتالوج المستخدمين
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_provider_services_provider ON provider_services(provider_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_provider_services_provider_remote ON provider_services(provider_id, remote_service_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_provider_services_active ON provider_services(is_active, provider_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_orders_provider_status ON orders(provider_id, status, updated_at DESC)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys(user_id, is_active)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC)`);

  // أكواد الهدايا/الدعوة التي تنشئها الإدارة وتضيف رصيدًا للمستخدم عند الاسترداد
  await db.execute(`
    CREATE TABLE IF NOT EXISTS gift_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      kind TEXT DEFAULT 'gift',
      amount REAL NOT NULL,
      max_uses INTEGER DEFAULT 1,
      used_count INTEGER DEFAULT 0,
      expires_at DATETIME,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS gift_code_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(code_id, user_id),
      FOREIGN KEY (code_id) REFERENCES gift_codes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // سجل تدقيق إداري: يوثق الإجراء والهدف دون تخزين أسرار أو كلمات مرور
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_user_id INTEGER,
      target_user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_user_id) REFERENCES users(id),
      FOREIGN KEY (target_user_id) REFERENCES users(id)
    )
  `);

  // حماية المصادقة: لا نخزن IP الخام، بل بصمة SHA-256 مع عداد زمني للمحاولات
  await db.execute(`
    CREATE TABLE IF NOT EXISTS auth_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_hash TEXT NOT NULL,
      action TEXT NOT NULL,
      attempt_count INTEGER DEFAULT 0,
      window_started_at INTEGER NOT NULL,
      blocked_until INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(key_hash, action)
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_auth_attempts_updated_at ON auth_attempts(updated_at)`);

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
    "siteDescription TEXT DEFAULT 'منصة خدمات تسويق اجتماعي احترافية'",
    "defaultCurrency TEXT DEFAULT 'USD'",
    "cryptoMinAmount REAL DEFAULT 1",
    "asiacellMinAmount REAL DEFAULT 0",
    "apiV2Enabled INTEGER DEFAULT 1",
    "registrationEnabled INTEGER DEFAULT 1",
  ]) {
    try {
      await db.execute(`ALTER TABLE site_settings ADD COLUMN ${col}`);
    } catch {
      // العمود موجود مسبقًا — تخطى
    }
  }
  })().catch((error) => {
    initPromise = null;
    throw error;
  });
  return initPromise;
}
