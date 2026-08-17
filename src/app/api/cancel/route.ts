import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "هذا المسار القديم متوقف. استخدم POST /api/v2 مع action=cancel ومفتاح API الخاص بحسابك.",
      code: "LEGACY_ENDPOINT_DISABLED",
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
