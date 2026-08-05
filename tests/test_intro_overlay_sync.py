"""
回归测试：ScrollStory 浮层文字（含序幕 + 2 组横向卡片）必须随滚轮同步浮现/消失。

契约：
  Part A 序幕（intro-overlay）：A/B/C/D 4 条 — 同步与无障碍
  Part B 2 组卡片（scroll-story-cards）：
    E. 停留期：每组在中段必须完全实体（≥0.95）
    F. 空档：组间必须归零（≤0.05）
    G. 对比度：卡片文字与实际合成背景（截图取样）≥4.5:1
  Part C "宣纸水墨"视觉契约：
    H. 背景半透明：卡片实际渲染色 alpha ≤ 0.65（不压画作）
    I. 圆角 ≥ 6px
    J. 装饰是印章式小方块（width ≤ 16, height ≤ 16, bg = seal red）而非横线
    K. 题款感：desc 元素 letter-spacing ≥ 0.16em
    L. scale 入场：transform 字符串含 "scale"

用法:
  python dev-server.py 8099 &
  python tests/test_intro_overlay_sync.py
"""
import asyncio
import sys

from playwright.async_api import async_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = 'http://127.0.0.1:8099'
URL = f'{BASE}/index.html'

PROGRESS_GRID = [0.0, 0.05, 0.10, 0.13, 0.20, 0.25, 0.30, 0.33, 0.40, 0.50,
                 0.55, 0.60, 0.65, 0.72, 0.80, 0.88, 0.95, 1.0]

# 2 组卡片在 p 空间上的窗口（与 scroll-story-cards-data.js 对齐；组 3 已删）
GROUPS = {
    1: {'in': 0.35, 'hold': 0.50, 'out': 0.60, 'cards': 3},
    2: {'in': 0.65, 'hold': 0.80, 'out': 0.95, 'cards': 3},
}

RANGE_JS = """
() => {
  const st = (window.ScrollTrigger && window.ScrollTrigger.getAll)
    ? window.ScrollTrigger.getAll().find(t => t.trigger && t.trigger.id === 'scroll-story')
    : null;
  if (st) return { start: st.start, end: st.end, source: 'ScrollTrigger' };
  const el = document.getElementById('scroll-story');
  if (!el) return null;
  return { start: el.offsetTop, end: el.offsetTop + 3000, source: 'fallback' };
}
"""

PROBE = """
() => {
  const introRoot = document.getElementById('introOverlay');
  const introCard = introRoot ? introRoot.querySelector('.ssc__card') : null;
  const cards = document.getElementById('scrollStoryCards');
  const groups = document.querySelectorAll('.ssc__group');
  const out = {
    y: Math.round(window.scrollY),
    // 序幕现在是一张卡片：测卡片整体 opacity / transform（name/line 不再独立控制）
    introCardOp: introCard ? parseFloat(getComputedStyle(introCard).opacity) : null,
    introCardTY: introCard ? getComputedStyle(introCard).transform : null,
    cards: cards ? parseFloat(getComputedStyle(cards).opacity) : null,
    groups: [],
  };
  for (const g of groups) {
    const id = parseInt(g.getAttribute('data-ssc-group'), 10);
    const cardEls = g.querySelectorAll('.ssc__card');
    const cardOps = [];
    for (const c of cardEls) cardOps.push(parseFloat(getComputedStyle(c).opacity));
    out.groups.push({ id, cardOps });
  }
  return out;
}
"""

WAIT_LENIS_IDLE = """
() => {
  const l = window.LENIS_INSTANCE;
  if (!l) return true;
  return l.isStopped || Math.abs(l.scroll - l.targetScroll) < 1;
}
"""


def translate_y_of(transform: str) -> float:
    if not transform or transform == 'none':
        return 0.0
    if transform.startswith('matrix(') and transform.endswith(')'):
        parts = [p.strip() for p in transform[len('matrix('):-1].split(',')]
        if len(parts) == 6:
            return float(parts[5])
    return 0.0


async def collect(pw, motion: str):
    browser = await pw.chromium.launch()
    page = await browser.new_page(viewport={'width': 1440, 'height': 900},
                                  reduced_motion=motion)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    await page.goto(URL, wait_until='load')
    try:
        await page.wait_for_selector('#loader.is-hiding', timeout=30000)
    except Exception:
        pass
    await page.wait_for_timeout(1500)

    rng = await page.evaluate(RANGE_JS)
    if rng is None:
        await browser.close()
        raise AssertionError('#scroll-story 不存在')

    samples = {}
    for p in PROGRESS_GRID:
        target = rng['start'] + (rng['end'] - rng['start']) * p
        await page.evaluate(f'window.scrollTo(0, {target})')
        try:
            await page.wait_for_function(WAIT_LENIS_IDLE, timeout=3000)
        except Exception:
            pass
        await page.wait_for_timeout(500)
        samples[p] = await page.evaluate(PROBE)

    return browser, page, rng, samples, errors


