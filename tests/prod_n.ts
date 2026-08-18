import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  await page.goto("http://localhost:3999/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.mouse.move(2000, 2000);
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/home/ubuntu/smmnine/shots/prod_login.png" });
  await page.screenshot({ path: "/home/ubuntu/smmnine/shots/prod_login_zone.png", clip: { x: 0, y: 740, width: 150, height: 104 } });
  console.log("done");
  await browser.close();
}
main().catch(console.error);
