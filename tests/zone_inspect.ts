import { chromium } from "playwright";

type LayerFinding = { tag: string; cls: string; txt: string; pos: string; bg: string; r: { x: number; y: number; w: number; h: number } };
type PseudoFinding = { node: string; p: string; content: string; bg: string; color: string };
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.mouse.move(2000, 2000);
  const info = await page.evaluate(() => {
    // كل العناصر التي تغطي نقطة (38,795)
    const els: LayerFinding[] = [];
    let el: Element | null = document.elementFromPoint(38, 795);
    while (el && els.length < 10) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      els.push({
        tag: el.tagName,
        cls: String(el.className).slice(0, 70),
        txt: JSON.stringify((el.textContent || "").trim().slice(0, 8)),
        pos: cs.position,
        bg: cs.backgroundColor,
        r: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      });
      el = el.parentElement;
    }
    // فحص pseudo للعناصر الدائرية القريبة
    const pseudo: PseudoFinding[] = [];
    document.querySelectorAll("*").forEach((node) => {
      const r = node.getBoundingClientRect();
      if (r.bottom > 700 && r.right < 150 && Math.abs(r.width - r.height) < 20 && r.width > 20 && r.width < 100) {
        for (const p of ["::before", "::after"]) {
          const cs = getComputedStyle(node, p);
          if (cs && cs.content && cs.content !== "none" && cs.content !== '""' && cs.content !== "normal") {
            pseudo.push({ node: node.tagName, p, content: cs.content, bg: cs.backgroundColor, color: cs.color });
          }
        }
      }
    });
    return { els, pseudo };
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
}
main().catch(console.error);
