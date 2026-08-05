"""测试 marquee 自由滚动中点击不会错位"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})

        await page.goto('http://127.0.0.1:8080/index.html', wait_until='domcontentloaded', timeout=60000)
        await page.wait_for_timeout(3000)

        # 滚到 marquee
        await page.evaluate("document.getElementById('marquee').scrollIntoView({behavior:'instant', block:'center'})")
        await page.wait_for_timeout(2500)

        # 模拟 10 次随机点击（marquee 自由滚动中）
        # 不同 x 位置（避免落在 24px gap） + 不同 y 位置
        click_positions = [
            (200, 200), (400, 350), (600, 500), (800, 300),
            (1000, 450), (300, 200), (500, 400), (700, 250),
            (900, 350), (1100, 500),
        ]

        results = []
        for i, (cx, cy) in enumerate(click_positions):
            # 让 marquee 滚 0.5-1.5s 模拟真实场景
            await page.wait_for_timeout(500 + (i % 3) * 200)

            # mousedown 之前，记录 pointer 位置上的 tile（mousedown 事件触发瞬间）
            # 用 document.elementFromPoint（mousedown 还没触发时）
            tile_before = await page.evaluate(f"""() => {{
                const e = document.elementFromPoint({cx}, {cy});
                const t = e ? e.closest('.marquee__tile') : null;
                return t ? t.getAttribute('data-id') : null;
            }}""")

            # 真实 mousedown（不松手）
            await page.mouse.move(cx, cy)
            await page.mouse.down()
            await page.wait_for_timeout(200)

            # 看 lightbox 打开的 id
            lb_src = await page.evaluate("document.querySelector('#hgmLightbox .lightbox__img')?.getAttribute('src')")
            lb_id = lb_src.split('/')[-1].split('.')[0] if lb_src else None
            open_ = await page.evaluate("document.getElementById('hgmLightbox')?.classList.contains('is-open')")

            results.append((i+1, cx, cy, tile_before, lb_id, open_))

            # 关闭 + 松手
            if open_:
                await page.evaluate('window.HGM_LIGHTBOX.close()')
                await page.wait_for_timeout(500)
            await page.mouse.up()
            await page.wait_for_timeout(300)

        # 报告
        print('=' * 70)
        print(f'{"#":<3}{"x":<6}{"y":<6}{"pointer":<10}{"lightbox":<10}{"result"}')
        print('-' * 70)
        mismatch_count = 0
        for r in results:
            i, cx, cy, tile, lb, op = r
            if not op:
                status = 'no-click (gap or outside)'
            elif tile == lb:
                status = 'OK'
            else:
                status = '*** MISMATCH ***'
                mismatch_count += 1
            print(f'{i:<3}{cx:<6}{cy:<6}{str(tile):<10}{str(lb):<10}{status}')

        print('=' * 70)
        if mismatch_count == 0:
            print('[PASS] 0 错位 (mousedown 修复有效)')
        else:
            print(f'[FAIL] {mismatch_count} 错位')

        await browser.close()


asyncio.run(main())