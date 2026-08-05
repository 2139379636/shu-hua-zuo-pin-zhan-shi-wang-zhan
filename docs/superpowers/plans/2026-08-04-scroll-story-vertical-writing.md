# ScrollStory 全文字古籍竖排实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 ScrollStory 序幕与右侧两组共六张数据文字统一改为古籍式从上到下竖排，并放大字号，保证 5 视口可读且不回归现有动画。

**Architecture:** 仅修改 `styles.css`，通过 `writing-mode: vertical-rl + text-orientation: upright` 控制文字方向、`.ssc__group` 改为 3 列 grid 实现右起读题签、`.ssc__line` 切换为列向 flex，封装在 `@supports (writing-mode: vertical-rl)` 块内做渐进增强与降级。`prefers-reduced-motion` 继续只关闭位移和缩放。

**Tech Stack:** 原生 HTML/CSS/JS、GSAP ScrollTrigger、Lenis、Google Fonts、Playwright（E2E）。

**相关文件：**
- 规格文档：`docs/superpowers/specs/2026-08-04-scroll-story-vertical-writing-design.md`
- 修改：`styles.css`
- 新增（可选）：`tests/test_vertical_rewrite.py`
- 现有参考：`lib/intro-overlay.js`、`lib/scroll-story-cards.js`、`lib/scroll-story-cards-data.js`、`ink-effects.js`

**前置假设：**
- 项目不使用 Git；每个任务以“保存文件 + 跑测试 + 截图”作为完成检查点。
- 已有 dev-server 在 `127.0.0.1:8080` 端口可用。
- Playwright 已安装且 Chromium 可用。

---

## Task 1：建立回归基线截图

**目的**：把当前未修改版本的画面存档，后续作为 before/after 对照。

**Files:**
- Create: `tests/_capture_vertical_rewrite/baseline/`
- Modify: `tests/_capture_vertical_rewrite/baseline/capture.py`（新建）

- [ ] **Step 1：创建截图脚本骨架**

```python
"""基线截图：未改动前的 ScrollStory 三阶段画面。"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path(__file__).parent
URL = 'http://127.0.0.1:8080/index.html'

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await page.goto(URL, wait_until='networkidle', timeout=60000)
        await page.wait_for_timeout(2500)
        bounds = await page.evaluate("""() => {
          const t = ScrollTrigger.getAll().find(x => x.trigger && x.trigger.id === 'scroll-story');
          return t ? {start: t.start, end: t.end} : null;
        }""")
        assert bounds, '未找到 scroll-story 触发器'
        for phase, p_val in [('prologue', 0.20), ('group1', 0.50), ('group2', 0.80)]:
            y = bounds['start'] + (bounds['end'] - bounds['start']) * p_val
            await page.evaluate('(y) => window.scrollTo(0, y)', y)
            await page.wait_for_timeout(1200)
            await page.screenshot(path=str(OUT / f'{phase}.png'))
        await browser.close()
        print('baseline ok')

if __name__ == '__main__':
    asyncio.run(main())
```

- [ ] **Step 2：运行脚本，确认输出文件**

```bash
python tests/_capture_vertical_rewrite/baseline/capture.py
ls tests/_capture_vertical_rewrite/baseline/
```

预期输出：`prologue.png / group1.png / group2.png` 三个文件。

- [ ] **Step 3：人工目视检查**

打开三张截图，确认：序幕仍竖排但字号偏小；右侧数据题签“卡片纵向堆叠、内容横排”。把观察结果记录到 `tests/_capture_vertical_rewrite/baseline/notes.md`，作为 before 状态。

---

## Task 2：建立 DOM/CSS 自动断言脚本

**目的**：以编程方式捕获 before/after 差异，避免每次肉眼比对。

**Files:**
- Create: `tests/test_vertical_rewrite.py`

- [ ] **Step 1：编写测试骨架（必须先失败）**

