import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = "http://127.0.0.1:3000";
const output = "/home/ubuntu/smmnine/artifacts/smoke-screens";
mkdirSync(output, { recursive: true });

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });

  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${output}/login-390.png`, fullPage: true });

  await page.goto(`${base}/services`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${output}/services-390.png`, fullPage: true });

  const servicesResponse = await page.evaluate(async () => {
    const response = await fetch("/api/services", { cache: "no-store" });
    return { status: response.status, body: await response.json() };
  });
  console.log(JSON.stringify({ screenshots: output, servicesResponse }, null, 2));
  await browser.close();
}

capture().catch((error) => {
  console.error(error);
  process.exit(1);
});
