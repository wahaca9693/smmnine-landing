import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { loginPreference, is2faEnabled, twoFaFrequency } = await req.json();

    await db.execute({
      sql: `UPDATE users SET 
            login_preference = ?, 
            is_2fa_enabled = ?, 
            two_fa_frequency = ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        loginPreference || "both",
        is2faEnabled ? 1 : 0,
        twoFaFrequency || "always",
        session.userId
      ]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update security settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
