import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type NavigationPayload = { items: unknown[] };

const NAVIGATION_READ_TIMEOUT_MS = 2_200;
const NAVIGATION_CACHE_TTL_MS = 15_000;
let navigationCache: { value: NavigationPayload; expiresAt: number } | null = null;
let navigationLoadInFlight: Promise<NavigationPayload> | null = null;

async function loadNavigation(): Promise<NavigationPayload> {
  const now = Date.now();
  if (navigationCache && navigationCache.expiresAt > now) return navigationCache.value;
  if (navigationLoadInFlight) return navigationLoadInFlight;

  const load = (async () => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const result = await Promise.race([
        (async () => {
          await initDb();
          return db.execute(`
            SELECT id, label_ar, label_en, description_ar, description_en, href, icon, badge, badge_color, audience, sort_order
            FROM admin_navigation_items
            WHERE is_active = 1 AND audience IN ('user', 'both')
            ORDER BY sort_order, id
          `);
        })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("NAVIGATION_READ_TIMEOUT")), NAVIGATION_READ_TIMEOUT_MS);
        }),
      ]);
      const value: NavigationPayload = { items: result.rows };
      navigationCache = { value, expiresAt: Date.now() + NAVIGATION_CACHE_TTL_MS };
      return value;
    } catch {
      return { items: [] };
    } finally {
      if (timer) clearTimeout(timer);
    }
  })();

  navigationLoadInFlight = load;
  try {
    return await load;
  } finally {
    if (navigationLoadInFlight === load) navigationLoadInFlight = null;
  }
}

export async function GET() {
  const payload = await loadNavigation();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": navigationCache ? "private, max-age=15, stale-while-revalidate=30" : "no-store",
    },
  });
}
