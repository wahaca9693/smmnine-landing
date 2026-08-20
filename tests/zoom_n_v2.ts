import { chromium } from "playwright";

type SvgFinding = { parent: string; r: { x: number; y: number; w: number; h: number }; size: string; stroke: string; fill: string };
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.mouse.move(2000, 2000);
  await page.waitForTimeout(300);
  // قص مكبر 3x للمنطقة
  await page.screenshot({ path: "/home/ubuntu/smmnine/shots/n_zoom3.png", clip: { x: 15, y: 765, width: 60, height: 60 } });
  // فحص كل SVG paths والـ elements عند تلك المنطقة بدقة
  const out = await page.evaluate(() => {
    const results: SvgFinding[] = [];
    document.querySelectorAll("svg").forEach((svg) => {
      const r = svg.getBoundingClientRect();
      if (r.bottom > 700 && r.right < 200) {
        results.push({
          parent: svg.parentElement?.tagName + "." + String(svg.parentElement?.className).slice(0, 80),
          r: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          size: svg.getAttribute("width") || svg.getAttribute("size") || (svg.querySelector("svg") ? "" : "inline"),
          stroke: svg.getAttribute("stroke") || getComputedStyle(svg).stroke,
          fill: svg.getAttribute("fill") || getComputedStyle(svg).fill,
        });
      }
    });
    return results;
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
}
main().catch(console.error);
