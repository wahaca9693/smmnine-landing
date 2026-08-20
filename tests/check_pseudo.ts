import { chromium } from "playwright";

type PseudoFinding = { el: string; p: "::before" | "::after"; content: string; bg: string; disp: string; pos: string; l: string; t: string; w: string; h: string; bgImg: string; color: string };
type FixedFinding = { tag: string; cls: string; pos: string; r: { x: number; y: number; w: number; h: number } };
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const out = await page.evaluate(() => {
    const res: PseudoFinding[] = [];
    for (const el of [document.body, document.documentElement]) {
      for (const p of ["::before", "::after"] as const) {
        const cs = getComputedStyle(el, p);
        res.push({ el: el.tagName, p, content: cs.content, bg: cs.backgroundColor, disp: cs.display, pos: cs.position,
          l: cs.left, t: cs.top, w: cs.width, h: cs.height, bgImg: cs.backgroundImage.slice(0, 200), color: cs.color });
      }
    }
    // كل العناصر fixed/absolute في أسفل الصفحة
    const fixed: FixedFinding[] = [];
    document.querySelectorAll("*").forEach((n) => {
      const cs = getComputedStyle(n);
      if (cs.position === "fixed" || cs.position === "absolute") {
        const r = n.getBoundingClientRect();
        if (r.bottom > 700) fixed.push({ tag: n.tagName, cls: String(n.className).slice(0,60), pos: cs.position, r: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)} });
      }
    });
    return { res, fixed };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
}
main().catch(console.error);
