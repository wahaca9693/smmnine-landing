import { chromium } from "playwright";

type ElementFinding = { tag: string; cls: string; txt: string; bg: string; color: string; pos: string; r: { x: number; y: number; w: number; h: number } };
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  // 1) طباعة كل العناصر التي تحتوي حرف N كنص منفرد في أسفل الشاشة
  const els = await page.evaluate(() => {
    const out: ElementFinding[] = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom > 700 && r.right < 100 && r.width < 60 && r.height < 60) {
        const cs = getComputedStyle(el);
        out.push({
          tag: el.tagName,
          cls: String(el.className).slice(0, 60),
          txt: (el.textContent || "").trim().slice(0, 20),
          bg: cs.backgroundColor,
          color: cs.color,
          pos: cs.position,
          r: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        });
      }
    });
    return out;
  });
  console.log(JSON.stringify(els, null, 1));
  await page.screenshot({ path: "shots/login_full.png" });
  await page.screenshot({ path: "shots/login_zone.png", clip: { x: 0, y: 700, width: 150, height: 144 } });
  await browser.close();
}
main().catch(console.error);
