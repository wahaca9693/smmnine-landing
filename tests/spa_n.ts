import { chromium } from "playwright";

type NextWindow = Window & { next?: { router?: { push?: (path: string) => unknown } } };
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  // أولاً صفحة api-access (تحتوي BottomNav)
  await page.goto("http://localhost:3000/api-access", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  // ثم SPA navigation إلى login
  await page.evaluate(() => (window as NextWindow).next?.router?.push?.("/login"));
  await page.waitForTimeout(2500);
  await page.mouse.move(2000, 2000);
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/home/ubuntu/smmnine/shots/spa_login.png" });
  await page.screenshot({ path: "/home/ubuntu/smmnine/shots/spa_login_zone.png", clip: { x: 0, y: 700, width: 150, height: 144 } });
  const navExists = await page.evaluate(() => {
    const navs = document.querySelectorAll("nav");
    return { navCount: navs.length, hasBottomNav: Array.from(navs).some((n) => String(n.className).includes("fixed")) };
  });
  console.log(JSON.stringify(navExists));
  await browser.close();
}
main().catch(console.error);
