import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      error: "هذا المسار القديم متوقف. استخدم GET /api/user داخل حسابك أو API v2 مع مفتاحك الخاص.",
      code: "LEGACY_ENDPOINT_DISABLED",
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
