import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { db } from "./db";

export interface SessionData {
  userId?: number;
  username?: string;
  role?: string;
  isLoggedIn?: boolean;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "smmnine-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
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
  const user = result.rows[0] as any;
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
