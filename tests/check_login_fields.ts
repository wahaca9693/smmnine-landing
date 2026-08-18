import { chromium } from "playwright";

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await p.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  // فحص كل العناصر input داخل الصفحة بما فيها iframes
  const info = await p.evaluate(() => {
    const frames = document.querySelectorAll("iframe");
    const ifr = Array.from(frames).map((f) => f.src);
    const inputs = Array.from(document.querySelectorAll("input")).map((i) => ({
      type: i.type,
      placeholder: i.placeholder,
      name: i.name,
    }));
    return { ifr, inputs, bodyChildren: document.body.children.length };
  });
  console.log(JSON.stringify(info, null, 2));
  await b.close();
})();