```python
"""ScrollStory 竖排重写的视觉与计算样式断言。"""
import asyncio
import sys
from pathlib import Path
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

    # 进入组 1 实体（progress 0.50），断言数据题签竖排与字号
    y = bounds['start'] + (bounds['end'] - bounds['start']) * 0.50
    await page.evaluate('(y) => window.scrollTo(0, y)', y)
    await page.wait_for_timeout(900)

    r = await page.evaluate("""() => {
      const cards = [...document.querySelectorAll('[data-ssc-group=\"1\"] .ssc__card')];
      if (cards.length !== 3) return {err: 'expected 3 cards, got ' + cards.length};
      const styles = cards.map(el => {
        const num = el.querySelector('.ssc__num');
        const unit = el.querySelector('.ssc__unit');
        const desc = el.querySelector('.ssc__desc');
        const rect = el.getBoundingClientRect();
        return {
          num: num ? parseFloat(getComputedStyle(num).fontSize) : 0,
          unit: unit ? parseFloat(getComputedStyle(unit).fontSize) : 0,
          desc: desc ? parseFloat(getComputedStyle(desc).fontSize) : 0,
          left: rect.left,
          top: rect.top,
          writingMode: getComputedStyle(el).writingMode,
        };
      });
      const bodyW = document.body.scrollWidth;
      const winW = window.innerWidth;
      return {styles, bodyW, winW};
    }""")

    if 'err' in r:
        errors.append(f'{label}: {r["err"]}')
        await browser.close()
        return

    if any(s['writingMode'] != 'vertical-rl' for s in r['styles']):
        errors.append(f'{label}: cards not vertical-rl: {[s["writingMode"] for s in r["styles"]]}')

    # 桌面字号阈值；移动端放宽
    is_mobile = (w <= 480) or (h <= 480)
    min_num, min_unit, min_desc = (32, 14, 12) if is_mobile else (36, 16, 14)
    for i, s in enumerate(r['styles']):
        if s['num'] < min_num:
            errors.append(f'{label}: card{i} num {s["num"]} < {min_num}')
        if s['unit'] < min_unit:
            errors.append(f'{label}: card{i} unit {s["unit"]} < {min_unit}')
        if s['desc'] < min_desc:
            errors.append(f'{label}: card{i} desc {s["desc"]} < {min_desc}')

    # 视觉顺序右起读：DOM 0 在最右（left 最大）
    if not (r['styles'][0]['left'] > r['styles'][1]['left'] > r['styles'][2]['left']):
        errors.append(f'{label}: 视觉顺序非右起读 lefts={[s["left"] for s in r["styles"]]}')

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
```

- [ ] **Step 2：运行并确认失败**

```bash
python tests/test_vertical_rewrite.py
```

预期：多个 FAIL，因为当前 `.ssc__card` 仍是横排、字号也低于阈值、DOM 顺序与 left 顺序未反转。

- [ ] **Step 3：留下测试骨架，不要删除**

保留 `tests/test_vertical_rewrite.py` 作为后续 Task 8 的回归入口。

---

## Task 3：改造 `.ssc__group` 为 3 列 grid

**目的**：让组 1 / 组 2 的三张题签在视觉上变成右起读的并列竖列。

**Files:**
- Modify: `styles.css:2097-2129`（`.ssc`、`.ssc__group`、`.ssc__group[data-ssc-group="1/2"]`）

- [ ] **Step 1：定位当前规则**

读取 `styles.css:2097-2129`，确认 `.ssc__group` 当前是 `display: grid; grid-template-columns: 1fr;`，并保留上下文。

- [ ] **Step 2：在 `@supports (writing-mode: vertical-rl)` 块中改造 grid**

新增/替换：

```css
@supports (writing-mode: vertical-rl) {
  .ssc__group {
    grid-template-columns: auto auto auto;
    direction: ltr;
    writing-mode: vertical-rl;
    text-orientation: upright;
    gap: 14px;
    align-items: flex-start;
    justify-items: start;
    max-width: 18vw;
  }
  .ssc__card {
    writing-mode: vertical-rl;
    text-orientation: upright;
    align-items: flex-start;
    justify-content: flex-start;
    text-align: start;
    padding: 8px 12px;
    aspect-ratio: auto;
    min-height: 280px;
    transform-origin: 50% 50%;
  }
  .ssc__line {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .ssc__rule {
    align-self: flex-start;
    margin-bottom: 0.4em;
  }
  .ssc__num {
    font-size: clamp(34px, 5vh, 44px);
    letter-spacing: 0.02em;
  }
  .ssc__num--combine {
    text-combine-upright: all;
  }
  .ssc__unit {
    font-size: clamp(16px, 1.6vh, 18px);
  }
  .ssc__desc {
    font-size: clamp(14px, 2.2vh, 16px);
    letter-spacing: 0.14em;
    line-height: 1.4;
  }
}
```

`@supports` 块外保留旧规则不变，提供降级路径。

- [ ] **Step 3：运行回归断言**

```bash
python tests/test_vertical_rewrite.py
```

