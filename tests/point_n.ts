import { chromium } from "playwright";

type PointFinding = { x: number; y: number; el: null } | { x: number; y: number; tag: string; txt: string; path: string[] };
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
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
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    const results: PointFinding[] = [];
    for (const [x, y] of [[27, 777], [27, 782], [36, 782], [47, 782], [30, 780], [40, 790]]) {
      const el = document.elementFromPoint(x, y);
      if (!el) { results.push({ x, y, el: null }); continue; }
      const path: string[] = [];
      let cur: Element | null = el;
      while (cur && path.length < 6) {
        path.push(cur.tagName + (cur.id ? "#" + cur.id : "") + "|" + String(cur.className).slice(0, 30));
        cur = cur.parentElement;
      }
      results.push({ x, y, tag: el.tagName, txt: (el.textContent || "").slice(0, 15), path });
    }
    return results;
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
}
main().catch(console.error);
