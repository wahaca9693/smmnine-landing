import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  // إخراج المؤشر من الصفحة
  await page.mouse.move(2000, 2000);
  await page.screenshot({ path: "shots/login_no_cursor.png" });
  await browser.close();
}
main().catch(console.error);
