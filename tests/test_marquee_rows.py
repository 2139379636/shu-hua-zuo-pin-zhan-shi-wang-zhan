"""
Marquee 行契约测试 — 验证两行各自独立组件控制。

契约：
  A. row1 唯一 id 集合 == {1..9}（按文件命名）
  B. row2 唯一 id 集合 == {10..19}（排除 20）
  C. 在 1440x900 viewport 下两行都完全可见
     （r1Top > 0 && r2Bottom <= vh；行间距允许 ±30px 容差）
  D. 两行 transform 在 1.5s 后各自有变化（独立动画）
  E. hover 任一行只暂停该行（不影响另一行）

用法:
  python dev-server.py 8099 &
  python tests/test_marquee_rows.py
"""
import asyncio
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from playwright.async_api import async_playwright

BASE = 'http://127.0.0.1:8099'
URL = f'{BASE}/index.html'

PROBE = """
() => {
  const r1 = document.getElementById('marqueeRow1');
  const r2 = document.getElementById('marqueeRow2');
  return {
    r1: {
      ids: Array.from(r1.querySelectorAll('.marquee__tile')).map(t => t.getAttribute('data-id')),
      tx: parseFloat((getComputedStyle(r1).transform.match(/matrix.*\\(([^)]+)\\)/) || ['','0,0,0,0,0,0'])[1].split(',')[4]) || 0,
      top: Math.round(r1.getBoundingClientRect().top),
      bottom: Math.round(r1.getBoundingClientRect().bottom),
      scrollWidth: r1.scrollWidth,
    },
    r2: {
      ids: Array.from(r2.querySelectorAll('.marquee__tile')).map(t => t.getAttribute('data-id')),
      tx: parseFloat((getComputedStyle(r2).transform.match(/matrix.*\\(([^)]+)\\)/) || ['','0,0,0,0,0,0'])[1].split(',')[4]) || 0,
      top: Math.round(r2.getBoundingClientRect().top),
      bottom: Math.round(r2.getBoundingClientRect().bottom),
      scrollWidth: r2.scrollWidth,
    },
    vh: window.innerHeight,
  };
}
"""


async def main():
    all_fails = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(URL, wait_until='load')
        try:
            await page.wait_for_selector('#loader.is-hiding', timeout=30000)
        except Exception:
            pass
        await page.wait_for_timeout(1500)
        # 滚到 marquee 可见
        await page.evaluate("document.getElementById('marquee').scrollIntoView({block:'start'})")
        await page.wait_for_timeout(800)

        s1 = await page.evaluate(PROBE)

        # A. row1 唯一 id 集合 == 1-9
        r1_unique = sorted({int(x) for x in s1['r1']['ids']})
        r2_unique = sorted({int(x) for x in s1['r2']['ids']})
        print(f'\nrow1 unique ids: {r1_unique}')
        print(f'row2 unique ids: {r2_unique}')
        if r1_unique != list(range(1, 10)):
            all_fails.append(f'A 违反: row1 唯一 id {r1_unique} ≠ 1-9')
        if r2_unique != list(range(10, 20)):
            all_fails.append(f'B 违反: row2 唯一 id {r2_unique} ≠ 10-19')

        # C. 在 1440x900 下两行都完全可见
        vh = s1['vh']
        r1_in_view = s1['r1']['top'] >= 0 and s1['r1']['bottom'] <= vh + 30
        r2_in_view = s1['r2']['top'] >= 0 and s1['r2']['bottom'] <= vh + 30
        print(f'viewport={vh}  row1 [{s1["r1"]["top"]},{s1["r1"]["bottom"]}] in_view={r1_in_view}  '
              f'row2 [{s1["r2"]["top"]},{s1["r2"]["bottom"]}] in_view={r2_in_view}')
        if not r1_in_view:
            all_fails.append(f'C 违反: row1 bottom={s1["r1"]["bottom"]} > vh+30={vh+30}')
        if not r2_in_view:
            all_fails.append(f'C 违反: row2 bottom={s1["r2"]["bottom"]} > vh+30={vh+30}')

        # D. 1.5s 后两行 transform 应有变化
        await page.wait_for_timeout(1500)
        s2 = await page.evaluate(PROBE)
        r1_moved = abs(s2['r1']['tx'] - s1['r1']['tx']) > 5
        r2_moved = abs(s2['r2']['tx'] - s1['r2']['tx']) > 5
        print(f'tx 变化: row1 Δ={s2["r1"]["tx"] - s1["r1"]["tx"]:+.1f}px  row2 Δ={s2["r2"]["tx"] - s1["r2"]["tx"]:+.1f}px')
        if not r1_moved:
            all_fails.append(f'D 违反: row1 1.5s 后未移动 Δtx={s2["r1"]["tx"] - s1["r1"]["tx"]}')
        if not r2_moved:
            all_fails.append(f'D 违反: row2 1.5s 后未移动 Δtx={s2["r2"]["tx"] - s1["r2"]["tx"]}')

        # E. hover row1 不影响 row2
        # 用 viewport 内的实际坐标（row1.left 可能是负数，因为 CSS transform 把它左移）
        r1_box = await page.evaluate("""() => {
          const r = document.getElementById('marqueeRow1').getBoundingClientRect();
          // 视口内可见部分的中心：x 用 max(50, left+50)，避免 hover 到屏幕外
          const x = Math.max(80, r.left + 80);
          const y = r.top + r.height/2;
          return { x, y };
        }""")
        await page.mouse.move(r1_box['x'], r1_box['y'])
        await page.wait_for_timeout(800)
        s3 = await page.evaluate(PROBE)
        r1_paused = abs(s3['r1']['tx'] - s2['r1']['tx']) < 5
        r2_still = abs(s3['r2']['tx'] - s2['r2']['tx']) > 5
        print(f'hover row1: row1 paused={r1_paused} (Δtx={s3["r1"]["tx"] - s2["r1"]["tx"]:+.1f})  '
              f'row2 still moving={r2_still} (Δtx={s3["r2"]["tx"] - s2["r2"]["tx"]:+.1f})')
        if not r1_paused:
            all_fails.append(f'E 违反: hover row1 但未暂停 Δtx={s3["r1"]["tx"] - s2["r1"]["tx"]}')
        if not r2_still:
            all_fails.append(f'E 违反: hover row1 导致 row2 也停 Δtx={s3["r2"]["tx"] - s2["r2"]["tx"]}')

        if errors:
            all_fails.append(f'控制台异常: {errors[:3]}')

        await browser.close()

    print('\n' + '=' * 60)
    if all_fails:
        print(f'FAIL - {len(all_fails)} 项契约未满足:')
        for f in all_fails:
            print('  x ' + f)
        return 1
    print('PASS - 两行各自独立组件，内容/可见/动画/暂停均正确')
    return 0


sys.exit(asyncio.run(main()))
