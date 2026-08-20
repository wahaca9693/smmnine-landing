import { createHash, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { InStatement, ResultSet } from "@libsql/client";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
let authTablePromise: Promise<void> | null = null;

export class SecurityServiceUnavailable extends Error {
  constructor() {
    super("Authentication protection storage is temporarily unavailable");
    this.name = "SecurityServiceUnavailable";
  }
}

type SecurityStatement = InStatement;
type SecurityResult = ResultSet;

async function securityDbExecute(statement: SecurityStatement): Promise<SecurityResult> {
  try {
    return await Promise.race([
      db.execute(statement),
      new Promise<never>((_, reject) => setTimeout(() => reject(new SecurityServiceUnavailable()), 8000)),
    ]);
  } catch (error) {
    if (error instanceof SecurityServiceUnavailable) throw error;
    throw new SecurityServiceUnavailable();
  }
}

async function ensureAuthAttemptsTable(): Promise<void> {
  if (authTablePromise) return authTablePromise;
  authTablePromise = (async () => {
    await securityDbExecute({ sql: `
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
    `, args: [] });
    await securityDbExecute({ sql: `CREATE INDEX IF NOT EXISTS idx_auth_attempts_updated_at ON auth_attempts(updated_at)`, args: [] });
  })().catch((error) => {
    authTablePromise = null;
    throw error;
  });
  return authTablePromise;
}

type AuthAction = "register" | "login";

// وضع اختبار صريح للمعاينة المحلية فقط؛ لا يُفعل في الإنتاج إلا إذا عُيّن عمدًا.
const isPreviewSecurityTest = process.env.AUTH_SECURITY_MODE === "testing";

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

type TurnstileResult = {
  valid: boolean;
  enabled: boolean;
  errorCodes?: string[];
};

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getClientIp(request: Request): string {
  const cloudflareIp = toText(request.headers.get("cf-connecting-ip"));
  if (cloudflareIp) return cloudflareIp.slice(0, 128);

  const forwarded = toText(request.headers.get("x-forwarded-for"));
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 128);

  const realIp = toText(request.headers.get("x-real-ip"));
  return (realIp || "unknown").slice(0, 128);
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function keyHash(scope: string, value: string): string {
  return digest(`${scope}:${value.toLowerCase().trim()}`);
}

export function getRequestFingerprint(request: Request): string {
  const userAgent = toText(request.headers.get("user-agent")).slice(0, 256);
  return digest(`${getClientIp(request)}|${userAgent}`);
}

export function isSuspiciousRegistration({
  honeypot,
  formStartedAt,
}: {
  honeypot?: unknown;
  formStartedAt?: unknown;
}): boolean {
  if (toText(honeypot)) return true;
  const started = Number(formStartedAt);
  if (!Number.isFinite(started)) return true;
  const elapsed = Date.now() - started;
  return elapsed < 900 || elapsed > 1000 * 60 * 60 * 2;
}

async function checkKey({
  action,
  scope,
  value,
  limit,
  windowMs,
  blockMs,
}: {
  action: AuthAction;
  scope: string;
  value: string;
  limit: number;
  windowMs: number;
  blockMs: number;
}): Promise<RateLimitResult> {
  const hash = keyHash(scope, value);
  const now = Date.now();
  const result = await securityDbExecute({
    sql: "SELECT attempt_count, window_started_at, blocked_until FROM auth_attempts WHERE key_hash = ? AND action = ?",
    args: [hash, action],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  const blockedUntil = Number(row?.blocked_until || 0);

  if (blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil - now) / 1000)),
    };
  }

  const windowStartedAt = Number(row?.window_started_at || 0);
  const previousCount = Number(row?.attempt_count || 0);
  if (!row || !windowStartedAt || now - windowStartedAt >= windowMs) {
    await securityDbExecute({
      sql: `
        INSERT INTO auth_attempts (key_hash, action, attempt_count, window_started_at, blocked_until)
        VALUES (?, ?, 1, ?, 0)
        ON CONFLICT(key_hash, action) DO UPDATE SET
          attempt_count = 1,
          window_started_at = excluded.window_started_at,
          blocked_until = 0,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [hash, action, now],
    });
    return { allowed: true };
  }

  const nextCount = previousCount + 1;
  if (nextCount > limit) {
    const nextBlockedUntil = now + blockMs;
    await securityDbExecute({
      sql: "UPDATE auth_attempts SET attempt_count = ?, blocked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE key_hash = ? AND action = ?",
      args: [nextCount, nextBlockedUntil, hash, action],
    });
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(blockMs / 1000),
    };
  }

  await securityDbExecute({
    sql: "UPDATE auth_attempts SET attempt_count = ?, updated_at = CURRENT_TIMESTAMP WHERE key_hash = ? AND action = ?",
    args: [nextCount, hash, action],
  });
  return { allowed: true };
}

export async function checkAuthRateLimit(
  request: Request,
  action: AuthAction,
  identifier: string,
): Promise<RateLimitResult> {
  if (isPreviewSecurityTest) return { allowed: true };
  await ensureAuthAttemptsTable();
  const ip = getClientIp(request);
  const fingerprint = getRequestFingerprint(request);
  const normalizedIdentifier = identifier.toLowerCase().trim();

  const rules = action === "register"
    ? [
        { scope: "ip", value: ip, limit: 5, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 },
        { scope: "fingerprint", value: fingerprint, limit: 6, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 },
        { scope: "identifier", value: normalizedIdentifier, limit: 3, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 },
      ]
    : [
        { scope: "ip", value: ip, limit: 15, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 },
        { scope: "fingerprint", value: fingerprint, limit: 20, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 },
        { scope: "identifier", value: normalizedIdentifier, limit: 8, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 },
      ];

  const results = await Promise.all(rules.map((rule) => checkKey({ action, ...rule })));
  const mostRestrictiveRetry = results.reduce(
    (maxRetry, result) => result.allowed ? maxRetry : Math.max(maxRetry, result.retryAfterSeconds || 60),
    0,
  );

  return mostRestrictiveRetry > 0
    ? { allowed: false, retryAfterSeconds: mostRestrictiveRetry }
    : { allowed: true };
}

export async function clearAuthRateLimit(request: Request, action: AuthAction, identifier: string): Promise<void> {
  if (isPreviewSecurityTest) return;
  await ensureAuthAttemptsTable();
  const hashes = [
    keyHash("ip", getClientIp(request)),
    keyHash("fingerprint", getRequestFingerprint(request)),
    keyHash("identifier", identifier),
  ];
  for (const hash of hashes) {
    await securityDbExecute({
      sql: "DELETE FROM auth_attempts WHERE key_hash = ? AND action = ?",
      args: [hash, action],
    });
  }
}

export async function verifyTurnstileToken(
  request: Request,
  token: unknown,
  expectedAction = "auth",
): Promise<TurnstileResult> {
  if (isPreviewSecurityTest) return { valid: true, enabled: false };

  const secret = toText(process.env.TURNSTILE_SECRET_KEY);
  const required = process.env.TURNSTILE_REQUIRED === "1" || process.env.NODE_ENV === "production";
  if (!secret) {
    return required
      ? { valid: false, enabled: true, errorCodes: ["turnstile-not-configured"] }
      : { valid: true, enabled: false };
  }

  const responseToken = toText(token);
  if (!responseToken || responseToken.length > 2048) {
    return { valid: false, enabled: true, errorCodes: ["missing-input-response"] };
  }

  try {
    const verification = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: responseToken,
        remoteip: getClientIp(request),
        idempotency_key: randomUUID(),
      }),
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    const payload = await verification.json() as {
      success?: boolean;
      "error-codes"?: string[];
      action?: string;
      hostname?: string;
    };
    const errors = Array.isArray(payload["error-codes"]) ? payload["error-codes"] : [];
    const actionValid = !payload.action || payload.action === expectedAction;
    const hostname = toText(process.env.TURNSTILE_HOSTNAME);
    const hostnameValid = !hostname || !payload.hostname || payload.hostname === hostname;
    return {
      valid: Boolean(payload.success) && actionValid && hostnameValid,
      enabled: true,
      errorCodes: Boolean(payload.success) && actionValid && hostnameValid
        ? undefined
        : [...errors, ...(actionValid ? [] : ["invalid-action"]), ...(hostnameValid ? [] : ["invalid-hostname"])],
    };
  } catch (error) {
    console.error("Turnstile validation error:", error);
    return { valid: false, enabled: true, errorCodes: ["internal-error"] };
  }
}

export function securityErrorMessage(): string {
  return "تعذر التحقق من الطلب. أعد المحاولة بعد قليل.";
}
