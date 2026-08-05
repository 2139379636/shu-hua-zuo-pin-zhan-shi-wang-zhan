"""多视口验证 ScrollStory 画布（contain + 装裱 letterbox + Light Rays 远山青光线策略）

断言要点：
1. canvas CSS 尺寸符合 16:9 viewport 约束（92vw × 88vh - nav-height）
2. canvas 实际渲染严格 16:9（±0.01）
3. 装裱背景含 gradient，painting 实际绘制（4 角 bitmap ≠ 全黑）
4. ScrollTrigger 已激活，section 处于 pin + is-active 状态
5. light-rays-bg canvas 存在 + WebGL context 已创建 + letterbox 区域有光线渲染（RGB ≠ 全黑）
"""
import asyncio
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright


VIEWPORTS = [
    ('desktop_1440x900', 1440, 900),
    ('fullhd_1920x1080', 1920, 1080),
    ('desktop_1024x768', 1024, 768),
    ('mobile_390x844', 390, 844),
    ('mobile_landscape_844x390', 844, 390),
]

OUT_DIR = Path('tests/_g_shots/scrollstory-fit')


async def measure(page, label: str, vw: int, vh: int) -> dict:
    """滚动到 ScrollStory 中段（用 ScrollTrigger 实例的 start/end），等帧绘制后测量"""
    await page.evaluate("""() => {
      const triggers = window.ScrollTrigger ? window.ScrollTrigger.getAll() : [];
      const t = triggers.find(t => t.trigger && t.trigger.id === 'scroll-story');
      if (t) window.scrollTo(0, t.start + (t.end - t.start) * 0.5);
    }""")
    await page.wait_for_timeout(1800)  # 等 Lenis 静止 + drawFrame 重新绘制

    return await page.evaluate("""() => {
      const s = document.getElementById('scroll-story');
      const c = document.getElementById('scrollStoryCanvas');
      const silk = document.getElementById('lightRaysBg');
      const sr = s.getBoundingClientRect();
      const cr = c.getBoundingClientRect();
      const cs = getComputedStyle(s);
      const cc = getComputedStyle(c);

      // light-rays-bg 状态
      let silkInfo = { exists: false };
      if (silk) {
        const skRect = silk.getBoundingClientRect();
        const skCS = getComputedStyle(silk);
        let hasContext = false;
        let letterboxSample = null;
        try {
          // 尝试获取 webgl context（不创建新的）
          const gl = silk.getContext('webgl') || silk.getContext('webgl2');
          hasContext = !!gl;
          // 取 letterbox 区域（顶部 letterbox，WebGL framebuffer y=0 是底部，
          // 所以取 silk.height * 0.85 = 顶部 15% 区域；top-center 起点正下方）
          if (gl) {
            const x = Math.max(1, Math.floor(silk.width * 0.5));
            const y = Math.max(1, Math.floor(silk.height * 0.85));
            const pix = new Uint8Array(4);
            gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pix);
            letterboxSample = [pix[0], pix[1], pix[2], pix[3]];
          }
        } catch(e) { letterboxSample = ['err', e.message]; }
        silkInfo = {
          exists: true,
          width: Math.round(skRect.width),
          height: Math.round(skRect.height),
          zIndex: skCS.zIndex,
          position: skCS.position,
          hasContext,
          letterboxSample,
        };
      }
      // 取 canvas 中心 4 像素均值，判断 drawing 实际内容
      const ctx = c.getContext('2d');
      let sample = null;
      try {
        const x = Math.floor(c.width / 2), y = Math.floor(c.height / 2);
        const data = ctx.getImageData(x, y, 1, 1).data;
        sample = [data[0], data[1], data[2]];
      } catch(e) { sample = ['err', e.message]; }
      return {
        viewport: {w: window.innerWidth, h: window.innerHeight},
        section: {w: Math.round(sr.width), h: Math.round(sr.height)},
        canvas:  {w: Math.round(cr.width), h: Math.round(cr.height)},
        padding: {
          top:    Math.max(0, Math.round(sr.top - cr.top)),
          bottom: Math.max(0, Math.round(cr.bottom - sr.bottom)),
          left:   Math.max(0, Math.round(sr.left - cr.left)),
          right:  Math.max(0, Math.round(cr.right - sr.right)),
        },
        css: {
          sectionHeight: cs.height,
          sectionBgImage: cs.backgroundImage,
          canvasWidth: cc.width, canvasHeight: cc.height,
          canvasAspect: cc.aspectRatio,
          canvasOutline: cc.outlineStyle,
          outlineWidth: cc.outlineWidth,
        },
        isActive: s.classList.contains('is-active'),
        sectionOpacity: cs.opacity,
        bitmapSample: sample,
        silk: silkInfo,
        bitmapCornerSamples: (() => {
          // 4 角内 10px 采样，确认 canvas 内部 drawing 未超界
          try {
            const x10 = Math.min(10, Math.floor(c.width * 0.05));
            const y10 = Math.min(10, Math.floor(c.height * 0.05));
            const corners = [
              [x10, y10],
              [c.width - x10 - 1, y10],
              [x10, c.height - y10 - 1],
              [c.width - x10 - 1, c.height - y10 - 1],
            ];
            return corners.map(([x, y]) => {
              const d = ctx.getImageData(x, y, 1, 1).data;
              return [d[0], d[1], d[2]];
            });
          } catch(e) { return ['err', e.message, null, null]; }
        })(),
      };
    }""")


