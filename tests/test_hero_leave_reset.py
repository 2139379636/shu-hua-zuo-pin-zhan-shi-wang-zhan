"""
测试：Hero 的 mask 中心在 mouseleave 后应重置到 hero 几何中心 (50% 50%)

RED — 在修复前这个测试会失败
"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})
        await page.goto('http://127.0.0.1:8080/index.html', wait_until='networkidle', timeout=60000)
        await page.wait_for_timeout(1500)

        # 1. 把鼠标移到 hero 顶部
        await page.mouse.move(960, 100)
        await page.wait_for_timeout(200)

        mx_top = await page.evaluate("getComputedStyle(document.getElementById('heroReveal')).getPropertyValue('--mx')")
        my_top = await page.evaluate("getComputedStyle(document.getElementById('heroReveal')).getPropertyValue('--my')")
        print(f'After move to hero top: --mx={mx_top} --my={my_top}')

        # 2. 鼠标移出 hero（移到 nav 区域）
        await page.mouse.move(960, 30)  # nav 区域
        await page.wait_for_timeout(200)

        mx_after = await page.evaluate("getComputedStyle(document.getElementById('heroReveal')).getPropertyValue('--mx')")
        my_after = await page.evaluate("getComputedStyle(document.getElementById('heroReveal')).getPropertyValue('--my')")
        print(f'After mouse leaves hero: --mx={mx_after} --my={my_after}')

        # 3. 断言：mouseleave 后 mask 中心应重置到 50% 50%
        # 允许微小浮点误差（rafThrottle + 多次 mousemove 可能产生 0.0x% 偏差）
        def near(actual, target, eps=0.5):
            return abs(float(actual.rstrip('%')) - target) < eps

        mx_ok = near(mx_after, 50.0)
        my_ok = near(my_after, 50.0)

        if mx_ok and my_ok:
            print('[PASS] mask center reset to 50% 50%')
            exit_code = 0
        else:
            print(f'[FAIL] mask center NOT reset (mx={mx_after} my={my_after}, expected ~50% 50%)')
            print('       Bug: mouseleave leaves --mx/--my stuck at hero top, causing gray band')
            exit_code = 1

        await browser.close()
        return exit_code


import sys
sys.exit(asyncio.run(main()))
