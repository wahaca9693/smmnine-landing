import { NextResponse } from "next/server";
import { db, ensureCryptoDepositsTable } from "@/lib/db";

// نقطة فحص صحة عامة للتحقق من أن النشر شغّال وقاعدة البيانات reachable.
// لا تُرجع أي أسرار — فقط حالة الاتصال والعدّادات.
export const dynamic = "force-dynamic";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export async function GET() {
  const out: Record<string, unknown> = {
    status: "ok",
    version: APP_VERSION,
    env: process.env.NODE_ENV ?? "unknown",
    time: new Date().toISOString(),
    useLocalDb: process.env.USE_LOCAL_DB === "1",
    smmnineKeyConfigured: !!process.env.SMMNINE_API_KEY,
    asiacellProxyConfigured: !!(process.env.ASIACELL_PROXY_URL || process.env.ASIACELL_PROXIES),
  };

  try {
    const res = await withTimeout(db.execute("SELECT 1 AS ok"), 8000);
    out.db = res.rows[0]?.ok === 1 ? "connected" : "unexpected";
    try {
      // يضمن إنشاء جدول إيداعات الكريبتو على القواعد القديمة (self-healing)
      await ensureCryptoDepositsTable();
      const counts = await withTimeout(
        db.execute(
          `SELECT
             (SELECT COUNT(*) FROM users) AS users,
             (SELECT COUNT(*) FROM orders) AS orders,
             (SELECT COUNT(*) FROM tickets) AS tickets,
             (SELECT COUNT(*) FROM crypto_deposits) AS crypto_deposits`
        ),
        8000
      );
      out.counts = counts.rows[0] ?? {};
    } catch (err: any) {
      out.countsError = String(err?.message ?? err);
    }
  } catch (err: any) {
    out.db = "error";
    out.dbError = String(err?.message ?? err);
    out.status = "degraded";
  }

  const healthy = out.db === "connected";
  return NextResponse.json(out, { status: healthy ? 200 : 503 });
}
