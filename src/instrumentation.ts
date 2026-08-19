/**
 * تهيئة مبكرة لقاعدة البيانات حتى لا تنتظر أول عملية إدارية إنشاء الجداول والفهارس.
 * لا تُنفّذ أي طلبات إلى مزودي الخدمات الخارجيين.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  try {
    const { initDb } = await import("./lib/db");
    await initDb();
  } catch (error) {
    // لا نمنع إقلاع التطبيق؛ ستعيد مسارات API المحاولة عند أول طلب.
    console.error("[instrumentation] database warm-up failed", error);
  }
}
