import { NextResponse } from "next/server";
import { getSession, requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const userId = session.userId!;
    
    const { password, securityCode } = await req.json();
    
    if (!password) {
      return NextResponse.json({ error: "PASSWORD_REQUIRED" }, { status: 400 });
    }

    // 1. Fetch user data
    const result = await db.execute({
      sql: "SELECT password_hash, security_code_hash, is_2fa_enabled, two_fa_user_configured FROM users WHERE id = ?",
      args: [userId],
    });
    
    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    // 2. Verify 2FA if enabled
    if (Number(user.is_2fa_enabled) === 1 && Number(user.two_fa_user_configured || 0) === 1) {
      if (!securityCode) {
        return NextResponse.json({ error: "SECURITY_CODE_REQUIRED" }, { status: 400 });
      }
      
      const isSecurityCodeValid = await bcrypt.compare(String(securityCode), String(user.security_code_hash));
      if (!isSecurityCodeValid) {
        return NextResponse.json({ error: "INVALID_SECURITY_CODE" }, { status: 400 });
      }
    }

    // 3. Verify Password
    const isPasswordValid = await bcrypt.compare(password, String(user.password_hash));
    if (!isPasswordValid) {
      return NextResponse.json({ error: "INVALID_PASSWORD" }, { status: 400 });
    }

    // 4. Delete all account-owned data atomically before deleting the user.
    // The schema contains a mix of CASCADE and legacy references, so cleanup is explicit.
    await db.batch([
      { sql: "DELETE FROM provider_order_logs WHERE local_order_id IN (SELECT id FROM orders WHERE user_id = ?)", args: [userId] },
      { sql: "DELETE FROM ticket_replies WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM ticket_replies WHERE ticket_id IN (SELECT id FROM tickets WHERE user_id = ?)", args: [userId] },
      { sql: "DELETE FROM free_service_usages WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM gift_code_redemptions WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM api_key_settings WHERE api_key_id IN (SELECT id FROM api_keys WHERE user_id = ?)", args: [userId] },
      { sql: "DELETE FROM api_keys WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM auto_refills WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM reseller_requests WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM asiacell_sessions WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM notifications WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM crypto_deposits WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM transactions WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM tickets WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM orders WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM user_preferences WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM admin_audit_logs WHERE admin_user_id = ? OR target_user_id = ?", args: [userId, userId] },
      { sql: "UPDATE admin_navigation_items SET created_by = NULL WHERE created_by = ?", args: [userId] },
      { sql: "UPDATE gift_codes SET created_by = NULL WHERE created_by = ?", args: [userId] },
      { sql: "UPDATE free_service_offers SET created_by = NULL WHERE created_by = ?", args: [userId] },
      { sql: "DELETE FROM users WHERE id = ?", args: [userId] },
    ], "write");

    // 5. Destroy session
    const currentSession = await getSession();
    currentSession.destroy();

    return NextResponse.json({ success: true, message: "ACCOUNT_DELETED" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (message === "2FA_REQUIRED") return NextResponse.json({ error: "2FA_REQUIRED" }, { status: 403 });
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
