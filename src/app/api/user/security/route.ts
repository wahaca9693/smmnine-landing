import { getSession } from "@/lib/auth";
import { db, initDb } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await initDb();
    const user = await db.execute({
      sql: "SELECT login_preference, is_2fa_enabled, two_fa_user_configured, two_fa_frequency, security_code_hash FROM users WHERE id = ?",
      args: [session.userId]
    });

    if (user.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const row = user.rows[0] as {
      login_preference?: unknown;
      is_2fa_enabled?: unknown;
      two_fa_user_configured?: unknown;
      two_fa_frequency?: unknown;
      security_code_hash?: unknown;
    };
    return NextResponse.json({
      settings: {
        loginPreference: row.login_preference || "both",
        is2faEnabled: Number(row.is_2fa_enabled) === 1 && Number(row.two_fa_user_configured || 0) === 1,
        twoFaFrequency: row.two_fa_frequency || "always",
        hasSecurityCode: Boolean(row.security_code_hash)
      }
    });
  } catch (error) {
    console.error("Failed to fetch security settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
