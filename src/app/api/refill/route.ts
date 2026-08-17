import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "هذا المسار القديم متوقف لحماية الحساب. تكامل إعادة التعبئة المحمي يحتاج تنفيذًا مرتبطًا بملكية الطلب والمزود.",
      code: "LEGACY_ENDPOINT_DISABLED",
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
