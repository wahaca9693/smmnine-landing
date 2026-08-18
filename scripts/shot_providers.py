"""Login as adminshot and capture the providers admin page at 390px (top, mid, bottom)."""
import asyncio
from playwright.async_api import async_playwright

BASE = "http://localhost:3000"
OUT = "/tmp/shot_prov_{}.png"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        page = await ctx.new_page()
        await page.goto(BASE + "/login", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        inputs = page.locator("input")
        # login tab fields: username + password
        await inputs.nth(0).fill("adminshot")
        await inputs.nth(1).fill("shotpass99")
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(2500)
        await page.goto(BASE + "/admin/providers", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        # dismiss any splash
        try:
            await page.evaluate("document.querySelectorAll('[class*=splash]').forEach(e=>e.remove())")
        except Exception:
            pass
        await page.screenshot(path=OUT.format("top"), full_page=False)
        h = await page.evaluate("document.documentElement.scrollHeight")
        await page.evaluate(f"window.scrollTo(0, {h * 0.45})")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=OUT.format("mid"), full_page=False)
        await page.evaluate(f"window.scrollTo(0, {h})")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=OUT.format("bottom"), full_page=False)
        await b.close()
        print("done")

asyncio.run(main())
