import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "demo_user", password: "demo_pass_123" }),
  });
  const setCookie = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie()[0] : "";
  const match = setCookie.match(/follower-session=([^;]+)/);
  if (match) {
    await page.context().addCookies([{ name: "follower-session", value: match[1], domain: "localhost", path: "/" }]);
  }
  await page.goto("http://localhost:3000/api-access", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  // لقطة كامل أسفل الشاشة
  await page.screenshot({ path: "shots/n_fixed.png", clip: { x: 0, y: 720, width: 390, height: 124 } });
  await browser.close();
  console.log("done");
}
main().catch(console.error);
