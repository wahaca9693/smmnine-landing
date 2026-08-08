import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const keys = ["siteName", "primaryColor", "backgroundColor", "cardColor", "surfaceColor", "borderColor"];

export async function GET() {
  try {
    const result = await db.execute("SELECT * FROM site_settings LIMIT 1");
    const row = result.rows[0] || {};
    const settings: Record<string, string> = {};
    for (const k of keys) {
      settings[k] = String((row as any)[k] ?? "");
    }
    // Fallbacks
    if (!settings.primaryColor) settings.primaryColor = "var(--color-primary)";
    if (!settings.backgroundColor) settings.backgroundColor = "var(--color-bg)";
    if (!settings.cardColor) settings.cardColor = "var(--color-card)";
    if (!settings.surfaceColor) settings.surfaceColor = "var(--color-surface)";
    if (!settings.borderColor) settings.borderColor = "var(--color-border)";
    if (!settings.siteName) settings.siteName = "Follower";
    return NextResponse.json({ settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const sets: string[] = [];
    const values: any[] = [];
    for (const k of keys) {
      if (body[k] !== undefined) {
        sets.push(`${k} = ?`);
        values.push(body[k]);
      }
    }
    if (sets.length === 0) {
      return NextResponse.json({ error: "No settings provided" }, { status: 400 });
    }
    const existing = await db.execute("SELECT id FROM site_settings LIMIT 1");
    if (existing.rows.length === 0) {
      values.unshift("default");
      await db.execute({
        sql: `INSERT INTO site_settings (id, ${keys.join(", ")}) VALUES (${new Array(keys.length + 1).fill("?").join(", ")})`,
        args: values,
      });
    } else {
      values.push((existing.rows[0] as any).id);
      await db.execute({
        sql: `UPDATE site_settings SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: values,
      });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