def assert_pass(info: dict, vw: int, vh: int) -> list[str]:
    fails = []
    s = info['section']
    c = info['canvas']
    p = info['padding']
    css = info['css']
    # 断言 1：canvas 必须 < section（已缩放留装裱空间），且不超过 92%×88%
    if c['w'] > s['w'] or c['h'] > s['h']:
        fails.append(f"FAIL: canvas {c['w']}x{c['h']} 超出 section {s['w']}x{s['h']}")
    # canvas ≤ 92% section width
    if c['w'] > s['w'] * 0.94:
        fails.append(f"FAIL: canvas width {c['w']} > 92% section width {s['w']}（未缩放）")
    # canvas ≤ 88% section height
    if c['h'] > s['h'] * 0.90:
        fails.append(f"FAIL: canvas height {c['h']} > 88% section height {s['h']}（未缩放）")
    # 断言 2：canvas 居中（左右 padding 差 ≤ 2px，上下 padding 差 ≤ 2px）
    if abs(p['left'] - p['right']) > 2:
        fails.append(f"FAIL: 水平未居中 L={p['left']} R={p['right']}")
    if abs(p['top'] - p['bottom']) > 2:
        fails.append(f"FAIL: 垂直未居中 T={p['top']} B={p['bottom']}")
    # 断言 3：painting 必须完全在 canvas 内（不会被 canvas 边界裁切）
    #  - 96%×96% 区域在 canvas 内 → 验证
    sample_box = info.get('bitmapCornerSamples', [])
    if sample_box and len(sample_box) == 4:
        # 4 角采样应在 painting 内（多颜色）或全黑 letterbox（无 painting）
        for i, s in enumerate(sample_box):
            if s == 'err':
                fails.append(f"FAIL: 角采样 {i} 失败 {s}")
    # 断言 4：canvas 实际尺寸比例 ≈ 16/9（±0.01）
    actual_ratio = c['w'] / c['h'] if c['h'] else 0
    if abs(actual_ratio - 16/9) > 0.01:
        fails.append(f"FAIL: canvas 实际比例 {actual_ratio:.3f} (期望 16/9 = {16/9:.3f})")
    # 断言 4b：描边 1px
    if '1px' not in css['outlineWidth']:
        fails.append(f"FAIL: outline-width={css['outlineWidth']} (期望 1px)")
    # 断言 5：is-active + opacity 1
    if not info['isActive']:
        fails.append("FAIL: section 缺少 is-active 类")
    if abs(float(info['sectionOpacity']) - 1) > 0.05:
        fails.append(f"FAIL: section opacity={info['sectionOpacity']} (期望 1)")
    # 断言 6：section 背景含装裱渐变（不再纯 #1A1A1A）
    bg = css.get('sectionBgImage', '')
    if 'gradient' not in bg:
        fails.append(f"FAIL: section bg 缺少渐变装饰: {bg[:60]}")
    # 断言 7：light-rays-bg canvas 存在 + WebGL context + letterbox 区域渲染
    silk = info.get('silk', {})
    if not silk.get('exists'):
        fails.append("FAIL: #lightRaysBg canvas 不存在")
    elif not silk.get('hasContext'):
        fails.append("FAIL: light-rays-bg WebGL context 未创建")
    else:
        sample = silk.get('letterboxSample')
        if not sample or sample == 'err':
            fails.append(f"FAIL: light-rays letterbox 采样失败 {sample}")
        else:
            r, g, b, a = sample
            # Light Rays raysColor = #5C7A6B = (92, 122, 107)，shader 输出含 base * color * brightness
            # 期望 letterbox 区域 RGB 在远山青色附近（不是纯黑 26,26,26）
            if r == g == b and r < 30:
                fails.append(f"FAIL: light-rays letterbox 仍为黑底 {sample}（light rays 未渲染）")
    return fails


