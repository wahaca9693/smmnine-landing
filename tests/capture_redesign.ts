// سكربت تصوير شاشات 390px للتحقق من التصميم الجديد
// لا يقوم بأي طلب خدمة فعلي ولا بأي شحن حقيقي
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  // 0) افتح صفحة أولًا حتى تتوفر location ثم سجّل الدخول
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });

  // 1) تسجيل دخول تجريبي داخل الصفحة نفسها (cookies تُضبط تلقائيًا)
  const loginOk = await page.evaluate(async () => {
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "qatest2026", password: "QaPass12345" }),
    });
    return res.ok;
  });
  console.log("Page-login ok:", loginOk);
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "shots/login_screen.png", fullPage: false });

  // 1b) لقطة صفحة تسجيل الدخول قبل تسجيل الدخول — التحقق من زر "دخول" الجديد
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await page.mouse.move(2000, 2000);
  await page.screenshot({ path: "shots/login_button_new.png", fullPage: false });

  // انتظار التحميل + تحقق من /api/user داخل الصفحة (التحويل client-side بعد fetch)
  await page.waitForTimeout(2000);
  const url = page.url();
  const loggedIn = await page.evaluate(async () => {
    const res = await fetch("http://localhost:3000/api/user");
    const data = await res.json();
    return !data.error;
  });
  console.log("URL after login attempt:", url, "| loggedIn:", loggedIn);

  if (loggedIn) {
    // 2) صفحة الدعم — التصميم الذهبي الجديد
    await page.screenshot({ path: "shots/support_gold.png", fullPage: false });
    await page.waitForTimeout(400);

    // 3) صفحة التذاكر
    await page.goto(`${BASE}/dashboard/tickets`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "shots/tickets_gold.png", fullPage: false });
    await page.waitForTimeout(400);

    // 4) صفحة الطلبات — بطاقات ذهبية + أيقونات حالة متحركة
    await page.goto(`${BASE}/orders`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "shots/orders_gold.png", fullPage: false });
    await page.waitForTimeout(400);

    // 5) صفحة بوابة API — صناديق الكود وزر الرجوع
    await page.goto(`${BASE}/api-access`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "shots/api_gold.png", fullPage: false });
    await page.waitForTimeout(300);

    // 6) اختبار BottomNav الجديد (غير شفاف) + الإخفاء عند النزول
    await page.evaluate(async () => {
      window.scrollTo(0, 600);
      await new Promise((r) => setTimeout(r, 500));
      window.scrollTo(0, 100);
      await new Promise((r) => setTimeout(r, 500));
    });
    await page.screenshot({ path: "shots/nav_bottom_new.png", fullPage: false });
    await page.waitForTimeout(300);

    // 6b) صفحة شحن الرصيد — شعارات العملات
    await page.goto(`${BASE}/deposit`, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    await page.screenshot({ path: "shots/deposit_gold.png", fullPage: false });
    await page.waitForTimeout(300);

    // 7) لوحة تبديل اللغة — فتح القائمة واختيار اللغة
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    // أزرار Header بالترتيب: [0]=Bell [1]=User [2]=Menu — النقر على Menu لفتح القائمة
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("header button"));
      if (btns.length >= 3) (btns[2] as HTMLElement).click();
    });
    await page.waitForTimeout(700);
    await page.screenshot({ path: "shots/menu_open.png", fullPage: false });
    await page.waitForTimeout(300);

    // فتح لوحة اللغة — عنصر اللغة في القائمة الجانبية (داخل overflow)
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll("aside a, aside button")).filter((b) => /اللغة|Language/.test(b.textContent || ""));
      if (items[0]) (items[0] as HTMLElement).click();
    });
    await page.waitForTimeout(700);
    await page.screenshot({ path: "shots/lang_panel.png", fullPage: false });
    await page.waitForTimeout(300);

    // التبديل للإنجليزية — الزر داخل sheet اللغة
    const enBtn = await page.locator('button:has-text("English")').first();
    await enBtn.scrollIntoViewIfNeeded().catch(() => {});
    await enBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "shots/lang_en.png", fullPage: false });
    await page.waitForTimeout(300);

    // 8) صفحة الطلبات بالإنجليزية
    await page.goto(`${BASE}/orders`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "shots/orders_en.png", fullPage: false });
    await page.waitForTimeout(300);

    // 9) صفحة API بالإنجليزية
    await page.goto(`${BASE}/api-access`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "shots/api_en.png", fullPage: false });
    await page.waitForTimeout(300);

    // 10) صفحة الدعم بالإنجليزية
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "shots/support_en.png", fullPage: false });
    await page.waitForTimeout(300);

    console.log("All captures done");
  }

  await browser.close();
}

main().catch((e) => {
  console.error("Capture error:", e.message);
  process.exit(1);
});
