"""Test the preview modal: open preview, filter by category, toggle hide/show, close."""
import asyncio
from playwright.async_api import async_playwright

BASE = "http://localhost:3000"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        page = await ctx.new_page()

        async def js_click(sel: str):
            """Click a button inside the modal via JS event dispatch (fixed overlay friendly)."""
            return await page.evaluate(
                "(s) => { const el = [...document.querySelectorAll('button')].find(b => b.innerText.includes(s)); if (el) { el.click(); return true; } return false; }",
                sel,
            )

        await page.goto(BASE + "/login", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        inputs = page.locator("input")
        await inputs.nth(0).fill("adminshot")
        await inputs.nth(1).fill("shotpass99")
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(2500)
        await page.goto(BASE + "/admin/providers", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)

        # 1) لقطة أولية قبل فتح المودال
        await page.screenshot(path="/tmp/pv_0_home.png", full_page=False)

        # 2) فتح استعراض خدمات أول مزود
        btn = page.locator('button:has-text("عرض الخدمات")').first
        await btn.click()
        await page.wait_for_timeout(3500)
        await page.screenshot(path="/tmp/pv_1_modal_all.png", full_page=False)

        # 3) فلترة بزر النوع Telegram
        r = await js_click("Telegram")
        print("clicked Telegram:", r)
        await page.wait_for_timeout(1500)
        await page.screenshot(path="/tmp/pv_2_filter_telegram.png", full_page=False)

        # 4) إعادة الكل ثم فلترة TikTok
        await js_click("الكل")
        await page.wait_for_timeout(1000)
        await js_click("TikTok")
        await page.wait_for_timeout(1500)
        await page.screenshot(path="/tmp/pv_3_filter_tiktok.png", full_page=False)

        # 5) إعادة الكل ثم إخفاء خدمة مضافة (مع فحص حالة الزر بعد النقر)
        await js_click("الكل")
        await page.wait_for_timeout(1500)
        r = await js_click("مضافة للعرض")
        print("clicked hide:", r)
        await page.wait_for_timeout(6000)
        state = await page.evaluate("() => [...document.querySelectorAll('button')].filter(b => b.innerText.includes('مخفية') || b.innerText.includes('مضافة للعرض')).map(b => b.innerText.split(' — ')[0])")
        print("button states after hide:", state)
        await page.screenshot(path="/tmp/pv_4_hidden.png", full_page=False)

        # 6) إعادة إظهار الخدمة
        r = await js_click("مخفية")
        print("clicked show:", r)
        await page.wait_for_timeout(6000)
        state2 = await page.evaluate("() => [...document.querySelectorAll('button')].filter(b => b.innerText.includes('مخفية') || b.innerText.includes('مضافة للعرض')).map(b => b.innerText.split(' — ')[0])")
        print("button states after show:", state2)
        await page.screenshot(path="/tmp/pv_5_reshown.png", full_page=False)

        # 7) إغلاق المودال عبر زر ✕
        await page.evaluate("() => { const el = [...document.querySelectorAll('button')].find(b => b.querySelector('.lucide-x-circle')); if (el) el.click(); }")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="/tmp/pv_6_closed.png", full_page=False)
        print("done")
        await b.close()

asyncio.run(main())
