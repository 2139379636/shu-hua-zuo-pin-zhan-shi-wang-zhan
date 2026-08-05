"""临时截图脚本：验证横向作品静态网格视觉"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await page.goto('http://127.0.0.1:8080/index.html', wait_until='networkidle', timeout=60000)
        await page.wait_for_timeout(1500)

        # 滚到 landscape 区
        await page.evaluate("document.getElementById('marqueeLandscape').scrollIntoView({behavior:'instant', block:'start'})")
        await page.wait_for_timeout(800)

        # 截图：landscape 区
        land = page.locator('#marqueeLandscape')
        await land.screenshot(path='tests/_g_shots/fix-landscape-grid.png')

        # 桌面整页（1440 宽）
        await page.evaluate("window.scrollTo(0, 0)")
        await page.wait_for_timeout(500)
        await page.screenshot(path='tests/_g_shots/fix-landscape-fullpage-1440.png', full_page=True)

        # 移动端整页（390 宽，单列验证）
        await page.set_viewport_size({'width': 390, 'height': 844})
        await page.wait_for_timeout(500)
        await page.evaluate("document.getElementById('marqueeLandscape').scrollIntoView({behavior:'instant', block:'start'})")
        await page.wait_for_timeout(800)
        await page.locator('#marqueeLandscape').screenshot(path='tests/_g_shots/fix-landscape-grid-mobile.png')

        print('截图完成：fix-landscape-grid.png / fix-landscape-grid-mobile.png / fix-landscape-fullpage-1440.png')
        await browser.close()


asyncio.run(main())