import { getSession } from "@/lib/auth";
import { db, initDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const LOGIN_PREFERENCES = new Set(["both", "username", "email"]);
const TWO_FA_FREQUENCIES = new Set(["always", "hourly", "daily", "weekly", "monthly"]);

function isSixDigitCode(value: unknown): value is string {
  return typeof value === "string" && /^\d{6}$/.test(value.trim());
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "غير مصرح به" }, { status: 401 });
    }

    await initDb();
    const body = await req.json() as {
      loginPreference?: unknown;
      is2faEnabled?: unknown;
      twoFaFrequency?: unknown;
      securityCode?: unknown;
    };

    const loginPreference = typeof body.loginPreference === "string" && LOGIN_PREFERENCES.has(body.loginPreference)
      ? body.loginPreference
      : "both";
    const twoFaFrequency = typeof body.twoFaFrequency === "string" && TWO_FA_FREQUENCIES.has(body.twoFaFrequency)
      ? body.twoFaFrequency
      : "always";
    const is2faEnabled = body.is2faEnabled === true;
    const securityCode = typeof body.securityCode === "string" ? body.securityCode.trim() : "";

    const currentResult = await db.execute({
      sql: "SELECT is_2fa_enabled, security_code_hash FROM users WHERE id = ? LIMIT 1",
      args: [session.userId],
    });
    const current = currentResult.rows[0] as {
      is_2fa_enabled?: number | string | boolean;
      security_code_hash?: string | null;
    } | undefined;

    if (!current) {
      return NextResponse.json({ error: "لم يتم العثور على الحساب" }, { status: 404 });
    }

    const was2faEnabled = Number(current.is_2fa_enabled || 0) === 1;
    const currentHash = typeof current.security_code_hash === "string" && current.security_code_hash.length > 0
      ? current.security_code_hash
      : null;
    const changes2faState = was2faEnabled !== is2faEnabled;
    const needsSecurityCode = is2faEnabled || was2faEnabled || changes2faState;

    if (needsSecurityCode) {
      if (!isSixDigitCode(securityCode)) {
        return NextResponse.json({
          error: currentHash
            ? "أدخل رمز الأمان الحالي المكوّن من 6 أرقام لإتمام العملية"
            : "أنشئ رمز أمان مكوّنًا من 6 أرقام لإتمام التفعيل",
          code: "SECURITY_CODE_REQUIRED",
        }, { status: 400 });
      }

      if (currentHash) {
        const valid = await bcrypt.compare(securityCode, currentHash);
        if (!valid) {
          return NextResponse.json({ error: "رمز الأمان غير صحيح", code: "INVALID_SECURITY_CODE" }, { status: 401 });
        }
      } else if (is2faEnabled) {
        const newHash = await bcrypt.hash(securityCode, 12);
        await db.execute({
          sql: "UPDATE users SET security_code_hash = ? WHERE id = ?",
          args: [newHash, session.userId],
        });
      }
    }

    await db.execute({
      sql: `UPDATE users SET
            login_preference = ?,
            is_2fa_enabled = ?,
            two_fa_user_configured = 1,
            two_fa_frequency = ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [loginPreference, is2faEnabled ? 1 : 0, twoFaFrequency, session.userId],
    });

    return NextResponse.json({
      success: true,
      settings: {
        loginPreference,
        is2faEnabled,
        twoFaFrequency,
        hasSecurityCode: Boolean(currentHash || (is2faEnabled && isSixDigitCode(securityCode))),
      },
    });
  } catch (error) {
    console.error("Failed to update security settings:", error);
    return NextResponse.json({ error: "تعذر حفظ إعدادات الأمان. حاول مرة أخرى." }, { status: 500 });
  }
}
