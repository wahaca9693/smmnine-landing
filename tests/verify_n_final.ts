import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
  const loginRes = await page.request.post("http://localhost:3000/api/auth/login", {
    data: { username: "demo_user", password: "demo_pass_123" },
  });
  const headers = loginRes.headers();
  const setCookie = headers["set-cookie"] || headers["Set-Cookie"] || "";
  const match = setCookie.match(/follower-session=([^;]+)/);
  if (match) {
    await page.context().addCookies([{ name: "follower-session", value: match[1], domain: "localhost", path: "/" }]);
  }
  await page.goto("http://localhost:3000/api-access", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  // 1) فحص أيقونة الدعم الفني: هل هي MessagesSquare؟
  const icons = await page.evaluate(() =>
    Array.from(document.querySelectorAll("nav a svg")).map((s) => ({
      d: (s.getAttribute("d") || "").slice(0, 60),
      cls: String(s.className),
      r: s.getBoundingClientRect(),
    }))
  );
  console.log(JSON.stringify(icons, null, 1));
  await page.screenshot({ path: "shots/nav_final.png" });
  await page.screenshot({ path: "shots/nav_zone.png", clip: { x: 0, y: 720, width: 390, height: 124 } });
  console.log("done - shots/nav_final.png & nav_zone.png");
  await browser.close();
}
main().catch(console.error);
