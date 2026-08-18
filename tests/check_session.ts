import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  const r1 = await page.evaluate(async () => {
    const res = await fetch("http://localhost:3000/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "qatest2026", password: "QaPass12345" }) });
    return { ok: res.ok, body: await res.json() };
  });
  console.log("login:", JSON.stringify(r1));
  const r2 = await page.evaluate(async () => {
    const res = await fetch("http://localhost:3000/api/user");
    return await res.json();
  });
  console.log("user:", JSON.stringify(r2));
  await browser.close();
}
main();
