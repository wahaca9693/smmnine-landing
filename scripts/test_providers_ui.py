"""Functional test of the redesigned providers page: search by name/number, toggle paused tab."""
import asyncio, sys
from playwright.async_api import async_playwright

BASE = "http://localhost:3000"
OUT = "/tmp/test_{}.png"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        page = await ctx.new_page()
        await page.goto(BASE + "/login", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        inputs = page.locator("input")
        await inputs.nth(0).fill("adminshot")
        await inputs.nth(1).fill("shotpass99")
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(2500)
        await page.goto(BASE + "/admin/providers", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)

        # 1) ابحث برقم الخدمة 2
        box = page.locator("input[placeholder*='ابحث بالاسم أو رقم الخدمة']")
        await box.fill("2")
        await page.wait_for_timeout(800)
        visible_rows = await page.locator(".grid-cols-3 > .text-\\[13px\\], div.mx-2\\.5").count()
        await page.screenshot(path=OUT.format("search_num"), full_page=False)
        print("rows visible after search '2':", visible_rows)

        # 2) ابحث بالاسم (جزء من الاسم)
        await box.fill("متابعين")
        await page.wait_for_timeout(800)
        await page.screenshot(path=OUT.format("search_name"), full_page=False)
        cnt = await box.evaluate("el => el.value")
        print("search value:", cnt)

        # 3) مسح البحث
        await box.fill("")
        await page.wait_for_timeout(500)

        # 4) إيقاف الخدمة الأولى (مفعلة -> موقوفة) ثم التبويب للموقوفة
        toggle_btn = page.locator("div.mx-2\\.5 button", has_text="مفعّلة").first
        await toggle_btn.click()
        await page.wait_for_timeout(1200)
        await page.screenshot(path=OUT.format("after_toggle"), full_page=False)

        paused_tab = page.locator("button", has_text="الموقوفة").first
        await paused_tab.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path=OUT.format("paused_tab"), full_page=False)

        # 5) إعادة تفعيلها من تبويب الموقوفة
        resume = page.locator("button", has_text="موقوفة").first
        await resume.click()
        await page.wait_for_timeout(1200)

        # 6) العودة للمفعلة والتحقق
        active_tab = page.locator("button", has_text="المفعّلة").first
        await active_tab.click()
        await page.wait_for_timeout(800)
        await page.screenshot(path=OUT.format("final"), full_page=False)
        await b.close()
        print("done")

asyncio.run(main())
