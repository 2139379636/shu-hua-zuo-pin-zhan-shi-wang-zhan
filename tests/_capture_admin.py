"""截图：admin 顶部 banner + 8 个作品状态"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 1200})

        # 登录 admin
        await page.goto('http://127.0.0.1:8080/admin.html', wait_until='networkidle', timeout=60000)
        await page.wait_for_timeout(1500)
        await page.fill('#authKey', 'hgm-admin')
        await page.click('#authForm button[type="submit"]')
        await page.wait_for_timeout(2000)

        # 添加 8 个作品
        for i in range(1, 9):
            await page.click('#btnAdd')
            await page.wait_for_timeout(200)
            await page.fill('input[name="title"]', f'清漓山水 · 第 {i} 帧')
            await page.fill('input[name="seal"]', f'測{i}')
            await page.fill('input[name="image"]', f'素材/{i}.jpg')
            await page.fill('input[name="thumb"]', f'素材/{i}.jpg')
            await page.fill('input[name="size"]', '100 × 50 cm')
            await page.fill('input[name="format"]', '横幅 · 镜片')
            await page.fill('input[name="material"]', '宣纸 · 水墨')
            await page.fill('input[name="year"]', '2024')
            await page.fill('input[name="price"]', '6800')
            await page.fill('input[name="category"]', '漓江,山水')
            await page.click('#btnSave')
            await page.wait_for_timeout(200)

        # 截图：admin 全貌
        await page.screenshot(path='tests/_g_shots/fix-admin-8-artworks.png', full_page=True)
        print('saved: admin-8-artworks.png')

        # 截图：gallery 显示 8 个
        await page.goto('http://127.0.0.1:8080/gallery.html', wait_until='networkidle', timeout=60000)
        await page.wait_for_timeout(2000)
        await page.screenshot(path='tests/_g_shots/fix-gallery-8-artworks.png', full_page=True)
        print('saved: gallery-8-artworks.png')

        await browser.close()


asyncio.run(main())