"""
调试脚本：彻底搞清楚 Hero 顶部灰色带的原因
- 加载 index.html
- 抓 hero 区域截图
- dump dom 状态（mask 中心、img 加载状态、computed style）
- 模拟不同鼠标位置下的截图
"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})

        # 收集 console message
        msgs = []
        page.on('console', lambda m: msgs.append(f'[{m.type}] {m.text}'))
        page.on('pageerror', lambda e: msgs.append(f'[pageerror] {e}'))

        await page.goto('http://127.0.0.1:8080/index.html', wait_until='networkidle', timeout=60000)
        # 等 loader 消失
        await page.wait_for_timeout(2500)

        # ===== 关键证据 1: 鼠标在 hero 中心位置（默认 50% 50%）=====
        await page.mouse.move(960, 620)  # hero 中心
        await page.wait_for_timeout(300)

        # DUMP DOM 状态
        dump = await page.evaluate("""
            () => {
                const hero = document.getElementById('hero');
                const base = document.querySelector('.hero__layer--base');
                const reveal = document.getElementById('heroReveal');
                const grain = document.querySelector('.hero__grain');
                const heroRect = hero.getBoundingClientRect();

                const cs = (el) => {
                    if (!el) return null;
                    const s = getComputedStyle(el);
                    return {
                        tag: el.tagName,
                        complete: el.complete,
                        naturalWidth: el.naturalWidth,
                        naturalHeight: el.naturalHeight,
                        currentSrc: el.currentSrc,
                        mx: el.style.getPropertyValue('--mx'),
                        my: el.style.getPropertyValue('--my'),
                        maskImage: s.maskImage || s.webkitMaskImage,
                        filter: s.filter,
                        opacity: s.opacity,
                        zIndex: s.zIndex,
                        position: s.position,
                        width: s.width,
                        height: s.height,
                        objectFit: s.objectFit,
                        display: s.display,
                    };
                };

                return {
                    heroRect: { x: heroRect.x, y: heroRect.y, w: heroRect.width, h: heroRect.height },
                    base: cs(base),
                    reveal: cs(reveal),
                    grain: cs(grain),
                    loaderRemoved: document.getElementById('loader')?.classList.contains('is-removed'),
                    bodyReady: document.body.classList.contains('is-ready'),
                    scrollStoryActive: document.getElementById('scroll-story')?.classList.contains('is-active'),
                };
            }
        """)

        print('=== DOM DUMP (mouse at hero center 50% 50%) ===')
        for k, v in dump.items():
            print(f'{k}: {v}')

        # 截图 1：默认鼠标在 hero 中心
        await page.screenshot(path='tests/_g_shots/bug-hero-center-1920.png', full_page=False)

        # 顶部 hero 区域截图（1920x300）
        await page.locator('#hero').screenshot(path='tests/_g_shots/bug-hero-only.png')

        # ===== 关键证据 2: 鼠标在 hero 顶部 =====
        await page.mouse.move(960, 100)  # hero 顶部 100px
        await page.wait_for_timeout(300)

        dump_top = await page.evaluate("""
            () => {
                const reveal = document.getElementById('heroReveal');
                const base = document.querySelector('.hero__layer--base');
                return {
                    reveal_mx: reveal.style.getPropertyValue('--mx'),
                    reveal_my: reveal.style.getPropertyValue('--my'),
                    base_complete: base.complete,
                    reveal_complete: reveal.complete,
                    base_natural: `${base.naturalWidth}x${base.naturalHeight}`,
                    reveal_natural: `${reveal.naturalWidth}x${reveal.naturalHeight}`,
                };
            }
        """)
        print('\n=== DOM DUMP (mouse at hero top 100px) ===')
        for k, v in dump_top.items():
            print(f'{k}: {v}')

        await page.screenshot(path='tests/_g_shots/bug-hero-mouse-top.png', full_page=False)

        # ===== 关键证据 3: 把鼠标移出 hero（让 mx/my 留在 hero 中心）=====
        await page.mouse.move(0, 0)  # 移出 viewport
        await page.wait_for_timeout(300)

        dump_out = await page.evaluate("""
            () => {
                const reveal = document.getElementById('heroReveal');
                const base = document.querySelector('.hero__layer--base');
                return {
                    reveal_mx: reveal.style.getPropertyValue('--mx'),
                    reveal_my: reveal.style.getPropertyValue('--my'),
                    base_complete: base.complete,
                    reveal_complete: reveal.complete,
                };
            }
        """)
        print('\n=== DOM DUMP (mouse moved out of viewport) ===')
        for k, v in dump_out.items():
            print(f'{k}: {v}')

        await page.screenshot(path='tests/_g_shots/bug-hero-mouse-out.png', full_page=False)

        # ===== 关键证据 4: hover event 是否触发 =====
        # 重新进入 hero，触发 mousemove
        await page.mouse.move(960, 540)
        await page.wait_for_timeout(100)
        await page.mouse.move(961, 541)
        await page.wait_for_timeout(300)

        dump_hover = await page.evaluate("""
            () => {
                const reveal = document.getElementById('heroReveal');
                return {
                    reveal_mx: reveal.style.getPropertyValue('--mx'),
                    reveal_my: reveal.style.getPropertyValue('--my'),
                };
            }
        """)
        print('\n=== DOM DUMP (mouse hover center) ===')
        for k, v in dump_hover.items():
            print(f'{k}: {v}')

        # ===== 关键证据 5: 把 hero__layer--reveal 隐藏，看 base 是否仍正常 =====
        await page.evaluate("""
            () => {
                const reveal = document.getElementById('heroReveal');
                reveal.style.display = 'none';
            }
        """)
        await page.wait_for_timeout(300)
        await page.screenshot(path='tests/_g_shots/bug-hero-no-reveal.png', full_page=False)

        # ===== 关键证据 6: 像素采样 — 沿着 hero 顶部往下取样 =====
        await page.evaluate("""
            () => {
                const reveal = document.getElementById('heroReveal');
                reveal.style.display = '';
            }
        """)
        await page.wait_for_timeout(300)

        # 回到中心
        await page.mouse.move(960, 540)
        await page.wait_for_timeout(200)

        # 用 canvas 截图 hero 区域，然后采样几个高度
        samples = await page.evaluate("""
            () => {
                const hero = document.getElementById('hero');
                const rect = hero.getBoundingClientRect();
                const reveal = document.getElementById('heroReveal');
                const base = document.querySelector('.hero__layer--base');

                // 取得 reveal 的 mask 中心
                const mx = reveal.style.getPropertyValue('--mx') || '50%';
                const my = reveal.style.getPropertyValue('--my') || '50%';

                // 创建一张离屏截图来分析
                const canvas = document.createElement('canvas');
                canvas.width = 1920;
                canvas.height = 1080;
                return {
                    heroRect: { y: rect.y, h: rect.height },
                    revealMx: mx, revealMy: my,
                    baseComplete: base.complete,
                    revealComplete: reveal.complete,
                };
            }
        """)
        print('\n=== Final samples ===')
        for k, v in samples.items():
            print(f'{k}: {v}')

        # 打印 console 消息
        print('\n=== Console Messages ===')
        for m in msgs[:30]:
            print(m)

        await browser.close()


asyncio.run(main())
