import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type PreferenceRow = Record<string, unknown>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

const defaults = {
  email_notifications: true,
  order_status_notifications: true,
  auto_refresh_orders: true,
  refresh_interval_seconds: 30,
  compact_mode: false,
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function asBoolean(value: unknown, fallback: boolean) {
  if (value === undefined) return fallback;
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  throw new Error("قيمة منطقية غير صالحة");
}

function normalize(body: Record<string, unknown>) {
  const refresh = body.refresh_interval_seconds === undefined
    ? defaults.refresh_interval_seconds
    : Number(body.refresh_interval_seconds);
  if (!Number.isInteger(refresh) || refresh < 10 || refresh > 300) {
    throw new Error("فترة التحديث يجب أن تكون بين 10 و300 ثانية");
  }

  return {
    email_notifications: asBoolean(body.email_notifications, defaults.email_notifications),
    order_status_notifications: asBoolean(body.order_status_notifications, defaults.order_status_notifications),
    auto_refresh_orders: asBoolean(body.auto_refresh_orders, defaults.auto_refresh_orders),
    refresh_interval_seconds: refresh,
    compact_mode: asBoolean(body.compact_mode, defaults.compact_mode),
  };
}

function serialize(row: PreferenceRow | undefined) {
  return {
    email_notifications: Boolean(Number(row?.email_notifications ?? (defaults.email_notifications ? 1 : 0))),
    order_status_notifications: Boolean(Number(row?.order_status_notifications ?? (defaults.order_status_notifications ? 1 : 0))),
    auto_refresh_orders: Boolean(Number(row?.auto_refresh_orders ?? (defaults.auto_refresh_orders ? 1 : 0))),
    refresh_interval_seconds: Number(row?.refresh_interval_seconds ?? defaults.refresh_interval_seconds),
    compact_mode: Boolean(Number(row?.compact_mode ?? (defaults.compact_mode ? 1 : 0))),
  };
}

export async function GET() {
  try {
    const session = await requireAuth();
    const result = await db.execute({
      sql: "SELECT email_notifications, order_status_notifications, auto_refresh_orders, refresh_interval_seconds, compact_mode FROM user_preferences WHERE user_id = ?",
      args: [session.userId!],
    });
    return json({ preferences: serialize(result.rows[0]) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return json({ error: message === "Forbidden" ? "الحساب محظور" : "يرجى تسجيل الدخول" }, message === "Forbidden" ? 403 : 401);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const rawBody: unknown = await request.json().catch(() => ({}));
    const body = rawBody && typeof rawBody === "object" && !Array.isArray(rawBody) ? rawBody as Record<string, unknown> : {};
    const preferences = normalize(body);

    await db.execute({
      sql: `INSERT INTO user_preferences
        (user_id, email_notifications, order_status_notifications, auto_refresh_orders, refresh_interval_seconds, compact_mode, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          email_notifications = excluded.email_notifications,
          order_status_notifications = excluded.order_status_notifications,
          auto_refresh_orders = excluded.auto_refresh_orders,
          refresh_interval_seconds = excluded.refresh_interval_seconds,
          compact_mode = excluded.compact_mode,
          updated_at = CURRENT_TIMESTAMP`,
      args: [
        session.userId!,
        preferences.email_notifications ? 1 : 0,
        preferences.order_status_notifications ? 1 : 0,
        preferences.auto_refresh_orders ? 1 : 0,
        preferences.refresh_interval_seconds,
        preferences.compact_mode ? 1 : 0,
      ],
    });

    return json({ success: true, preferences });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : message.includes("غير صالحة") || message.includes("بين 10") ? 400 : 500;
    return json({ error: status === 403 ? "الحساب محظور" : status === 401 ? "يرجى تسجيل الدخول" : status === 400 ? message : "تعذر حفظ التفضيلات" }, status);
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
