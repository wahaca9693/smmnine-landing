import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  const ok = await page.evaluate(async () => {
    const res = await fetch("http://localhost:3000/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "qatest2026", password: "QaPass12345" }) });
    return res.ok;
  });
  console.log("login:", ok);
  await page.goto("http://localhost:3000/api-access", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "shots/api_new.png", fullPage: false });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(600);
  await page.screenshot({ path: "shots/api_new_bottom.png", fullPage: false });
  await browser.close();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
