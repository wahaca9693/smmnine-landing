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

type ColumnRow = { name?: unknown };

type SchemaMigration = {
  table: string;
  columns: Array<[string, string]>;
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    balance REAL DEFAULT 0,
    role TEXT DEFAULT 'user',
    terms_accepted INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    email_verified INTEGER DEFAULT 1,
    email_verification_token_hash TEXT,
    email_verification_expires_at DATETIME,
    firebase_uid TEXT,
    auth_provider TEXT DEFAULT 'password',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS pending_registrations (
    registration_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    firebase_uid TEXT,
    terms_accepted INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    pre_auth_session_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY,
    email_notifications INTEGER DEFAULT 1,
    order_status_notifications INTEGER DEFAULT 1,
    auto_refresh_orders INTEGER DEFAULT 1,
    refresh_interval_seconds INTEGER DEFAULT 30,
    compact_mode INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    smmnine_order_id INTEGER,
    service_id INTEGER NOT NULL,
    service_name TEXT,
    link TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    charge REAL DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    provider_id INTEGER,
    start_count INTEGER,
    remains INTEGER,
    cancel_requested_at DATETIME,
    refunded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    description TEXT,
    method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    icon TEXT,
    instructions TEXT,
    min_amount REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_auto INTEGER DEFAULT 0,
    config TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS crypto_deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    coin TEXT NOT NULL,
    network TEXT NOT NULL,
    amount REAL NOT NULL,
    address TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    note TEXT,
    payment_id TEXT,
    order_id TEXT,
    payment_status TEXT,
    actually_paid REAL,
    pay_currency TEXT,
    ipn_received_at DATETIME,
    confirmed_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS auto_refills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    public_service_id TEXT,
    service_name TEXT,
    service_name_ar TEXT,
    link TEXT NOT NULL,
    target_quantity INTEGER NOT NULL,
    interval_hours INTEGER DEFAULT 24,
    last_refill DATETIME,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS reseller_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    site_name TEXT,
    contact TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS asiacell_admin (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    phone TEXT,
    device_id TEXT,
    access_token TEXT,
    pid TEXT,
    authenticated INTEGER DEFAULT 0,
    exchange_rate INTEGER DEFAULT 1000,
    store_phone TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS asiacell_sessions (
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
  )`,
  `CREATE TABLE IF NOT EXISTS asiacell_processed_records (
    record_id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS tickets (
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
  )`,
  `CREATE TABLE IF NOT EXISTS ticket_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    user_id INTEGER,
    is_admin INTEGER DEFAULT 0,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS site_settings (
    id TEXT PRIMARY KEY,
    siteName TEXT DEFAULT 'follower',
    brandMediaUrl TEXT,
    brandMediaType TEXT DEFAULT 'image',
    primaryColor TEXT DEFAULT '#f97316',
    primaryLight TEXT DEFAULT '#fdba74',
    secondaryColor TEXT DEFAULT '#fbbf24',
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
  )`,
  `CREATE TABLE IF NOT EXISTS updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'update',
    icon TEXT,
    body TEXT NOT NULL,
    is_pinned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS admin_navigation_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label_ar TEXT NOT NULL,
    label_en TEXT,
    description_ar TEXT,
    description_en TEXT,
    href TEXT NOT NULL,
    icon TEXT DEFAULT 'Zap',
    badge TEXT,
    badge_color TEXT DEFAULT 'gold',
    audience TEXT NOT NULL DEFAULT 'user',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS catalog_platform_buttons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    label_ar TEXT NOT NULL,
    label_en TEXT,
    description_ar TEXT,
    description_en TEXT,
    logo_url TEXT,
    service_ids TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS service_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_pattern TEXT NOT NULL,
    service_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    image_file TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    api_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    balance TEXT,
    balance_fetched_at DATETIME,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    connection_status TEXT DEFAULT 'unknown',
    last_error TEXT,
    last_probe_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS provider_services (
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
    pricing_mode TEXT DEFAULT 'markup',
    manual_price REAL,
    is_active INTEGER DEFAULT 1,
    is_new INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS provider_order_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    local_order_id INTEGER,
    provider_id INTEGER,
    remote_order_id TEXT,
    status TEXT DEFAULT 'pending',
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS gift_codes (
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
  )`,
  `CREATE TABLE IF NOT EXISTS gift_code_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(code_id, user_id),
    FOREIGN KEY (code_id) REFERENCES gift_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS free_service_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id TEXT NOT NULL UNIQUE,
    service_name TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'follower',
    provider_id INTEGER,
    provider_service_id INTEGER,
    min_quantity INTEGER NOT NULL,
    max_quantity INTEGER NOT NULL,
    cooldown_hours REAL NOT NULL DEFAULT 24,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS free_service_usages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    order_id INTEGER,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved',
    cooldown_until DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (offer_id) REFERENCES free_service_offers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id INTEGER,
    target_user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES users(id),
    FOREIGN KEY (target_user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS auth_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL,
    action TEXT NOT NULL,
    attempt_count INTEGER DEFAULT 0,
    window_started_at INTEGER NOT NULL,
    blocked_until INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(key_hash, action)
  )`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    name TEXT DEFAULT 'مفتاحي الرئيسي',
    requests_count INTEGER DEFAULT 0,
    last_used_at DATETIME,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS api_key_settings (
    api_key_id INTEGER PRIMARY KEY,
    mode TEXT NOT NULL DEFAULT 'classic',
    allow_catalog INTEGER NOT NULL DEFAULT 1,
    allow_balance INTEGER NOT NULL DEFAULT 1,
    allow_order_status INTEGER NOT NULL DEFAULT 1,
    allow_order_create INTEGER NOT NULL DEFAULT 1,
    allow_order_cancel INTEGER NOT NULL DEFAULT 1,
    custom_rate_limit INTEGER NOT NULL DEFAULT 120,
    hidden_services TEXT NOT NULL DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
  )`,
  `INSERT OR IGNORE INTO api_key_settings (api_key_id) SELECT id FROM api_keys`,
  `INSERT OR IGNORE INTO site_settings (id) VALUES ('default')`,
] as const;

const indexStatements = [
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_crypto_deposits_payment_id ON crypto_deposits(payment_id) WHERE payment_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_provider_services_provider ON provider_services(provider_id)`,
  `CREATE INDEX IF NOT EXISTS idx_provider_services_provider_remote ON provider_services(provider_id, remote_service_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_services_provider_remote_unique ON provider_services(provider_id, remote_service_id)`,
  `CREATE INDEX IF NOT EXISTS idx_provider_services_active ON provider_services(is_active, provider_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email)`,
  `CREATE INDEX IF NOT EXISTS idx_pending_registrations_firebase_uid ON pending_registrations(firebase_uid)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid) WHERE firebase_uid IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_pending_registrations_expires ON pending_registrations(expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_provider_status ON orders(provider_id, status, updated_at DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_idempotency ON orders(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys(user_id, is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_api_key_settings_updated ON api_key_settings(updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_admin_navigation_active ON admin_navigation_items(is_active, audience, sort_order, id)`,
  `CREATE INDEX IF NOT EXISTS idx_catalog_platform_buttons_active ON catalog_platform_buttons(is_active, sort_order, id)`,
  `CREATE INDEX IF NOT EXISTS idx_auth_attempts_updated_at ON auth_attempts(updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_free_offers_active ON free_service_offers(is_active, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_free_usages_user_offer ON free_service_usages(user_id, offer_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_free_usages_order ON free_service_usages(order_id)`,
] as const;

const schemaMigrations: SchemaMigration[] = [
  {
    table: "pending_registrations",
    columns: [["firebase_uid", "TEXT"]],
  },
  {
    table: "users",
    columns: [
      ["login_preference", "TEXT DEFAULT 'both'"],
      ["security_code_hash", "TEXT"],
      ["is_2fa_enabled", "INTEGER DEFAULT 0"],
      ["two_fa_user_configured", "INTEGER DEFAULT 0"],
      ["two_fa_frequency", "TEXT DEFAULT 'always'"],
      ["last_2fa_verified_at", "DATETIME"],
      ["email_verified", "INTEGER DEFAULT 1"],
      ["email_verification_token_hash", "TEXT"],
      ["email_verification_expires_at", "DATETIME"],
      ["firebase_uid", "TEXT"],
      ["auth_provider", "TEXT DEFAULT 'password'"],
      // libSQL لا يسمح بإضافة عمود قديم بقيمة افتراضية غير ثابتة عبر ALTER TABLE.
      ["updated_at", "DATETIME"],
    ],
  },
  {
    table: "orders",
    columns: [
      ["provider_id", "INTEGER"],
      ["idempotency_key", "TEXT"],
      ["start_count", "INTEGER"],
      ["remains", "INTEGER"],
      ["cancel_requested_at", "DATETIME"],
      ["refunded_at", "DATETIME"],
      ["public_service_id", "TEXT"],
    ],
  },
  {
    table: "crypto_deposits",
    columns: [
      ["payment_id", "TEXT"],
      ["order_id", "TEXT"],
      ["payment_status", "TEXT"],
      ["actually_paid", "REAL"],
      ["pay_currency", "TEXT"],
      ["ipn_received_at", "DATETIME"],
      ["confirmed_at", "DATETIME"],
    ],
  },
  {
    table: "providers",
    columns: [
      ["connection_status", "TEXT DEFAULT 'unknown'"],
      ["last_error", "TEXT"],
      ["last_probe_at", "DATETIME"],
    ],
  },
  {
    table: "admin_navigation_items",
    columns: [
      ["description_ar", "TEXT"],
      ["description_en", "TEXT"],
    ],
  },
  {
    table: "auto_refills",
    columns: [
      ["public_service_id", "TEXT"],
      ["service_name_ar", "TEXT"],
    ],
  },
  {
    table: "provider_services",
    columns: [
      ["is_new", "INTEGER DEFAULT 1"],
      ["pricing_mode", "TEXT DEFAULT 'markup'"],
      ["manual_price", "REAL"],
      ["description", "TEXT"],
      ["name_ar", "TEXT"],
      ["description_ar", "TEXT"],
      ["translation_source_hash", "TEXT"],
    ],
  },
  {
    table: "site_settings",
    columns: [
      ["secondaryColor", "TEXT DEFAULT '#fbbf24'"],
      ["primaryLight", "TEXT DEFAULT '#fdba74'"],
      ["siteDescription", "TEXT DEFAULT 'منصة خدمات تسويق اجتماعي احترافية'"],
      ["brandMediaUrl", "TEXT"],
      ["brandMediaType", "TEXT DEFAULT 'image'"],
      ["defaultCurrency", "TEXT DEFAULT 'USD'"],
      ["cryptoMinAmount", "REAL DEFAULT 1"],
      ["asiacellMinAmount", "REAL DEFAULT 0"],
      ["apiV2Enabled", "INTEGER DEFAULT 1"],
      ["registrationEnabled", "INTEGER DEFAULT 1"],
    ],
  },
];

async function executeSchemaBatch() {
  const statements = schemaStatements.map((sql) => ({ sql }));
  try {
    await db.batch(statements, "write");
  } catch {
    // بعض إصدارات libSQL أو البيئات القديمة لا تدعم DDL المختلط في batch؛
    // نعود إلى التنفيذ المتسلسل الآمن بدل تعطيل الإقلاع.
    for (const sql of schemaStatements) await db.execute(sql);
  }
}

async function readColumnNames(table: string): Promise<Set<string>> {
  const result = await db.execute({ sql: `PRAGMA table_info(${table})` });
  return new Set(
    (result.rows as ColumnRow[])
      .map((row) => String(row.name ?? ""))
      .filter(Boolean),
  );
}

async function applySchemaMigrations() {
  const columnSets = await Promise.all(schemaMigrations.map(({ table }) => readColumnNames(table)));
  const alterations: string[] = [];
  schemaMigrations.forEach((migration, index) => {
    for (const [column, definition] of migration.columns) {
      if (!columnSets[index].has(column)) {
        alterations.push(`ALTER TABLE ${migration.table} ADD COLUMN ${column} ${definition}`);
      }
    }
  });
  if (alterations.length > 0) {
    await db.batch(alterations.map((sql) => ({ sql })), "write");
  }

  // املأ الأعمدة الزمنية المضافة للصفوف القديمة بعد الترحيل، بدل استخدام
  // CURRENT_TIMESTAMP في تعريف ALTER TABLE غير المدعوم من SQLite/libSQL.
  if (alterations.some((sql) => sql.includes("ALTER TABLE users ADD COLUMN updated_at"))) {
    await db.execute("UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL");
  }

  // الحسابات القديمة التي أنشأها تدفق Firebase السابق حصلت على رمز تلقائيًا.
  // نعيدها إلى الوضع الاختياري مرة واحدة، مع إبقاء 2FA للحسابات المحلية التي كانت مفعّلة.
  if (alterations.some((sql) => sql.includes("ALTER TABLE users ADD COLUMN two_fa_user_configured"))) {
    await db.execute(`UPDATE users SET two_fa_user_configured = CASE
      WHEN LOWER(COALESCE(auth_provider, '')) LIKE 'firebase-email%' THEN 0
      WHEN COALESCE(is_2fa_enabled, 0) = 1 THEN 1
      ELSE 0
    END`);
    await db.execute(`UPDATE users SET is_2fa_enabled = 0, security_code_hash = NULL, last_2fa_verified_at = NULL
      WHERE LOWER(COALESCE(auth_provider, '')) LIKE 'firebase-email%' AND COALESCE(two_fa_user_configured, 0) = 0`);
  }
}

async function createIndexes() {
  await db.batch(indexStatements.map((sql) => ({ sql })), "write");
}

let initPromise: Promise<void> | null = null;

export function initDb(): Promise<void> {
  // لا نتجاوز التهيئة عند وجود SMMNINE_DB_SCHEMA_READY؛ قد تحتوي النسخة الجديدة على ترحيلات لازمة.
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await executeSchemaBatch();
    await applySchemaMigrations();
    await createIndexes();
  })().catch((error) => {
    initPromise = null;
    throw error;
  });
  return initPromise;
}