预期：所有视口下 `.ssc__card.writingMode === 'vertical-rl'` 通过；视觉顺序右起读通过；桌面 num≥36、unit≥16、desc≥14 通过；移动端 num≥32、unit≥14、desc≥12 通过；不溢出通过。

- [ ] **Step 4：保存改动**

无 git commit；在任务清单中标记完成。

---

## Task 4：放大组 1 / 组 2 卡片字号与列距

**目的**：在竖排基础上保证数据可读（避免上一版“字号过小”反馈）。

**Files:**
- Modify: `styles.css:2198-2209`（`.ssc__desc`、`.ssc__num`、`.ssc__unit`）

- [ ] **Step 1：定位基线字号**

确认 `styles.css` 当前 `.ssc__num = 32px`、`.ssc__unit = 16px`、`.ssc__desc = 12px`。

- [ ] **Step 2：仅在 `@supports` 块内提升**

```css
@supports (writing-mode: vertical-rl) {
  .ssc__num { font-size: clamp(34px, 5vh, 44px); }
  .ssc__unit { font-size: clamp(16px, 1.6vh, 18px); }
  .ssc__desc {
    font-size: clamp(14px, 2.2vh, 16px);
    line-height: 1.4;
    letter-spacing: 0.14em;
  }
}
```

- [ ] **Step 3：运行断言并截图**

```bash
python tests/test_vertical_rewrite.py
python tests/_capture_vertical_rewrite/baseline/capture.py   # 截图覆盖到 baseline 目录；如需新目录见 Step 4
```

- [ ] **Step 4：保存 after 截图**

在 `tests/_capture_vertical_rewrite/after/` 复制 `capture.py` 并指向新目录，运行一次以保存组 1 / 组 2 / 序幕截图，与 baseline 并排。

---

## Task 5：改造序幕为双列竖排 + 让出顶导

**目的**：让序幕从“姓名单列+诗句单列+横线分隔”升级为“姓名 + 诗句双列并排、字号提升、让出 72px 顶导”。

**Files:**
- Modify: `styles.css:2021-2087`（`.intro-overlay`、`.intro-overlay__name`、`.intro-overlay__divider`、`.intro-overlay__line`、`.ssc__card--prologue` 区块）

- [ ] **Step 1：重写序幕基础规则**

替换或新增：

```css
.intro-overlay {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  padding: var(--nav-height) 1vw 0 1vw;
  gap: 0.8em;
  pointer-events: none;
  opacity: 0;
}

.intro-overlay__rule-vertical {
  width: 1px;
  height: 1.2em;
  background: rgba(245, 241, 232, 0.40);
  align-self: flex-start;
  margin: 0 0.8em 0 0;
  display: block;
}

@supports (writing-mode: vertical-rl) {
  .intro-overlay__name,
  .intro-overlay__line {
    writing-mode: vertical-rl;
    text-orientation: upright;
    white-space: nowrap;
  }
  .intro-overlay__name {
    font-size: clamp(20px, 4.4vh, 26px);
    letter-spacing: 0.3em;
  }
  .intro-overlay__line {
    font-size: clamp(14px, 2.6vh, 17px);
    letter-spacing: 0.3em;
  }
}
```

- [ ] **Step 2：更新 index.html 移除旧横线分隔，加入竖向规则**

`index.html:66-73` 序幕卡片当前结构：

```html
<article class="ssc__card ssc__card--prologue" ...>
  <span class="ssc__rule" ...></span>
  <h2 class="intro-overlay__name" ...></h2>
  <span class="intro-overlay__divider" ...></span>
  <p class="intro-overlay__line" ...></p>
</article>
```

将中间的 `<span class="intro-overlay__divider">` 替换为：

```html
<span class="intro-overlay__rule-vertical" aria-hidden="true"></span>
```

- [ ] **Step 3：覆盖移动端字号避免被 prologue 特异性压制**

在 `styles.css:2084-2087` 附近追加：

```css
@media (max-width: 768px) {
  .ssc__card--prologue .intro-overlay__name { font-size: clamp(20px, 4.4vh, 26px); }
  .ssc__card--prologue .intro-overlay__line { font-size: clamp(14px, 2.6vh, 17px); }
}
```

- [ ] **Step 4：运行断言 + 截图**

```bash
python tests/test_vertical_rewrite.py
python tests/_capture_vertical_rewrite/after/capture.py
```

- [ ] **Step 5：人工目视确认**

- 序幕：双列竖排，姓名在右、诗句在左，竖线分隔清晰，首字不被顶导遮挡。
- 数据：右侧 3 列题签清晰可读，文字未越出视口。
- 移动 390×844：题签保持 3 列，序幕姓名 ≥20px、诗句 ≥14px。