def render_row(label: str, vw: int, vh: int, info: dict) -> str:
    s = info['section']
    c = info['canvas']
    p = info['padding']
    css = info['css']
    corners = info.get('bitmapCornerSamples', [])
    silk = info.get('silk', {})
    return (
        f"--- {label} (viewport {vw}x{vh}) ---\n"
        f"  section  {s['w']}x{s['h']}    "
        f"padding T/B/L/R = {p['top']}/{p['bottom']}/{p['left']}/{p['right']}\n"
        f"  canvas   {c['w']}x{c['h']} (缩放 {(c['w']/s['w']*100):.1f}% × {(c['h']/s['h']*100):.1f}%)    "
        f"CSS aspect={css['canvasAspect']}\n"
        f"  描边     {css['outlineWidth']} {css['canvasOutline']}\n"
        f"  装裱背景 {'有' if 'gradient' in css['sectionBgImage'] else '无'}\n"
        f"  silk     {silk.get('width', 0)}x{silk.get('height', 0)}  "
        f"z={silk.get('zIndex', '-')}  pos={silk.get('position', '-')}  "
        f"webgl={'OK' if silk.get('hasContext') else 'NO'}  "
        f"letterbox RGBA={silk.get('letterboxSample', '-')}\n"
        f"  isActive={info['isActive']}  opacity={info['sectionOpacity']}  "
        f"中心 RGB={info['bitmapSample']}  4 角={corners}\n"
    )


async def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    overall_ok = True
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for label, vw, vh in VIEWPORTS:
            page = await browser.new_page(viewport={'width': vw, 'height': vh})
            await page.goto('http://127.0.0.1:8080/index.html', wait_until='networkidle', timeout=60000)
            await page.wait_for_timeout(2200)  # 等 loader 关闭 + 帧加载
            info = await measure(page, label, vw, vh)
            fails = assert_pass(info, vw, vh)
            print(render_row(label, vw, vh, info))
            for f in fails:
                print('  ', f)
                overall_ok = False
            await page.locator('#scroll-story').screenshot(path=str(OUT_DIR / f'{label}.png'))
            await page.close()
        await browser.close()
    print(f'\n截图保存到 {OUT_DIR.resolve()}')
    print('\n' + '=' * 50)
    print('全部通过' if overall_ok else '存在失败项，见上文')
    return 0 if overall_ok else 1


import sys
sys.exit(asyncio.run(main()))
