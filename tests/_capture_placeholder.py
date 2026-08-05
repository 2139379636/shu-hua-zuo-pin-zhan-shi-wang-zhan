"""重新截图：更大 viewport 确保 6 张占位全部入镜"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # 桌面 1440x1800（大高度保证 6 张全部入镜）
        page = await browser.new_page(viewport={'width': 1440, 'height': 1800})

        for name, url, section_id in [
            ('fix-gallery-placeholder', 'http://127.0.0.1:8080/gallery.html', None),
            ('fix-artwork-placeholder', 'http://127.0.0.1:8080/artwork.html?id=1', None),
            ('fix-artist-placeholder', 'http://127.0.0.1:8080/artist.html', 'selected'),
            ('fix-homepage-unchanged', 'http://127.0.0.1:8080/index.html', None),
            ('fix-admin-unchanged', 'http://127.0.0.1:8080/admin.html', None),
        ]:
            await page.goto(url, wait_until='networkidle', timeout=60000)
            await page.wait_for_timeout(2000)

            # 触发所有 lazy load
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(500)
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(500)

            path = f'tests/_g_shots/{name}.png'
            if section_id:
                # 滚到目标 section 后局部截图
                await page.evaluate(f"document.getElementById('{section_id}').scrollIntoView({{behavior:'instant', block:'start'}})")
                await page.wait_for_timeout(300)
                await page.locator(f'#{section_id}').screenshot(path=path)
            else:
                await page.screenshot(path=path, full_page=True)

            print(f'  saved: {name}.png')

        await browser.close()


asyncio.run(main())