---

## Task 6：响应式精细化

**目的**：在平板竖屏与手机横屏下保证题签不压画作、不溢出。

**Files:**
- Modify: `styles.css:2253-2265`（现有 768px 媒体查询）

- [ ] **Step 1：新增 900×1280 平板竖屏媒体查询**

```css
@media (min-width: 769px) and (max-width: 1199px) {
  .ssc__group { max-width: 22vw; }
  .ssc__num   { font-size: clamp(30px, 4.6vh, 38px); }
  .ssc__unit  { font-size: clamp(15px, 1.4vh, 17px); }
  .ssc__desc  { font-size: clamp(13px, 2vh, 15px); }
}
```

- [ ] **Step 2：手机横屏高度压缩**

```css
@media (max-height: 480px) {
  .ssc__group { max-width: 24vw; }
  .ssc__card  { padding: 4px 8px; min-height: 200px; }
  .ssc__rule  { width: 8px; height: 8px; }
}
```

- [ ] **Step 3：运行全部断言**

```bash
python tests/test_vertical_rewrite.py
```

预期：5 个视口全部通过。

- [ ] **Step 4：手动跑冒烟测试**

```bash
python tests/smoke-test.py
```

预期：`全部通过`。无新 console error / failed / 404。

- [ ] **Step 5：手动跑序幕同步测试**

```bash
python tests/test_intro_overlay_sync.py
```

预期：通过。

---

## Task 7：可访问性 + 性能微调

**目的**：确保 `prefers-reduced-motion` 下文字方向不变、首屏 reflow 可控、iOS Safari 兼容。

**Files:**
- Modify: `styles.css:2247-2251`（reduced-motion）、`styles.css:2253-2265`（移动）

- [ ] **Step 1：reduced-motion 不影响 writing-mode**

确认 `styles.css:2247-2251` 仅重置 transform，不影响 `writing-mode`。如有必要，加：

```css
@media (prefers-reduced-motion: reduce) {
  .ssc__card { writing-mode: vertical-rl; text-orientation: upright; }
}
```

- [ ] **Step 2：移除 .ssc__card 上的 will-change**

`styles.css:2158` 当前有 `will-change: opacity, transform;` —— writing-mode reflow 成本高，去掉以减低 Safari 合成层压力：

```css
.ssc__card {
  /* ... */
  /* will-change removed */
}
```

- [ ] **Step 3：Lighthouse 跑一次桌面与移动**

```bash
# 桌面 1440x900
npx lighthouse http://127.0.0.1:8080/index.html --preset=desktop --quiet --only-categories=performance --form-factor=desktop
# 移动 390x844
npx lighthouse http://127.0.0.1:8080/index.html --quiet --only-categories=performance --form-factor=mobile
```

预期：桌面 Performance ≥ 90，移动 ≥ 80；如未达到，记录问题并降一档字号到 `clamp(32px, 4.6vh, 40px)` 再测。

- [ ] **Step 4：保存为新文件**

保存 Lighthouse JSON 到 `tests/_capture_vertical_rewrite/lighthouse/`，作为性能基线。

---

## Task 8：收尾验收

**目的**：回归 + 截图对照 + 文档更新。

**Files:**
- Create: `tests/_capture_vertical_rewrite/compare.md`
- Modify: `README.md`（如需补一句“ScrollStory 文字采用古籍式竖排”）

- [ ] **Step 1：完整回归**

```bash
python tests/test_vertical_rewrite.py
python tests/smoke-test.py
python tests/test_intro_overlay_sync.py
python tests/_capture_vertical_rewrite/after/capture.py
```

预期：全部通过，3 张 after 截图已保存。

- [ ] **Step 2：写 compare.md**

```markdown
# Before / After 对照

| 视口 | 阶段 | Before | After |
|---|---|---|---|
| 1440×900 | 序幕 | baseline/prologue.png | after/prologue.png |
| 1440×900 | 组 1 | baseline/group1.png | after/group1.png |
| 1440×900 | 组 2 | baseline/group2.png | after/group2.png |
| 390×844 | 组 1 | baseline/mobile_390x844.png | after/mobile_390x844.png |
...
```

逐张标注观察到的差异（字号、方向、是否压画作、是否溢出）。

- [ ] **Step 3：可选 README 更新**

仅在 §“核心特性”末尾追加一行：

