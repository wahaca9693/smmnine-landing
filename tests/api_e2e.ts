// اختبار شامل لنظام API لكل مستخدم (SMM v2) — داخلي بدون مزود خارجي
// خطوات: شحن رصيد ← إنشاء مفتاح ← جلب الخدمات ← طلبات (مرفوض/ناجح) ← إلغاء واسترجاع الرصيد
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

type ApiKeyRecord = { id?: number | string; is_active?: boolean; api_key?: string };
type ApiService = { id: number | string; name: string; rate?: number | string; sell_rate?: number | string; min?: number | string; max?: number | string };

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  // تسجيل دخول
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const loggedIn = await page.evaluate(async () => {
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "qatest2026", password: "QaPass12345" }),
    });
    return res.ok;
  });
  console.log("1) تسجيل الدخول:", loggedIn ? "نجح" : "فشل");
  if (!loggedIn) { await browser.close(); process.exit(1); }

  const getBalance = async () =>
    await page.evaluate(async () => {
      const res = await fetch("http://localhost:3000/api/user");
      const d = await res.json();
      return Number(d.balance ?? 0);
    });

  // 2) شحن 10$ — عبر /api/admin/balance إن وُجد وإلا عبر API مباشرة؟ سنحاول POST /api/balance أولاً ثم DB
  const bal0 = await getBalance();
  console.log("2) رصيد المستخدم قبل الشحن:", bal0);

  if (bal0 < 5) {
    // شحن عبر /api/admin/balance (يحتاج admin cookie — غير متاح، لذا نستخدم DB مباشرة عبر سكربت؟ لا يمكن من هنا)
    // الحل: استخدام /api/deposit لإنشاء طلب شحن pending ثم تأكيده؟ لا — سنستخدم route شحن للمستخدم؟ لا يوجد.
    // الحل الآمن: لا شحن عبر DB — سنقوم به خارج Playwright قبل هذا السكربت.
    console.log("2b) يجب شحن الرصيد يدويًا أولًا — تخطي");
  }

  // 3) إنشاء مفتاح API
  const apiKey = await page.evaluate(async () => {
    const keys = await fetch("http://localhost:3000/api/api-access").then((r) => r.json());
    const active = keys.keys?.find((k: ApiKeyRecord) => k.is_active);
    if (active) return active.api_key;
    const res = await fetch("http://localhost:3000/api/api-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "مفتاح الاختبار" }),
    });
    const d = await res.json();
    return d.apiKey || null;
  });
  console.log("3) مفتاح API:", apiKey ? apiKey.slice(0, 14) + "..." + apiKey.slice(-4) : "فشل!");
  if (!apiKey) { await browser.close(); process.exit(1); }

  // 4) جلب الخدمات عبر المفتاح (محاكاة مستخدم خارجي — بدون cookies)
  const getRes = await fetch(`${BASE}/api/v2?key=${apiKey}`);
  const getData = await getRes.json();
  console.log("4) GET /api/v2?key= — HTTP:", getRes.status, "| count:", getData.count ?? getData.services?.length);
  if (getData.error) console.log("   خطأ:", getData.error);
  (getData.services || []).slice(0, 3).forEach((s: ApiService) => console.log("   خدمة:", s.id, s.name, "| rate:", s.rate, "| sell:", s.sell_rate, "| min/max:", s.min, s.max));

  // 5) طلب ناقص البيانات — رفض
  const bad1 = await fetch(`${BASE}/api/v2?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service: 1 }) });
  console.log("5) POST ناقص البيانات — HTTP:", bad1.status, "|", (await bad1.json()).error);

  // 6) طلب على خدمة غير موجودة — رفض بدون خصم
  const b2 = await fetch(`${BASE}/api/v2?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service: 9999, link: "https://x.com/qatest2026", quantity: 100 }) });
  console.log("6) POST خدمة غير موجودة — HTTP:", b2.status, "|", (await b2.json()).error);
  console.log("6b) رصيد بعد طلبات مرفوضة:", await getBalance());

  // 7) طلب ناجح على خدمة نشطة
  const svc = (getData.services || []).find((s: ApiService) => Number(s.min || 0) <= 100);
  if (!svc) {
    console.log("7) لا خدمات نشطة — تخطي الطلب الناجح (يجب شحن الرصيد وربط مزود أولًا)");
  } else {
    const cost = (100 / 1000) * Number(svc.sell_rate ?? svc.rate);
    console.log(`7) طلب 100 وحدة من "${svc.name}" — التكلفة ${cost}$`);
    const orderRes = await fetch(`${BASE}/api/v2?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: svc.id, link: "https://x.com/qatest2026", quantity: 100 }),
    });
    const orderData = await orderRes.json();
    console.log("   HTTP:", orderRes.status, "|", JSON.stringify(orderData).slice(0, 250));
    console.log("   رصيد بعد الطلب:", await getBalance());
    if (orderData.order) {
      // إلغاء داخلي — استرجاع الرصيد
      const cancelRes = await fetch(`${BASE}/api/v2?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", id: orderData.order }),
      });
      console.log("   إلغاء — HTTP:", cancelRes.status, "|", (await cancelRes.json()).error || "تم الإلغاء واسترجاع الرصيد");
      console.log("   رصيد بعد الإلغاء:", await getBalance());
    }
  }

  // 8) طلب مع رصيد غير كافٍ (سيُشحن صفر أو يرفض)
  // 9) مفتاح ملغى — رفض
  await page.evaluate(async () => {
    const keys = await fetch("http://localhost:3000/api/api-access").then((r) => r.json());
    const active = keys.keys?.find((k: ApiKeyRecord) => k.is_active);
    if (active) await fetch("http://localhost:3000/api/api-access", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: active.id, action: "revoke" }) });
  });
  const rev = await fetch(`${BASE}/api/v2?key=${apiKey}`);
  console.log("9) مفتاح ملغى — HTTP:", rev.status, "|", (await rev.json()).error);

  // 10) إنشاء مفتاح جديد بعد إلغاء القديم (يجب أن يعمل)
  const newKey = await page.evaluate(async () => {
    const res = await fetch("http://localhost:3000/api/api-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "مفتاح جديد" }) });
    const d = await res.json();
    return d.apiKey || null;
  });
  const newGet = await fetch(`${BASE}/api/v2?key=${newKey}`);
  console.log("10) مفتاح جديد بعد الإلغاء — HTTP:", newGet.status, "| count:", (await newGet.json()).count ?? "خطأ");

  await browser.close();
}

main().catch((e) => { console.error("E2E error:", e.message); process.exit(1); });
