import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { db, initDb } from "./db";
import { emailVerificationRequired } from "./email-verification";

export interface SessionData {
  userId?: number;
  username?: string;
  role?: string;
  isLoggedIn?: boolean;
  is2faVerified?: boolean;
  is2faEnabled?: boolean;
  emailVerified?: boolean;
  balance?: number;
}

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must be configured with at least 32 characters");
}

const sessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: "follower-session",
  cookieOptions: {
    // Production defaults to secure cookies. Set SESSION_COOKIE_SECURE=0 only
    // for local HTTP testing; HTTPS deployments should leave it enabled.
    secure: process.env.SESSION_COOKIE_SECURE === "0"
      ? false
      : process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days unless the user logs out
  },
};

function twoFaVerificationExpired(frequency: unknown, lastVerifiedAt: unknown): boolean {
  const mode = String(frequency || "always");
  if (mode === "always") return false;
  if (!lastVerifiedAt) return true;
  const raw = String(lastVerifiedAt);
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw) ? raw : `${raw.replace(" ", "T")}Z`;
  const verifiedAt = Date.parse(normalized);
  if (!Number.isFinite(verifiedAt)) return true;
  const durations: Record<string, number> = {
    hourly: 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };
  const duration = durations[mode];
  return duration ? Date.now() - verifiedAt >= duration : true;
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.isLoggedIn || typeof session.userId !== "number") {
    throw new Error("Unauthorized");
  }

  // طبّق ترحيلات المصادقة قبل قراءة حالة المستخدم في أي مسار.
  await initDb();
  // Fail closed instead of allowing a stalled database read to hang every authenticated route.
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      db.execute({ sql: "SELECT is_banned, is_2fa_enabled, two_fa_user_configured, two_fa_frequency, last_2fa_verified_at, email_verified FROM users WHERE id = ?", args: [session.userId] }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Auth state lookup timeout")), 3000);
      }),
    ]);
    const user = result.rows[0] as { is_banned?: unknown, is_2fa_enabled?: unknown, two_fa_user_configured?: unknown, two_fa_frequency?: unknown, last_2fa_verified_at?: unknown, email_verified?: unknown } | undefined;
    if (!user) {
      throw new Error("Unauthorized");
    }
    if (Number(user.is_banned)) {
      throw new Error("Account banned");
    }

    if (emailVerificationRequired() && !Number(user.email_verified)) {
      throw new Error("EMAIL_VERIFICATION_REQUIRED");
    }

    // لا يُفرض 2FA إلا إذا فعّله المستخدم من إعدادات الأمان صراحةً.
    const twoFaEnabled = Number(user.is_2fa_enabled) === 1 && Number(user.two_fa_user_configured ?? 0) === 1;
    session.is2faEnabled = twoFaEnabled;
    // If 2FA is enabled but not verified in session, block access except for specific routes
    if (twoFaEnabled && (!session.is2faVerified || twoFaVerificationExpired(user.two_fa_frequency, user.last_2fa_verified_at))) {
      if (session.is2faVerified) {
        session.is2faVerified = false;
        await session.save();
      }
      throw new Error("2FA_REQUIRED");
    }

    return session;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}
