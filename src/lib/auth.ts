import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { db } from "./db";

export interface SessionData {
  userId?: number;
  username?: string;
  role?: string;
  isLoggedIn?: boolean;
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
  if (!session.isLoggedIn) {
    throw new Error("Unauthorized");
  }
  // Check ban status from DB
  const result = await db.execute({ sql: "SELECT is_banned FROM users WHERE id = ?", args: [session.userId!] });
  const user = result.rows[0] as { is_banned?: unknown } | undefined;
  if (user && Number(user.is_banned)) {
    throw new Error("Account banned");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}
