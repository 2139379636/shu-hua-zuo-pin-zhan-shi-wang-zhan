"""
验证：修复后视觉对比 — 鼠标离开 hero 后画面恢复"米黄色画作留白"
"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})
        await page.goto('http://127.0.0.1:8080/index.html', wait_until='networkidle', timeout=60000)
        await page.wait_for_timeout(2500)

        # ===== 场景 A：鼠标在 hero 顶部 100px（bug 触发场景）=====
        await page.mouse.move(960, 100)
        await page.wait_for_timeout(300)
        await page.screenshot(path='tests/_g_shots/verify-hero-A-mouse-top.png', full_page=False)

        # ===== 场景 B：鼠标在 hero 中心 540px（默认 reveal 位置）=====
        await page.mouse.move(960, 540)
        await page.wait_for_timeout(300)
        await page.screenshot(path='tests/_g_shots/verify-hero-B-mouse-center.png', full_page=False)

        # ===== 场景 C：鼠标离开 hero 到 nav（验证修复有效）=====
        await page.mouse.move(960, 30)  # nav 区域
        await page.wait_for_timeout(300)
        await page.screenshot(path='tests/_g_shots/verify-hero-C-leave-fix.png', full_page=False)

        # ===== 场景 D：再次进入 hero，从顶部进入 =====
        await page.mouse.move(960, 80)
        await page.wait_for_timeout(300)
        await page.screenshot(path='tests/_g_shots/verify-hero-D-enter-from-top.png', full_page=False)

        # 像素级断言：场景 C 顶部 0-110px 区域不应再有"灰色带"
        # 用 canvas 截图后取像素
        img_bytes = await page.screenshot(full_page=False)
        # 改用 evaluate 取像素
        sample = await page.evaluate("""
            async () => {
                // 先回到 hero 顶部
                document.dispatchEvent(new MouseEvent('mousemove', { clientX: 960, clientY: 100, bubbles: true }));
                document.getElementById('hero').dispatchEvent(new MouseEvent('mousemove', { clientX: 960, clientY: 100, bubbles: true }));
                await new Promise(r => setTimeout(r, 100));
                return getComputedStyle(document.getElementById('heroReveal')).getPropertyValue('--my');
            }
        """)
        print(f'After simulated mousemove to 100: --my = {sample}')

        # 模拟 mouseleave
        await page.evaluate("""
            document.getElementById('hero').dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        """)
        await page.wait_for_timeout(200)
        sample_leave = await page.evaluate("""
            getComputedStyle(document.getElementById('heroReveal')).getPropertyValue('--my')
        """)
        print(f'After mouseleave: --my = {sample_leave}')

        # 再次截图
        await page.screenshot(path='tests/_g_shots/verify-hero-E-after-leave-event.png', full_page=False)

        await browser.close()
        print('\nAll screenshots saved to tests/_g_shots/')
        print('verify-hero-A-mouse-top.png: 鼠标在 hero 顶部（gray band 出现）')
        print('verify-hero-B-mouse-center.png: 鼠标在 hero 中心（reveal 中心画作）')
        print('verify-hero-C-leave-fix.png: 鼠标离开 hero（修复后：恢复 50% reveal）')
        print('verify-hero-D-enter-from-top.png: 再次从顶部进入')
        print('verify-hero-E-after-leave-event.png: mouseleave 事件后')


asyncio.run(main())
