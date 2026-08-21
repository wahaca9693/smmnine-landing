import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

type DbRow = Record<string, unknown>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

function countFrom(row: DbRow | undefined, key: string) {
  return Number(row?.[key] || 0);
}

export async function GET() {
  try {
    await requireAdmin();
    const started = Date.now();
    const requiredTables = ["users", "orders", "site_settings", "providers", "provider_services", "crypto_deposits", "tickets", "api_keys", "admin_audit_logs"];
    const [probe, tables, users, orders, providers, providerServices, deposits, tickets] = await Promise.all([
      db.execute("SELECT 1 AS ok"),
      db.execute({ sql: "SELECT name FROM sqlite_master WHERE type = 'table'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) AS total, SUM(CASE WHEN is_banned = 1 THEN 1 ELSE 0 END) AS banned FROM users WHERE role != 'admin'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) AS total, SUM(CASE WHEN status IN ('pending', 'in_progress', 'processing') THEN 1 ELSE 0 END) AS pending FROM orders", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) AS total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active FROM providers", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) AS total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active FROM provider_services", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) AS total, SUM(CASE WHEN status IN ('waiting', 'pending', 'confirming') THEN 1 ELSE 0 END) AS pending FROM crypto_deposits", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) AS total, SUM(CASE WHEN status IN ('open', 'pending', 'in_progress') THEN 1 ELSE 0 END) AS open FROM tickets", args: [] }),
    ]);
    const knownTables = new Set(tables.rows.map((row) => String((row as DbRow).name || "")));
    const missingTables = requiredTables.filter((name) => !knownTables.has(name));
    const databaseLatencyMs = Date.now() - started;
    const blobReady = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
    const localStorageAllowed = process.env.NODE_ENV !== "production";
    const nowPaymentsReady = Boolean(process.env.NOWPAYMENTS_API_KEY && (process.env.NOWPAYMENTS_IPN_SECRET || process.env.NOWPAYMENTS_IPN_SECRET_KEY));
    const asiaCellReady = Boolean(process.env.ASIACELL_PROXY_URL || process.env.ASIACELL_PROXIES);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      overall: missingTables.length === 0 && Boolean(probe.rows.length) ? "healthy" : "attention",
      database: { status: missingTables.length === 0 ? "healthy" : "attention", latencyMs: databaseLatencyMs, connected: Boolean(probe.rows.length), missingTables },
      integrations: {
        nowPayments: { status: nowPaymentsReady ? "ready" : "not_configured", credentialsPresent: nowPaymentsReady },
        asiaCell: { status: asiaCellReady ? "ready" : "not_configured", proxyConfigured: asiaCellReady },
        storage: { mode: blobReady ? "blob" : "local", status: blobReady || localStorageAllowed ? "ready" : "attention", blobConfigured: blobReady },
      },
      metrics: {
        users: { total: countFrom(users.rows[0] as DbRow | undefined, "total"), banned: countFrom(users.rows[0] as DbRow | undefined, "banned") },
        orders: { total: countFrom(orders.rows[0] as DbRow | undefined, "total"), pending: countFrom(orders.rows[0] as DbRow | undefined, "pending") },
        providers: { total: countFrom(providers.rows[0] as DbRow | undefined, "total"), active: countFrom(providers.rows[0] as DbRow | undefined, "active") },
        providerServices: { total: countFrom(providerServices.rows[0] as DbRow | undefined, "total"), active: countFrom(providerServices.rows[0] as DbRow | undefined, "active") },
        deposits: { total: countFrom(deposits.rows[0] as DbRow | undefined, "total"), pending: countFrom(deposits.rows[0] as DbRow | undefined, "pending") },
        tickets: { total: countFrom(tickets.rows[0] as DbRow | undefined, "total"), open: countFrom(tickets.rows[0] as DbRow | undefined, "open") },
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized" ? 401 : (message === "Forbidden" || message === "Account banned" ? 403 : 500);
    return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر قراءة صحة النظام" }, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
