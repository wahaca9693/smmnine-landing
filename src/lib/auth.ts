import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { db } from "./db";

export interface SessionData {
  userId?: number;
  username?: string;
  role?: string;
  isLoggedIn?: boolean;
  is2faVerified?: boolean;
  is2faEnabled?: boolean;
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

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.isLoggedIn || typeof session.userId !== "number") {
    throw new Error("Unauthorized");
  }

  // Fail closed instead of allowing a stalled database read to hang every authenticated route.
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      db.execute({ sql: "SELECT is_banned, is_2fa_enabled FROM users WHERE id = ?", args: [session.userId] }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Auth state lookup timeout")), 3000);
      }),
    ]);
    const user = result.rows[0] as { is_banned?: unknown, is_2fa_enabled?: unknown } | undefined;
    if (!user) {
      throw new Error("Unauthorized");
    }
    if (Number(user.is_banned)) {
      throw new Error("Account banned");
    }

    // If 2FA is enabled but not verified in session, block access except for specific routes
    if (Number(user.is_2fa_enabled) && !session.is2faVerified) {
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
