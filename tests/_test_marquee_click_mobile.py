"""测试移动端 (390x844) marquee 滚动中点击不误触 / 不错位
依赖：playwright (pip install playwright && playwright install chromium)
启动 dev-server.py 8080 后运行：python tests/_test_marquee_click_mobile.py
"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # iPhone 12 viewport
        context = await browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
        )
        page = await context.new_page()

        await page.goto('http://127.0.0.1:8080/index.html',
                        wait_until='domcontentloaded', timeout=60000)
        await page.wait_for_timeout(3000)

        # 滚到 marquee
        await page.evaluate("document.getElementById('marquee').scrollIntoView({behavior:'instant', block:'center'})")
        await page.wait_for_timeout(2500)

        # 记录每个 tile 在 viewport 内的中心点，挑前 4 个能点到的
        candidates = await page.evaluate("""() => {
            const tiles = Array.from(document.querySelectorAll('.marquee__track .marquee__tile'));
            const vh = window.innerHeight;
            return tiles
              .map(t => {
                const r = t.getBoundingClientRect();
                return { id: t.dataset.id, cx: r.left + r.width/2, cy: r.top + r.height/2 };
              })
              .filter(t => t.cy > 0 && t.cy < vh && t.cx > 0 && t.cx < 390)
              .slice(0, 4);
        }""")

        if not candidates:
            print('[FAIL] 视口内没找到 tile，可能页面没滚到 marquee')
            await browser.close()
            return

        results = []
        for i, t in enumerate(candidates):
            cx, cy = int(t['cx']), int(t['cy'])
            # 等下一帧让 marquee 滚动一段距离
            await page.wait_for_timeout(500 + (i % 3) * 200)

            # 模拟真实触屏（playwright 的 touchscreen.tap 触发完整 touchstart→touchend→click）
            await page.touchscreen.tap(cx, cy)
            await page.wait_for_timeout(400)

            lb_src = await page.evaluate("document.querySelector('#hgmLightbox .lightbox__img')?.getAttribute('src')")
            lb_id = lb_src.split('/')[-1].split('.')[0] if lb_src else None
            open_ = await page.evaluate("document.getElementById('hgmLightbox')?.classList.contains('is-open')")

            results.append((i+1, cx, cy, t['id'], lb_id, open_))

            if open_:
                await page.evaluate('window.HGM_LIGHTBOX.close()')
                await page.wait_for_timeout(500)

        print('=' * 70)
        print(f'{"#":<3}{"x":<6}{"y":<6}{"target":<10}{"lightbox":<10}{"result"}')
        print('-' * 70)
        mismatch_count = 0
        for r in results:
            i, cx, cy, tgt, lb, op = r
            if not op:
                status = 'no-click'
            elif tgt == lb:
                status = 'OK'
            else:
                status = '*** MISMATCH ***'
                mismatch_count += 1
            print(f'{i:<3}{cx:<6}{cy:<6}{str(tgt):<10}{str(lb):<10}{status}')

        print('=' * 70)
        if mismatch_count == 0 and len(results) > 0:
            print(f'[PASS] {len(results)} 次触屏点击全部命中，无误触')
        else:
            print(f'[FAIL] {mismatch_count} / {len(results)} 错位')

        await browser.close()


async def test_slide_down_no_trigger():
    """验证手指下滑（≥ 10px）不会触发 lightbox。

    模拟真实触屏手势：touchstart → touchmove（向下滑 N px）→ touchend。
    用 page.evaluate 在浏览器内合成真实的 TouchEvent（带 Touch 列表），
    因为 Playwright 的 touchscreen.tap 不会带位移。
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
        )
        page = await context.new_page()

        await page.goto('http://127.0.0.1:8080/index.html',
                        wait_until='domcontentloaded', timeout=60000)
        await page.wait_for_timeout(3000)
        await page.evaluate("document.getElementById('marquee').scrollIntoView({behavior:'instant', block:'center'})")
        await page.wait_for_timeout(2500)

        # 取一个 viewport 内的 tile 中心
        tile = await page.evaluate("""() => {
            const tiles = Array.from(document.querySelectorAll('.marquee__track .marquee__tile'));
            const vh = window.innerHeight;
            for (const t of tiles) {
              const r = t.getBoundingClientRect();
              const cx = r.left + r.width/2, cy = r.top + r.height/2;
              if (cy > 0 && cy < vh && cx > 0 && cx < 390) {
                return { id: t.dataset.id, cx, cy };
              }
            }
            return null;
        }""")

        if not tile:
            print('[FAIL] 视口内没找到 tile，可能页面没滚到 marquee')
            await browser.close()
            return

        cx, cy = int(tile['cx']), int(tile['cy'])
        print(f'[slide-down] target tile id={tile["id"]} center=({cx},{cy})')

        # 合成 touch 序列：start → move 下移 30px → end
        # threshold=10，移动 30px 远超阈值，应被识别为"页面滚动意图"
        moved = await page.evaluate("""({cx, cy}) => {
            const tileEl = document.elementFromPoint(cx, cy);
            if (!tileEl) return 'no-tile-at-point';
            const targetTile = tileEl.closest('.marquee__tile') || tileEl;

            function mkTouch(x, y, target){
                return new Touch({ identifier: 0, target, clientX: x, clientY: y,
                                   pageX: x, pageY: y, screenX: x, screenY: y, radiusX: 1, radiusY: 1, force: 1 });
            }
            const t0 = mkTouch(cx, cy, targetTile);
            targetTile.dispatchEvent(new TouchEvent('touchstart', {
              touches: [t0], targetTouches: [t0], changedTouches: [t0],
              cancelable: true, bubbles: true
            }));
            // 下滑 30px（> threshold 10）
            const t1 = mkTouch(cx, cy + 30, targetTile);
            targetTile.dispatchEvent(new TouchEvent('touchmove', {
              touches: [t1], targetTouches: [t1], changedTouches: [t1],
              cancelable: true, bubbles: true
            }));
            targetTile.dispatchEvent(new TouchEvent('touchend', {
              touches: [], targetTouches: [], changedTouches: [t1],
              cancelable: true, bubbles: true
            }));
            return 'dispatched';
        }""", {'cx': cx, 'cy': cy})

        print(f'[slide-down] gesture: {moved}')
        await page.wait_for_timeout(500)

        is_open = await page.evaluate("document.getElementById('hgmLightbox')?.classList.contains('is-open')")
        img_src = await page.evaluate("document.querySelector('#hgmLightbox .lightbox__img')?.getAttribute('src')")

        print('=' * 70)
        if not is_open:
            print(f'[PASS] 手指下滑 30px 未触发 lightbox（tile={tile["id"]}）')
        else:
            print(f'[FAIL] 手指下滑触发了 lightbox，img={img_src}')

        await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
    print()
    asyncio.run(test_slide_down_no_trigger())