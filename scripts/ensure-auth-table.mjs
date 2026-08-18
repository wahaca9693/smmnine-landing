import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) throw new Error("Turso environment is not configured");
const client = createClient({ url, authToken });
console.log("creating auth_attempts table...");
await client.execute(`
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
await client.execute(`CREATE INDEX IF NOT EXISTS idx_auth_attempts_updated_at ON auth_attempts(updated_at)`);
console.log("auth_attempts ready");
