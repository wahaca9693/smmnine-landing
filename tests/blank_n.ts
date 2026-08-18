import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
  await page.setContent("<html><body style='background:#0d0a05'><b style='color:gold;font-size:40px'>TEST ONLY</b></body></html>");
  await page.waitForTimeout(1000);
  await page.mouse.move(2000, 2000);
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/home/ubuntu/smmnine/shots/blank_n.png" });
  await page.screenshot({ path: "/home/ubuntu/smmnine/shots/blank_n_zone.png", clip: { x: 0, y: 700, width: 150, height: 144 } });
  console.log("done");
  await browser.close();
}
main().catch(console.error);
