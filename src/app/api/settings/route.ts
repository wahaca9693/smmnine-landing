import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const keys = [
  "siteName",
  "siteDescription",
  "defaultCurrency",
  "primaryColor",
  "secondaryColor",
  "primaryLight",
  "backgroundColor",
  "cardColor",
  "surfaceColor",
  "borderColor",
  "cryptoMinAmount",
  "asiacellMinAmount",
  "apiV2Enabled",
] as const;

type SettingKey = (typeof keys)[number];

const aliases: Record<string, SettingKey> = {
  site_name: "siteName",
  theme_primary: "primaryColor",
  theme_gold: "secondaryColor",
  site_description: "siteDescription",
  default_currency: "defaultCurrency",
  crypto_min_amount: "cryptoMinAmount",
  asiacell_min_amount: "asiacellMinAmount",
  api_v2_enabled: "apiV2Enabled",
};

const defaults: Record<SettingKey, string | number> = {
  siteName: "Follower",
  siteDescription: "منصة خدمات تسويق اجتماعي احترافية",
  defaultCurrency: "USD",
  primaryColor: "#f97316",
  secondaryColor: "#fbbf24",
  primaryLight: "#fdba74",
  backgroundColor: "#050505",
  cardColor: "#111111",
  surfaceColor: "#1a1a1a",
  borderColor: "#27272a",
  cryptoMinAmount: 1,
  asiacellMinAmount: 0,
  apiV2Enabled: 1,
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function readSettings(row: any) {
  const settings: Record<string, string | number | boolean> = {};
  for (const key of keys) {
    const fallback = defaults[key];
    const value = row?.[key] ?? fallback;
    settings[key] = key === "apiV2Enabled" ? Boolean(Number(value)) : value;
  }
  settings.site_name = String(settings.siteName);
  settings.theme_primary = String(settings.primaryColor);
  settings.theme_gold = String(settings.secondaryColor);
  return settings;
}

function validColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeValue(key: SettingKey, value: unknown): string | number | null {
  if (["primaryColor", "secondaryColor", "primaryLight", "backgroundColor", "cardColor", "surfaceColor", "borderColor"].includes(key)) {
    return typeof value === "string" && validColor(value) ? value : null;
  }
  if (["cryptoMinAmount", "asiacellMinAmount"].includes(key)) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 1000000 ? number : null;
  }
  if (key === "apiV2Enabled") return value === true || value === 1 || value === "1" ? 1 : 0;
  if (key === "defaultCurrency") {
    const currency = String(value || "").trim().toUpperCase();
    return /^[A-Z]{3}$/.test(currency) ? currency : null;
  }
  const text = String(value ?? "").trim();
  return text.length > 0 && text.length <= 240 ? text : null;
}

export async function GET() {
  try {
    const result = await db.execute("SELECT * FROM site_settings LIMIT 1");
    return json({ settings: readSettings(result.rows[0] || {}) });
  } catch (err: any) {
    return json({ error: err?.message || "تعذر تحميل الإعدادات" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const updates = new Map<SettingKey, string | number>();

    for (const [rawKey, rawValue] of Object.entries(body || {})) {
      const key = (keys as readonly string[]).includes(rawKey) ? rawKey as SettingKey : aliases[rawKey];
      if (!key) continue;
      const value = normalizeValue(key, rawValue);
      if (value === null) return json({ error: `قيمة غير صالحة للإعداد: ${rawKey}` }, 400);
      updates.set(key, value);
    }

    if (updates.size === 0) return json({ error: "لم يتم إرسال إعدادات قابلة للحفظ" }, 400);

    const existing = await db.execute("SELECT id FROM site_settings LIMIT 1");
    const existingId = (existing.rows[0] as any)?.id || "default";
    if (existing.rows.length === 0) {
      const insertKeys = Array.from(updates.keys());
      await db.execute({
        sql: `INSERT INTO site_settings (id, ${insertKeys.join(", ")}) VALUES (?, ${insertKeys.map(() => "?").join(", ")})`,
        args: [existingId, ...insertKeys.map((key) => updates.get(key))],
      });
    } else {
      const updateKeys = Array.from(updates.keys());
      await db.execute({
        sql: `UPDATE site_settings SET ${updateKeys.map((key) => `${key} = ?`).join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [...updateKeys.map((key) => updates.get(key)), existingId],
      });
    }

    const result = await db.execute("SELECT * FROM site_settings LIMIT 1");
    return json({ success: true, settings: readSettings(result.rows[0] || {}) });
  } catch (err: any) {
    const message = String(err?.message || "");
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر حفظ الإعدادات" }, status);
  }
}
