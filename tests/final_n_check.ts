import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.mouse.move(2000, 2000);
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/home/ubuntu/smmnine/shots/final_login.png" });
  await page.screenshot({
    path: "/home/ubuntu/smmnine/shots/final_login_zone.png",
    clip: { x: 0, y: 700, width: 150, height: 144 },
  });
  // لقطة ثالثة بعد scroll لأسفل — قد تكون الدائرة عنصر يظهر بعد scroll
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/home/ubuntu/smmnine/shots/final_login_scrolled.png" });
  console.log("done");
  await browser.close();
}
main().catch(console.error);