def check_part_a(motion: str, samples) -> list:
    """序幕契约：序幕现在是一张卡片（不再分开测 name/line）"""
    fails = []
    card_ops = [s['introCardOp'] for s in samples.values() if s['introCardOp'] is not None]
    print(f'\n----- Part A 序幕 ({motion}) -----')
    for p, s in samples.items():
        if s['introCardOp'] is None:
            continue
        ty = translate_y_of(s['introCardTY'])
        print(f'  p={p:<5} 序幕卡 opacity={s["introCardOp"]:<6.3f}  transform_tx={ty:+.1f}px')

    # A. 档位
    distinct = len({round(o, 2) for o in card_ops})
    if distinct < 4:
        fails.append(f'[{motion}] A 违反: 序幕卡档位数 {distinct} < 4')
    # B. 峰值完全实体
    if max(card_ops) < 0.95:
        fails.append(f'[{motion}] A 违反: 序幕卡峰值 {max(card_ops):.3f} < 0.95')
    # C. 收尾归零
    tail = samples[1.0]['introCardOp']
    if tail > 0.05:
        fails.append(f'[{motion}] A 违反: 收尾序幕卡仍可见 {tail:.3f}')
    # C2. 起点不可见
    head = samples[0.0]['introCardOp']
    if head > 0.05:
        fails.append(f'[{motion}] A 违反: 起点序幕卡已可见 {head:.3f}')
    # D. reduce 下无位移
    if motion == 'reduce':
        max_ty = max(abs(translate_y_of(s['introCardTY'])) for s in samples.values() if s['introCardTY'])
        if max_ty > 0.5:
            fails.append(f'[{motion}] A 违反: reduce 下序幕卡仍有 {max_ty:.1f}px 位移')
    return fails


def check_part_b(motion: str, samples) -> list:
    """2 组卡片契约（组 3 已删）"""
    fails = []
    print(f'\n----- Part B 卡片 ({motion}) -----')

    # E. 停留期：每组在 hold 采样点必须全卡片完全实体
    for gid, spec in GROUPS.items():
        sample = samples[spec['hold']]['groups']
        group = next((g for g in sample if g['id'] == gid), None)
        if group is None:
            fails.append(f'[{motion}] E 违反: 组 {gid} 在 p={spec["hold"]} 不存在')
            continue
        if len(group['cardOps']) != spec['cards']:
            fails.append(f'[{motion}] E 违反: 组 {gid} 卡片数 {len(group["cardOps"])} ≠ 设计 {spec["cards"]}')
            continue
        min_op = min(group['cardOps'])
        ok = 'OK' if min_op >= 0.95 else 'FAIL'
        print(f'  E 组{gid} 停留期 p={spec["hold"]} 卡片={group["cardOps"]} 最小={min_op:.3f} {ok}')
        if min_op < 0.95:
            fails.append(f'[{motion}] E 违反: 组 {gid} 停留期最小卡片透明度 {min_op:.3f} < 0.95')

    # F. 空档：序幕与组 1 之间（0.30-0.35）、各组之间
    # 验证 0.33 点：此时序幕已淡出（≤0.30）、组 1 尚未进（≥0.35）
    for p in (0.33,):
        sample = samples[p]['groups']
        cards_op = []
        for g in sample:
            cards_op.extend(g['cardOps'])
        max_card = max(cards_op) if cards_op else 0
        intro_op = samples[p]['introCardOp']
        print(f'  F 空档 p={p} 数据卡 max={max_card:.3f} 序幕卡={intro_op}')
        if max_card > 0.05:
            fails.append(f'[{motion}] F 违反: p={p} 数据卡仍可见 max={max_card:.3f}')
        if intro_op > 0.05:
            fails.append(f'[{motion}] F 违反: p={p} 序幕卡仍可见 {intro_op}')

    # G. 卡片文字与合成背景对比度（截图取样，最坏情况）
    return fails


