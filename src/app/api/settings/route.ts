import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { invalidateApiV2EnabledCache } from "@/lib/api-v2-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const keys = [
  "siteName",
  "brandMediaUrl",
  "brandMediaType",
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
  "registrationEnabled",
] as const;

type SettingKey = (typeof keys)[number];

const aliases: Record<string, SettingKey> = {
  site_name: "siteName",
  brand_media_url: "brandMediaUrl",
  brand_media_type: "brandMediaType",
  theme_primary: "primaryColor",
  theme_gold: "secondaryColor",
  site_description: "siteDescription",
  default_currency: "defaultCurrency",
  crypto_min_amount: "cryptoMinAmount",
  asiacell_min_amount: "asiacellMinAmount",
  api_v2_enabled: "apiV2Enabled",
  registration_enabled: "registrationEnabled",
};

const defaults: Record<SettingKey, string | number> = {
  siteName: "follower",
  brandMediaUrl: "",
  brandMediaType: "image",
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
  registrationEnabled: 1,
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

type SettingsRow = Record<string, unknown>;
type SettingsData = Record<string, string | number | boolean>;

const SETTINGS_CACHE_TTL_MS = 30_000;
const SETTINGS_READ_TIMEOUT_MS = 2_200;
let settingsCache: { value: SettingsData; expiresAt: number } | null = null;
let settingsLoadInFlight: Promise<SettingsData> | null = null;

function readSettings(row: SettingsRow): SettingsData {
  const settings: Record<string, string | number | boolean> = {};
  for (const key of keys) {
    const fallback = defaults[key];
    const rawValue = row?.[key] ?? fallback;
    const value = typeof rawValue === "string" || typeof rawValue === "number" ? rawValue : fallback;
    settings[key] = ["apiV2Enabled", "registrationEnabled"].includes(key) ? Boolean(Number(value)) : value;
  }
  settings.site_name = String(settings.siteName);
  settings.theme_primary = String(settings.primaryColor);
  settings.theme_gold = String(settings.secondaryColor);
  return settings;
}

async function loadSettingsFromDatabase(): Promise<SettingsData> {
  const now = Date.now();
  if (settingsCache && settingsCache.expiresAt > now) return settingsCache.value;
  if (settingsLoadInFlight) return settingsLoadInFlight;

  const load = (async () => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const result = await Promise.race([
        db.execute("SELECT * FROM site_settings LIMIT 1"),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("SETTINGS_READ_TIMEOUT")), SETTINGS_READ_TIMEOUT_MS);
        }),
      ]);
      const settings = readSettings(result.rows[0] || {});
      settingsCache = { value: settings, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS };
      return settings;
    } catch {
      // لا نسمح لتعثر قاعدة البيانات بتعليق واجهة المنصة؛ القيم الافتراضية آمنة للقراءة فقط.
      return readSettings({});
    } finally {
      if (timer) clearTimeout(timer);
    }
  })();

  settingsLoadInFlight = load;
  try {
    return await load;
  } finally {
    if (settingsLoadInFlight === load) settingsLoadInFlight = null;
  }
}

function validColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeValue(key: SettingKey, value: unknown): string | number | null {
  if (key === "brandMediaType") {
    return value === "video" ? "video" : value === "image" ? "image" : null;
  }
  if (key === "brandMediaUrl") {
    const text = String(value ?? "").trim();
    if (!text) return "";
    if (text.length > 2048 || !(text.startsWith("/") || /^https:\/\//i.test(text))) return null;
    return text;
  }
  if (["primaryColor", "secondaryColor", "primaryLight", "backgroundColor", "cardColor", "surfaceColor", "borderColor"].includes(key)) {
    return typeof value === "string" && validColor(value) ? value : null;
  }
  if (["cryptoMinAmount", "asiacellMinAmount"].includes(key)) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 1000000 ? number : null;
  }
  if (["apiV2Enabled", "registrationEnabled"].includes(key)) return value === true || value === 1 || value === "1" ? 1 : 0;
  if (key === "defaultCurrency") {
    const currency = String(value || "").trim().toUpperCase();
    return /^[A-Z]{3}$/.test(currency) ? currency : null;
  }
  const text = String(value ?? "").trim();
  const maxLength = key === "siteName" ? 80 : 240;
  return text.length > 0 && text.length <= maxLength ? text : null;
}

export async function GET() {
  try {
    return json({ settings: await loadSettingsFromDatabase() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "تعذر تحميل الإعدادات";
    return json({ error: message }, 500);
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

      // Protect official brand logo from being changed via API
      if (key === "brandMediaUrl" || key === "brandMediaType") continue;

      const value = normalizeValue(key, rawValue);
      if (value === null) return json({ error: `قيمة غير صالحة للإعداد: ${rawKey}` }, 400);
      updates.set(key, value);
    }

    if (updates.size === 0) return json({ error: "لم يتم إرسال إعدادات قابلة للحفظ" }, 400);

    const existing = await db.execute("SELECT id FROM site_settings LIMIT 1");
    const existingId = String((existing.rows[0] as Record<string, unknown> | undefined)?.id || "default");
    const valueFor = (key: SettingKey): string | number => {
      const value = updates.get(key);
      if (value === undefined) throw new Error(`Missing setting value: ${key}`);
      return value;
    };
    if (existing.rows.length === 0) {
      const insertKeys = Array.from(updates.keys());
      await db.execute({
        sql: `INSERT INTO site_settings (id, ${insertKeys.join(", ")}) VALUES (?, ${insertKeys.map(() => "?").join(", ")})`,
        args: [existingId, ...insertKeys.map(valueFor)],
      });
    } else {
      const updateKeys = Array.from(updates.keys());
      await db.execute({
        sql: `UPDATE site_settings SET ${updateKeys.map((key) => `${key} = ?`).join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [...updateKeys.map(valueFor), existingId],
      });
    }

    const result = await db.execute("SELECT * FROM site_settings LIMIT 1");
    const settings = readSettings(result.rows[0] || {});
    settingsCache = { value: settings, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS };
    if (updates.has("apiV2Enabled")) invalidateApiV2EnabledCache();
    return json({ success: true, settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر حفظ الإعدادات" }, status);
  }
}
