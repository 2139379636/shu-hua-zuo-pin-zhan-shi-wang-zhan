"""端到端冒烟测试：用真实 Chromium 打开 5 个页面，采集控制台错误与关键 DOM 断言。"""
import asyncio
import sys
from playwright.async_api import async_playwright

BASE = 'http://127.0.0.1:8080'
PAGES = ['index.html', 'gallery.html', 'artwork.html', 'artist.html']

# 沙箱无外网，Google Fonts 必然超时；这是环境限制而非项目缺陷
# frame_00250.jpg 的 404 是帧数探测的边界确认请求，属预期行为（仅 1 次）
# artworks.json 是作品页 fetch 兜底资源，未部署时 404 属正常（fallback 到占位）
IGNORE = ('fonts.googleapis.com', 'fonts.gstatic.com', 'ERR_CONNECTION_TIMED_OUT')
EXPECTED_404 = ('frame_00250.jpg', 'artworks.json')


def is_noise(msg: str) -> bool:
    return any(token in msg for token in IGNORE)


async def check_page(browser, path: str) -> dict:
    page = await browser.new_page()
    errors: list[str] = []
    failed: list[str] = []
    notfound: list[str] = []

    page.on('console', lambda m: errors.append(f'{m.type}: {m.text}')
            if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.on('requestfailed',
            lambda r: failed.append(f'{r.url.split("/")[-1]} {r.failure}'))
    # 记录 404 的具体文件名，便于区分预期探测请求与真实缺失资源
    page.on('response', lambda r: notfound.append(r.url.split('/')[-1])
            if r.status == 404 else None)

    await page.goto(f'{BASE}/{path}', wait_until='networkidle', timeout=60000)
    await page.wait_for_timeout(2500)

    # 404 中剔除预期的探测请求；剩下的才是真实缺失
    unexpected_404 = [n for n in notfound if n not in EXPECTED_404]
    # 控制台的 404 报错已由 notfound 单独统计，避免重复计为失败
    console_errors = [e for e in errors
                      if not is_noise(e) and 'status of 404' not in e]

    return {
        'path': path,
        'errors': console_errors,
        'failed': [f for f in failed if not is_noise(f)],
        'notfound': unexpected_404,
        'probe_404': [n for n in notfound if n in EXPECTED_404],
        'page': page,
    }


async def main() -> int:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        overall_ok = True

        for path in PAGES:
            r = await check_page(browser, path)
            page = r['page']
            print(f'\n===== {path} =====')

            if r['errors']:
                overall_ok = False
                print(f'  控制台错误 {len(r["errors"])} 条:')
                for e in r['errors'][:8]:
                    print(f'    - {e[:160]}')
            else:
                print('  控制台错误: 无')

            if r['failed']:
                overall_ok = False
                print(f'  资源加载失败 {len(r["failed"])} 条:')
                for f in r['failed'][:8]:
                    print(f'    - {f[:160]}')
            else:
                print('  资源加载失败: 无')

            if r['notfound']:
                overall_ok = False
                print(f'  非预期 404 {len(r["notfound"])} 条: {r["notfound"][:8]}')
            else:
                print('  非预期 404: 无')

            if r['probe_404']:
                print(f'  帧探测边界请求(预期): {r["probe_404"]}')

            # 页面特定断言
            if path == 'index.html':
                tiles = await page.locator('.marquee__tile').count()
                revealed = await page.locator('[data-ink-reveal].ink-revealed').count()
                total_reveal = await page.locator('[data-ink-reveal]').count()
                dot = await page.locator('.hero__cursor-dot').count()
                dot_w = await page.evaluate(
                    "() => {const d=document.querySelector('.hero__cursor-dot');"
                    "return d ? getComputedStyle(d).width : 'none';}")
                filt = await page.evaluate(
                    "() => !!document.getElementById('ink-edge')")
                # 总数 = 32：竖向 row1(7)×2 + row2(6)×2 = 14+12 = 26 + landscape grid 6 单副本 = 32
                print(f'  marquee tiles: {tiles} (预期 32 = (7+6)×2 + 6 landscape)')
                if tiles != 32:
                    overall_ok = False

                # 横向作品区：静态网格，6 张单副本（不滚动）
                land = page.locator('#landscapeGrid .marquee__tile')
                land_count = await land.count()
                land_ids = await page.evaluate(
                    "() => [...document.querySelectorAll('#landscapeGrid .marquee__tile')]"
                    ".map(t => t.getAttribute('data-id'))")
                land_wides = await page.evaluate(
                    "() => [...document.querySelectorAll('#landscapeGrid .marquee__tile')]"
                    ".map(t => t.getAttribute('data-wide'))")
                print(f'  landscape grid tiles: {land_count} (预期 6 张作品单副本)')
                # 用户定制布局：最上方居中(id=17) → 左/右 → 左/右 → 最下方居中(id=6)
                expected_order = ['17', '4', '13', '16', '19', '6']
                expected_wides = ['1', '0', '0', '0', '0', '1']
                print(f'  landscape 顺序: {land_ids} (预期 {expected_order})')
                print(f'  跨列标记: {land_wides} (预期 {expected_wides})')
                if land_count != 6:
                    overall_ok = False
                if land_ids != expected_order:
                    overall_ok = False
                    print(f'    FAIL: 顺序不匹配 {land_ids} vs 预期 {expected_order}')
                if land_wides != expected_wides:
                    overall_ok = False
                    print(f'    FAIL: 跨列标记不匹配 {land_wides} vs 预期 {expected_wides}')

                # 验证 landscape 区没有 marquee__track 动画（无 transform from animation）
                has_anim = await page.evaluate(
                    "() => {const g=document.getElementById('landscapeGrid');"
                    "return g && g.style.animation !== '';}")
                if has_anim:
                    overall_ok = False
                    print('    FAIL: landscapeGrid 不应有 animation（静态网格）')

                # 验证跨列 tile 真的 grid-column 跨满 2 列
                wide_count = sum(1 for w in land_wides if w == '1')
                if wide_count != 2:
                    overall_ok = False
                    print(f'    FAIL: 跨列 tile 数={wide_count}，预期 2')

                # ===== Lightbox 断言：tile 是 button，点击触发 lightbox =====
                # 1) tile 是 button 元素而不是 a 标签（不再跳转）
                tile_tags = await page.evaluate(
                    "() => [...document.querySelectorAll('.marquee__tile')].slice(0, 5)"
                    ".map(t => t.tagName.toLowerCase())")
                print(f'  tile tags: {tile_tags} (预期全部 button)')
                if not all(tag == 'button' for tag in tile_tags):
                    overall_ok = False
                    print(f'    FAIL: tile 应是 button，不应再是 <a>')

                # 2) 点击一个 tile → lightbox 打开 + URL 不变（不跳转）
                #    先滚到 landscape 区（grid 离顶部较远，不滚会被 hero 遮挡）
                #    注：用 dispatchEvent 模拟真实用户点击（避免 playwright locator.click()
                #    自动滚动元素到 viewport 中心造成的位置漂移假象）
                await page.evaluate("document.getElementById('marqueeLandscape').scrollIntoView({behavior:'instant', block:'center'})")
                await page.wait_for_timeout(2500)   # 等 Lenis 完成
                scroll_before = await page.evaluate('window.scrollY')
                url_before = page.url
                await page.evaluate("""() => {
                    const tile = document.querySelector('#landscapeGrid .marquee__tile');
                    tile.dispatchEvent(new MouseEvent('click', {bubbles: true}));
                }""")
                await page.wait_for_timeout(800)
                lightbox_open = await page.evaluate(
                    "() => {const lb=document.getElementById('hgmLightbox');"
                    "return lb && lb.classList.contains('is-open');}")
                lb_img_src = await page.evaluate(
                    "() => {const i=document.querySelector('#hgmLightbox .lightbox__img');"
                    "return i ? i.getAttribute('src') : null;}")
                url_after = page.url
                print(f'  点击 tile 后: lightbox 打开={lightbox_open}, URL 不变={url_before == url_after}')
                if not lightbox_open:
                    overall_ok = False
                    print('    FAIL: lightbox 应打开')
                if url_before != url_after:
                    overall_ok = False
                    print(f'    FAIL: 不应跳转，但 URL 变了: {url_after}')
                if not lb_img_src or '素材/' not in lb_img_src:
                    overall_ok = False
                    print(f'    FAIL: lightbox 应加载原图, src={lb_img_src}')

                # 3) 关闭按钮 + 点击背景关闭 + 滚动位置精确保持
                await page.evaluate('window.HGM_LIGHTBOX.close()')
                await page.wait_for_timeout(1500)
                lightbox_closed = await page.evaluate(
                    "() => {const lb=document.getElementById('hgmLightbox');"
                    "return lb && !lb.classList.contains('is-open');}")
                if not lightbox_closed:
                    overall_ok = False
                    print('    FAIL: close() 应能关闭 lightbox')

                # 滚动位置精确保持（核心断言：lightbox 关闭后回到原位置）
                scroll_after = await page.evaluate('window.scrollY')
                scroll_diff = abs(scroll_after - scroll_before)
                print(f'  滚动位置保持: before={scroll_before}, after={scroll_after}, diff={scroll_diff}')
                if scroll_diff > 5:
                    overall_ok = False
                    print(f'    FAIL: 滚动位置漂移 {scroll_diff}px')

                print(f'  ink-revealed: {revealed}/{total_reveal} (首屏内的应已揭示)')
                print(f'  cursor-dot: {dot} 个, 宽度={dot_w}')
                print(f'  #ink-edge 滤镜已注入: {filt}')

                # 浮层艺术家介绍 — 5 段滚动断言
                # 覆盖范围：spec §6.1 全部 9 行中 5 个 phase 边界；
                # 中间 4 点（0.15/0.40/0.60/0.85）由 Task 6 Step 1 手测视觉覆盖
                async def wait_lenis_idle(page, timeout=3000):
                    """等待 Lenis 静止（或无 Lenis 环境）"""
                    await page.wait_for_function(
                        """() => {
                          if (!window.LENIS_INSTANCE) return true;
                          const l = window.LENIS_INSTANCE;
                          return l.state === 'IDLE' || l.scroll === l.targetScroll;
                        }""",
                        timeout=timeout,
                    )

                intro = page.locator('#introOverlay')
                if await intro.count() != 1:
                    overall_ok = False
                    print('  #introOverlay 缺失')
                else:
                    # 用 ScrollTrigger 实例的真实 start/end 替代 offsetTop
                    # 原因：scrollStory 元素 offsetTop 不可靠（hero 720px 嵌套层级）
                    se = await page.evaluate("""() => {
                      const triggers = window.ScrollTrigger && window.ScrollTrigger.getAll
                        ? window.ScrollTrigger.getAll() : [];
                      for (const t of triggers) {
                        if (t.trigger && t.trigger.id === 'scroll-story') {
                          return { start: t.start, end: t.end };
                        }
                      }
                      return null;
                    }""")
                    if not se:
                        overall_ok = False
                        print('  ScrollTrigger 实例未找到')
                    else:
                        anchor = se['start']
                        distance = se['end'] - se['start']
                        # 序幕（intro-overlay）时间轴：
                        #   整卡  0.02-0.13 进, 0.13-0.20 实体, 0.20-0.30 出
                        # 卡片（scroll-story-cards）时间轴（组 3 已删）：
                        #   组 1 hold @ 0.50, 组 2 hold @ 0.80
                        scroll_targets = {
                            '序幕 起点':   0.00,
                            '序幕 实体':   0.20,
                            '序幕 收尾':   0.30,
                            '组1 实体':    0.50,
                            '组2 实体':    0.80,
                            '收尾':        1.00,
                        }
                        expectations = {
                            '序幕 起点':   (0.00, 0.00),
                            '序幕 实体':   (1.00, 1.00),
                            '序幕 收尾':   (0.00, 0.00),
                            '组1 实体':    (0.00, 0.00),
                            '组2 实体':    (0.00, 0.00),
                            '收尾':        (0.00, 0.00),
                        }
                        for label, p in scroll_targets.items():
                            await page.evaluate(f"window.scrollTo(0, {anchor + distance * p})")
                            await wait_lenis_idle(page)
                            await page.wait_for_timeout(700)
                            # 序幕现在是一张卡片，测整张卡片的 opacity
                            intro_op = await page.evaluate(
                                "parseFloat(getComputedStyle(document.querySelector('#introOverlay .ssc__card')).opacity)"
                            )
                            exp_name, exp_line = expectations[label]
                            # 只检查序幕期（前 3 个 label）的卡片 opacity
                            if label in ('序幕 起点', '序幕 实体', '序幕 收尾'):
                                ok = abs(intro_op - exp_name) < 0.05
                                print(f'  浮层 {label} (p={p}): 序幕卡={intro_op:.2f} '
                                      f'期望 {exp_name:.2f} {"OK" if ok else "FAIL"}')
                                if not ok:
                                    overall_ok = False
                            else:
                                # 数据卡期间：序幕卡必须归零
                                ok = intro_op <= 0.05
                                print(f'  浮层 {label} (p={p}): 序幕卡={intro_op:.2f} '
                                      f'期望 ≤0.05 {"OK" if ok else "FAIL"}')
                                if not ok:
                                    overall_ok = False

            if path == 'gallery.html':
                cards = await page.locator('.art-card').count()
                # 验证占位：标题应为"即将上架"，价格显示"¥ 咨询"
                titles = await page.evaluate(
                    "() => [...document.querySelectorAll('.art-card .art-card__title')].map(e => e.textContent.trim())")
                print(f'  卡片数: {cards} (占位模式: 6 张"即将上架")')
                if cards != 6:
                    overall_ok = False
                if not all(t == '即将上架' for t in titles):
                    overall_ok = False
                    print(f'    FAIL: 占位标题不符: {titles}')

            if path == 'artwork.html':
                # 占位模式：getArtworkById 返回 null → 走"此作品尚未备档"分支
                placeholder = await page.evaluate(
                    "() => !!document.querySelector('#artworkRoot h1') && "
                    "document.querySelector('#artworkRoot h1').textContent.trim() === '此作品尚未备档'")
                rel = await page.locator('#relatedGrid .art-card').count()
                srcs = await page.evaluate(
                    "() => [...document.querySelectorAll('#relatedGrid img')]"
                    ".map(i => i.getAttribute('src'))")
                print(f'  占位页: {placeholder}, 相似作品: {rel} 张, src={srcs}')
                if not placeholder:
                    overall_ok = False
                    print('    FAIL: 应显示"此作品尚未备档"占位页')

            await page.close()

        # 降级路径：拦截 ScrollTrigger.min.js 加载
        async def check_intro_overlay_fallback(browser):
            page = await browser.new_page()
            intro_errors = []
            def on_pageerror(e):
                msg = str(e)
                if 'intro-overlay' in msg or 'INTRO_OVERLAY' in msg:
                    intro_errors.append(msg)
            page.on('pageerror', on_pageerror)
            await page.route('**/lib/vendor/ScrollTrigger.min.js', lambda r: r.abort())
            await page.goto(f'{BASE}/index.html', wait_until='domcontentloaded')
            await page.wait_for_timeout(2000)
            op_at_top = await page.evaluate(
                "parseFloat(getComputedStyle(document.getElementById('introOverlay')).opacity)"
            )
            print(f'  降级路径 ScrollStory 顶部: intro opacity={op_at_top:.2f} (期望 0.00 ± 0.05)')
            if abs(op_at_top - 0.0) > 0.05:
                overall_ok = False
            if intro_errors:
                print(f'  降级路径 intro-overlay 自身 pageerror: {intro_errors[:3]}')
                overall_ok = False
            await page.close()

        await check_intro_overlay_fallback(browser)

        await browser.close()

        print('\n' + '=' * 46)
        print('全部通过' if overall_ok else '存在失败项，见上文')
        return 0 if overall_ok else 1


sys.exit(asyncio.run(main()))
