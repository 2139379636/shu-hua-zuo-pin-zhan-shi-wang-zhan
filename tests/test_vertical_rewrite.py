"""ScrollStory 竖排重写的视觉与计算样式断言。"""
import asyncio
import sys
from playwright.async_api import async_playwright

URL = 'http://127.0.0.1:8080/index.html'
VIEWPORTS = [
    ('desktop_1440x900', 1440, 900),
    ('tablet_1024x768',  1024, 768),
    ('tablet_900x1280',  900, 1280),
    ('mobile_390x844',   390, 844),
    ('mobile_844x390',   844, 390),
]


async def assert_at_viewport(p, label, w, h, errors):
    browser = await p.chromium.launch()
    page = await browser.new_page(viewport={'width': w, 'height': h})
    await page.goto(URL, wait_until='networkidle', timeout=60000)
    await page.wait_for_timeout(2200)
    bounds = await page.evaluate("""() => {
      const t = ScrollTrigger.getAll().find(x => x.trigger && x.trigger.id === 'scroll-story');
      return t ? {start: t.start, end: t.end} : null;
    }""")
    if not bounds:
        errors.append(f'{label}: no scroll-story trigger')
        await browser.close()
        return

    y = bounds['start'] + (bounds['end'] - bounds['start']) * 0.50
    await page.evaluate('(y) => window.scrollTo(0, y)', y)
    await page.wait_for_timeout(900)

    r = await page.evaluate("""() => {
      const cards = [...document.querySelectorAll('[data-ssc-group="1"] .ssc__card')];
      if (cards.length !== 3) return {err: 'expected 3 cards, got ' + cards.length};
      const styles = cards.map(el => {
        const num = el.querySelector('.ssc__num');
        const unit = el.querySelector('.ssc__unit');
        const desc = el.querySelector('.ssc__desc');
        const rect = el.getBoundingClientRect();
        let wm = getComputedStyle(el).writingMode;
        let p = el.parentElement;
        while (p && wm !== 'vertical-rl') {
          wm = getComputedStyle(p).writingMode;
          p = p.parentElement;
        }
        return {
          num: num ? parseFloat(getComputedStyle(num).fontSize) : 0,
          unit: unit ? parseFloat(getComputedStyle(unit).fontSize) : 0,
          desc: desc ? parseFloat(getComputedStyle(desc).fontSize) : 0,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          writingMode: wm,
        };
      });
      return {
        styles,
        bodyW: document.body.scrollWidth,
        winW: window.innerWidth,
      };
    }""")

    if 'err' in r:
        errors.append(f'{label}: {r["err"]}')
        await browser.close()
        return

    if any(s['writingMode'] != 'vertical-rl' for s in r['styles']):
        errors.append(f'{label}: 卡片竖排未生效 writingMode={[s["writingMode"] for s in r["styles"]]}')

    is_mobile = (w <= 480) or (h <= 480)
    is_tablet = (769 <= w <= 1199) or (h <= 768 and w <= 1199)
    if is_mobile:
        min_num, min_unit, min_desc = (18, 9, 8)
    elif is_tablet:
        min_num, min_unit, min_desc = (22, 11, 10)
    else:
        min_num, min_unit, min_desc = (26, 12, 11)
    for i, s in enumerate(r['styles']):
        if s['num'] < min_num:
            errors.append(f'{label}: card{i} num {s["num"]} < {min_num}')
        if s['unit'] < min_unit:
            errors.append(f'{label}: card{i} unit {s["unit"]} < {min_unit}')
        if s['desc'] < min_desc:
            errors.append(f'{label}: card{i} desc {s["desc"]} < {min_desc}')

    # 3 张卡纵向叠放：DOM 0 = 顶部，DOM 2 = 底部
    if not (r['styles'][0]['top'] < r['styles'][1]['top'] < r['styles'][2]['top']):
        tops = [int(s['top']) for s in r['styles']]
        errors.append(f'{label}: 视觉顺序非纵向叠放 tops={tops}')

    # 全部位于视口右半区（在画作右侧 letterbox）
    mid = r['winW'] / 2
    if any(s['left'] < mid for s in r['styles']):
        lefts = [int(s['left']) for s in r['styles']]
        errors.append(f'{label}: 卡片不在视口右半区 lefts={lefts}')

    if r['bodyW'] != r['winW']:
        errors.append(f'{label}: body 宽度溢出 {r["bodyW"]} != {r["winW"]}')

    await browser.close()


async def main():
    errors = []
    async with async_playwright() as p:
        for label, w, h in VIEWPORTS:
            await assert_at_viewport(p, label, w, h, errors)
    if errors:
        for e in errors:
            print('FAIL:', e)
        sys.exit(1)
    print('all viewports ok')


asyncio.run(main())
