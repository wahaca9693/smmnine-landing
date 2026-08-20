import { chromium } from "playwright";

type ElementFinding = { tag: string; cls: string; txt: string; bg: string; color: string; pos: string; r: { x: number; y: number; w: number; h: number } };
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const els = await page.evaluate(() => {
    const out: ElementFinding[] = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom > 650 && r.right < 160 && r.width >= 20 && r.width <= 80 && r.height >= 20 && r.height <= 80) {
        const cs = getComputedStyle(el);
        if (Math.abs(r.width - r.height) < 15) {
          out.push({
            tag: el.tagName,
            cls: String(el.className).slice(0, 80),
            txt: JSON.stringify((el.textContent || "").trim().slice(0, 10)),
            bg: cs.backgroundColor,
            color: cs.color,
            pos: cs.position,
            r: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          });
        }
      }
    });
    return out;
  });
  console.log(JSON.stringify(els, null, 1));
  await browser.close();
}
main().catch(console.error);
