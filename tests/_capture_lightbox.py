"""截图：lightbox 视觉验证"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})

        await page.goto('http://127.0.0.1:8080/index.html', wait_until='networkidle', timeout=60000)
        await page.wait_for_timeout(2000)

        # 滚到 landscape 区
        await page.evaluate("document.getElementById('marqueeLandscape').scrollIntoView({behavior:'instant', block:'center'})")
        await page.wait_for_timeout(500)

        # 点击第一个 tile (id=17, Image #3 - 最上方居中)
        await page.locator('#landscapeGrid .marquee__tile').first.click()
        await page.wait_for_timeout(800)

        # 截图 lightbox
        await page.screenshot(path='tests/_g_shots/fix-lightbox-open.png', full_page=False)
        print('saved: fix-lightbox-open.png')

        # 关闭后再点击 marquee tile（用 JS 触发，避免动画滚动干扰）
        await page.click('#hgmLightbox .lightbox__close')
        await page.wait_for_timeout(500)
        await page.evaluate("document.getElementById('marquee').scrollIntoView({behavior:'instant', block:'center'})")
        await page.wait_for_timeout(500)
        # 用 JS 直接调 lightbox.open() — 模拟用户点击效果，跳过动画稳定性问题
        await page.evaluate("""() => {
            const tile = document.querySelector('#marqueeRow1 .marquee__tile');
            if (tile && window.HGM_LIGHTBOX) {
                window.HGM_LIGHTBOX.open(
                    tile.getAttribute('data-full'),
                    tile.getAttribute('data-title'),
                    tile.getAttribute('data-title') + ' · ' + tile.getAttribute('data-seal')
                );
            }
        }""")
        await page.wait_for_timeout(800)
        await page.screenshot(path='tests/_g_shots/fix-lightbox-marquee.png', full_page=False)
        print('saved: fix-lightbox-marquee.png')

        await browser.close()


asyncio.run(main())