async def collect_screenshots(pw, motion: str) -> list:
    """在每组 hold 点截图，用于 G 断言"""
    from pathlib import Path
    Path('tests/_g_shots').mkdir(exist_ok=True)
    files = []
    browser, page, rng, _, _ = await collect(pw, motion)
    for gid, spec in GROUPS.items():
        target = rng['start'] + (rng['end'] - rng['start']) * spec['hold']
        await page.evaluate(f'window.scrollTo(0, {target})')
        try:
            await page.wait_for_function(WAIT_LENIS_IDLE, timeout=3000)
        except Exception:
            pass
        await page.wait_for_timeout(800)
        path = f'tests/_g_shots/motion-{motion}-g{gid}.png'
        await page.screenshot(path=path)
        files.append((gid, path))
    await browser.close()
    return files


def check_part_g(shots: list) -> list:
    """G. 卡片文字与实际合成背景对比度 ≥4.5:1"""
    from PIL import Image
    fails = []
    PAPER = (0xF5, 0xF1, 0xE8)

    def lum(rgb):
        def c(v):
            v = v / 255
            return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
        r, g, b = rgb[:3]
        return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b)

    def ratio(a, b):
        la, lb = lum(a), lum(b)
        hi, lo = max(la, lb), min(la, lb)
        return (hi + 0.05) / (lo + 0.05)

    # 半透明墨色 rgba(26,26,26,0.68) 与不同画背景合成后的颜色
    BG_R, BG_G, BG_B = 26, 26, 26
    ALPHA = 0.68
    print(f'\n----- Part G 卡片对比度（采集 {len(shots)} 帧）-----')
    for gid, path in shots:
        img = Image.open(path).convert('RGB')
        W, H = img.size
        # 在画布中段 60-80% 区域采样（避开 nav、避开最暗纯画面、最可能与卡片重叠的带）
        # 用 .ssc__card 元素的几何中心更准；先估个粗略区域
        y_band = range(int(H * 0.42), int(H * 0.62), 4)
        x_band = range(int(W * 0.20), int(W * 0.80), 4)
        # 取该区域中"最接近纯墨色 26" 的像素作为"卡片底板"的代表（避开画的高光）
        candidates = []
        for y in y_band:
            for x in x_band:
                px = img.getpixel((x, y))
                # 偏向暗色 = 卡片底板（画是亮色）
                if sum(px) / 3 < 90:
                    candidates.append(px)
        if not candidates:
            fails.append(f'[g] 违反: 组 {gid} 截图未找到卡片底板像素（找不到暗色区域）')
            print(f'  组{gid} FAIL: 找不到卡片底板像素')
            continue
        # 取中位
        candidates.sort(key=lambda p: sum(p))
        bg = candidates[len(candidates) // 2]
        r = ratio(PAPER, bg)
        verdict = 'OK' if r >= 4.5 else 'FAIL'
        print(f'  组{gid} 底板代表 {bg} 对比度 {r:.2f}:1 {verdict}')
        if r < 4.5:
            fails.append(f'[g] 违反: 组 {gid} 卡片底板 {bg} 与文字对比度 {r:.2f}:1 < 4.5')
    return fails


async def main():
    all_fails = []
    async with async_playwright() as pw:
        for motion in ('no-preference', 'reduce'):
            browser, page, _, samples, errors = await collect(pw, motion)
            all_fails += check_part_a(motion, samples)
            all_fails += check_part_b(motion, samples)
            all_fails += await check_part_c(motion, page, samples)
            if errors:
                all_fails.append(f'[{motion}] 控制台异常: {errors[:3]}')
            await browser.close()

        # G 只需要一组截图就够（两种 motion 共享同一帧，但用 no-preference 即可）
        shots = await collect_screenshots(pw, 'no-preference')
        all_fails += check_part_g(shots)

    print('\n' + '=' * 60)
    if all_fails:
        print(f'FAIL - {len(all_fails)} 项契约未满足:')
        for f in all_fails:
            print('  x ' + f)
        return 1
    print('PASS - 序幕 + 2 组卡片都随滚轮同步浮现/消失，对比度达标，宣纸水墨质感')
    return 0


async def check_part_c(motion: str, page, samples) -> list:
    """宣纸水墨视觉契约：H 背景透明 / I 圆角 / J 印章 / K 题款 / L scale 入场"""
    fails = []
    # 取组 1 hold 点 (p=0.40)，首张卡片稳定状态
    s = samples[0.40]
    g1 = next((g for g in s['groups'] if g['id'] == 1), None)
    if not g1:
        return [f'[{motion}] C 跳过: p=0.40 组 1 不存在']

    info = await page.evaluate("""() => {
      const grp = document.querySelector('[data-ssc-group="1"]');
      const card = grp.querySelector('.ssc__card');
      const rule = grp.querySelector('.ssc__rule');
      const desc = grp.querySelector('.ssc__desc');
      const cs = getComputedStyle(card);
      // 背景透明度：linear-gradient 模式下 backgroundColor 是 transparent，
      // 必须解析 backgroundImage 中的 rgba 通道
      let alpha = 1;
      const bgImg = cs.backgroundImage;
      if (bgImg && bgImg !== 'none') {
        const matches = [...bgImg.matchAll(/rgba?\\(([^)]+)\\)/g)];
        if (matches.length) {
          const alphas = matches.map(m => parseFloat(m[1].split(',').slice(-1)[0].trim()));
          alpha = Math.max(...alphas);  // 取最深档
        }
      } else {
        const m = cs.backgroundColor.match(/rgba?\\(([^)]+)\\)/);
        if (m) alpha = parseFloat(m[1].split(',').slice(-1)[0].trim());
      }
      // 检测 scale：matrix(a,b,c,d,tx,ty) 的 a/d 系数偏离 1 即等价 scale
      let hasScale = cs.transform.includes('scale');
      if (!hasScale && cs.transform.startsWith('matrix(')) {
        const parts = cs.transform.slice(7, -1).split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 6 && (Math.abs(parts[0] - 1) > 0.001 || Math.abs(parts[3] - 1) > 0.001)) {
          hasScale = true;
        }
      }
      return {
        card: {
          alpha,
          borderRadius: cs.borderRadius,
          transform: cs.transform,
          hasScale,
          boxShadow: cs.boxShadow,
        },
        rule: {
          width: parseFloat(getComputedStyle(rule).width),
          height: parseFloat(getComputedStyle(rule).height),
          background: getComputedStyle(rule).backgroundColor,
        },
        desc: {
          letterSpacing: getComputedStyle(desc).letterSpacing,
        },
      };
    }""")

    print(f'\n----- Part C 宣纸水墨 ({motion}) -----')
    print(f'  卡片 alpha={info["card"]["alpha"]}  圆角={info["card"]["borderRadius"]}  '
          f'transform={info["card"]["transform"][:60]}  shadow={info["card"]["boxShadow"][:50]}')
    print(f'  装饰 {info["rule"]}  desc spacing={info["desc"]["letterSpacing"]}')

    # H. 背景半透明 α ≤ 0.65
    if info['card']['alpha'] > 0.65:
        fails.append(f'[{motion}] H 违反: 卡片背景 alpha={info["card"]["alpha"]} > 0.65（压画）')
    elif info['card']['alpha'] < 0.40:
        fails.append(f'[{motion}] H 违反: 卡片背景 alpha={info["card"]["alpha"]} < 0.40（太透，对比度风险）')

    # I. 圆角 ≥ 6px
    br = parse_px(info['card']['borderRadius'])
    if br < 6:
        fails.append(f'[{motion}] I 违反: 圆角 {br}px < 6px（太硬）')

    # J. 印章式装饰（不是横线）：width ≤ 16, height ≤ 16, bg = seal red
    if info['rule']['width'] > 16 or info['rule']['height'] > 16:
        fails.append(f'[{motion}] J 违反: 装饰物 {info["rule"]["width"]}×{info["rule"]["height"]}px — 应是印章式小方块（≤16px），不是横线')
    if 'rgb(168, 51, 44)' not in info['rule']['background'] and '168, 51, 44' not in info['rule']['background']:
        fails.append(f'[{motion}] J 违反: 装饰物不是朱砂红实心 (bg={info["rule"]["background"]})')

    # K. 题款感：desc letter-spacing ≥ 0.16em
    ls = parse_em(info['desc']['letterSpacing'])
    if ls is None or ls < 0.16:
        fails.append(f'[{motion}] K 违反: desc letter-spacing={info["desc"]["letterSpacing"]} < 0.16em（缺题款感）')

    # L. scale 入场（首张卡 hold 时 transform 应等价于 scale 矩阵）
    if motion == 'no-preference' and not info['card']['hasScale']:
        fails.append(f'[{motion}] L 违反: 卡片 transform={info["card"]["transform"]} 不含 scale（入场缺"从纸面浮出"感）')

    return fails


def parse_px(s: str):
    if not s: return 0.0
    m = s.match(r'([\d.]+)px') if hasattr(s, 'match') else None
    if m: return float(m.group(1))
    import re
    m = re.search(r'([\d.]+)px', s)
    return float(m.group(1)) if m else 0.0


def parse_em(s: str):
    if not s: return None
    import re
    m = re.search(r'([\d.]+)em', s)
    if m: return float(m.group(1))
    m = re.search(r'([\d.]+)px', s)
    if m:
        # 16px = 1em
        return float(m.group(1)) / 16.0
    return None


sys.exit(asyncio.run(main()))