> ScrollStory 文字采用古籍式竖排：writing-mode vertical-rl + text-orientation upright；移动端按 vh 自适应。

- [ ] **Step 4：最终总结报告**

向用户报告：
- 修改文件清单
- 测试结果（自动化 + 视觉）
- Lighthouse 分数
- 已知遗留（例如 iOS 16 以下未验证）
- 任何需要后续 follow-up 的事项

---

## 附录 A：完整 CSS 片段（参考，最终以实际写盘为准）

```css
/* 序幕 */
.intro-overlay {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  padding: var(--nav-height) 1vw 0 1vw;
  gap: 0.8em;
  pointer-events: none;
  opacity: 0;
}

.intro-overlay__rule-vertical {
  width: 1px;
  height: 1.2em;
  background: rgba(245, 241, 232, 0.40);
  align-self: flex-start;
  margin: 0 0.8em 0 0;
  display: block;
}

@supports (writing-mode: vertical-rl) {
  .intro-overlay__name,
  .intro-overlay__line {
    writing-mode: vertical-rl;
    text-orientation: upright;
    white-space: nowrap;
  }
  .intro-overlay__name { font-size: clamp(20px, 4.4vh, 26px); letter-spacing: 0.3em; }
  .intro-overlay__line { font-size: clamp(14px, 2.6vh, 17px); letter-spacing: 0.3em; }
}

@media (max-width: 768px) {
  .ssc__card--prologue .intro-overlay__name { font-size: clamp(20px, 4.4vh, 26px); }
  .ssc__card--prologue .intro-overlay__line { font-size: clamp(14px, 2.6vh, 17px); }
}

/* 数据题签 */
.ssc__group {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  width: auto;
  max-width: 10vw;
  position: absolute;
  top: 50%;
  right: 1vw;
  left: auto;
  transform: translateY(-50%);
}

.ssc__group[data-ssc-group="1"],
.ssc__group[data-ssc-group="2"] {
  top: auto;
  bottom: var(--space-3xl);
  transform: translateY(0);
}

@supports (writing-mode: vertical-rl) {
  .ssc__group {
    grid-template-columns: auto auto auto;
    direction: ltr;
    writing-mode: vertical-rl;
    text-orientation: upright;
    align-items: flex-start;
    justify-items: start;
    max-width: 18vw;
  }
  .ssc__card {
    writing-mode: vertical-rl;
    text-orientation: upright;
    align-items: flex-start;
    justify-content: flex-start;
    text-align: start;
    padding: 8px 12px;
    aspect-ratio: auto;
    min-height: 280px;
    transform-origin: 50% 50%;
  }
  .ssc__line {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .ssc__rule {
    align-self: flex-start;
    margin-bottom: 0.4em;
  }
  .ssc__num {
    font-size: clamp(34px, 5vh, 44px);
    letter-spacing: 0.02em;
  }
  .ssc__unit {
    font-size: clamp(16px, 1.6vh, 18px);
  }
  .ssc__desc {
    font-size: clamp(14px, 2.2vh, 16px);
    line-height: 1.4;
    letter-spacing: 0.14em;
  }
}

@media (min-width: 769px) and (max-width: 1199px) {
  @supports (writing-mode: vertical-rl) {
    .ssc__group { max-width: 22vw; }
    .ssc__num   { font-size: clamp(30px, 4.6vh, 38px); }
    .ssc__unit  { font-size: clamp(15px, 1.4vh, 17px); }
    .ssc__desc  { font-size: clamp(13px, 2vh, 15px); }
  }
}

@media (max-height: 480px) {
  @supports (writing-mode: vertical-rl) {
    .ssc__group { max-width: 24vw; }
    .ssc__card  { padding: 4px 8px; min-height: 200px; }
    .ssc__rule  { width: 8px; height: 8px; }
  }
}

@media (prefers-reduced-motion: reduce) {
  @supports (writing-mode: vertical-rl) {
    .ssc__card { writing-mode: vertical-rl; text-orientation: upright; transform: none !important; }
  }
}
```

## 附录 B：HTML 修改片段

`index.html:66-73`：

```html
<article class="ssc__card ssc__card--prologue" role="listitem" data-ssc-card="0" aria-hidden="true">
  <span class="ssc__rule" aria-hidden="true"></span>
  <h2 class="intro-overlay__name" data-intro="name" aria-hidden="true"></h2>
  <span class="intro-overlay__rule-vertical" aria-hidden="true"></span>
  <p class="intro-overlay__line" data-intro="line" aria-hidden="true"></p>
</article>
```
