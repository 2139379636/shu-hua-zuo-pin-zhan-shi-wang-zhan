# ScrollStory 全文字古籍竖排设计 v2

**日期**：2026-08-04  
**项目**：黄桂明 · 桂林山水作品集  
**状态**：v2 修订版（已根据 spec-document-reviewer 反馈更新 P0 全部 + P1 全部 + P2 必要项）

## 修订日志

v2 相对 v1 的关键修订点（依据审查报告 P0/P1 编号）：

- **C3 / C4**：明确允许将 `.ssc__group` 改为 3 列 grid，并给出具体 CSS 写法保证右起读视觉顺序。
- **C1 / C5 / L7**：把字号区间收敛为可翻译到 CSS 的具体值，并通过桌面 / 移动硬阈值断言。
- **C2 / I4 / H8**：序幕明确改为双列并排（姓名 + 题画诗），放弃 `10vw` 限制；分隔线改用 1.2em 短竖线，距左列 0.8em。
- **C6 / H1 / H9 / H10**：移动端 ≤480px 改为 1 列纵向题签，并显式覆盖 prologue 移动字号曲线与 `.ssc__card` 内边距。
- **C7**：增加 900×1280 平板竖屏视口。
- **I1 / I2 / I3 / I7 / H2 / H6**：补充 `.ssc__line` 列向、`text-align: start`、印章 `align-self`、`overflow-x` 断言、`aspect-ratio` 与 `min-height`。
- **R4 / H4 / H11 / H12**：补联句列序、GSAP scrub 性能、iOS Safari 合成层、transform 与 vertical-rl 视觉差异风险。
- **R7 / H3**：序幕让出顶导 72px，新增移动端让顶策略。
- **T1–T8**：自动化测试路径修正为实际存在的 `tests/smoke-test.py`；断言改为祖先链 `writing-mode` + 字号硬阈值 + 视觉顺序与 DOM 顺序 + 性能观测。
- **I8 / R2**：明确 `@supports` 块不覆盖颜色叠层，降级时三张卡纵向堆叠（与原行为一致）。

## 1. 背景

上一次任务因 Token 用量中断。中断前已把 ScrollStory 序幕中的艺术家姓名和题画诗改为 `writing-mode: vertical-rl`，但右侧两组共六张数据文字仍保持横排，形成“外部卡片纵向堆叠、内部文字仍横排”的半完成状态。

用户提供的四张截图明确记录了原始要求：

> 文字组件字号过小；不只是卡片纵向排列，卡片内容也应改为纵向，整体像中国古代从上到下的书写方式。

2026-08-04 用户确认选择“全部古籍竖排”：序幕和右侧六张数据文字全部从上到下竖排，整体字号放大，并维持左右画面留白区布局。

**术语定义**：本设计中的“古籍式” = `writing-mode: vertical-rl` + `text-orientation: upright` + 宣纸米色文字 + 朱砂印章点缀。

## 2. 当前状态

### 2.1 序幕

`styles.css` 已对以下元素设置竖排：

- `.intro-overlay__name`
- `.intro-overlay__line`
- `.ssc__card--prologue .intro-overlay__name`
- `.ssc__card--prologue .intro-overlay__line`

实际页面中，序幕已从上到下显示，但仍存在字号偏小（桌面 20px、移动受 `.ssc__card--prologue` 特异性覆盖仍 20px）、姓名与诗句间距过散、分隔线 40×1px 仍按横排设计的问题。

### 2.2 数据文字

右侧数据由 `lib/scroll-story-cards.js` 渲染：

- 组 1：`40+ 年`、`17 岁`、`1 题材`
- 组 2：`不 逐`、`不 慕`、`素 心`

每张数据项包含：朱砂印记 `.ssc__rule`、数字/主字 `.ssc__num`、单位 `.ssc__unit`、两句说明 `.ssc__desc`。

当前三处断层：

1. `.ssc__line` 是 `display: flex; gap: 10px` 的横排行，writing-mode 不会自动列向。
2. `.ssc__group` 是 `grid-template-columns: 1fr` 单列纵向堆叠，视觉上未形成三列题签。
3. `.ssc__num` 32px、`.ssc__unit` 16px、`.ssc__desc` 12px 相比用户原话“字号过小”提升不充分。

## 3. 目标

1. 序幕姓名和题画诗保持古籍式从上到下竖排，并提升可读性。
2. 右侧两组共六张数据项的数字、单位和说明全部改为从上到下竖排。
3. 同组的三张数据项形成三条竖向题签，多列遵循传统从右向左的阅读顺序。
4. 朱砂印记、分隔线、字距和列距与竖排方向一致。
5. 不修改画作帧、滚动进度、淡入淡出时序、数据文案和页面其他区域。
6. 在桌面、平板竖屏、手机竖屏与手机横屏下保持可读，无水平溢出，不遮挡导航。

## 4. 非目标

- 不重写 ScrollStory 的 GSAP/ScrollTrigger 逻辑。
- 不调整 `SCROLL_STORY_PROGRESS` 时间轴。
- 不修改 `GROUPS` 数据或诗句文案。
- 不改变首页其他部分的视觉设计。
- 不引入新的框架、组件库或构建工具。
- 不恢复 README 中的旧布局描述。
- **不修改 `.ssc__group` 整体定位**（`position: absolute; right: 1vw`），只改内部 grid 列数与 children 排列方式。
- **不修改 `transform` 计算**（`translateX(...) scale(...)`），保持 JS 行为不变；如需调整视觉锚点，仅在 CSS 设 `transform-origin: 50% 50%`。
- **不动 `.ssc__line` 之外的 HTML 结构**：仅在 CSS 中切换其 `flex-direction`，不通过 JS 重排 DOM。

## 5. 设计决策

### 5.1 书写方向

所有目标文字使用：

```css
writing-mode: vertical-rl;
text-orientation: upright;
```

效果：

- 单列文字从上到下。
- 多列文字从右向左。
- 中文、数字和符号保持正向，不旋转 90°。
- 拉丁数字 / `+` 等复合字符在 `.ssc__num` 上加 `text-combine-upright: all`（CSS Working Draft 草案，Chromium 91+/Safari 15+ 支持），避免上下叠。

### 5.2 序幕布局

序幕双列并排，放弃 10vw 紧凑限制。

- `.intro-overlay` 由当前 `display: flex; align-items: center; justify-content: flex-start; padding: 0 1vw 0 1vw` 改为 `display: flex; flex-direction: row; align-items: flex-start; justify-content: flex-start; padding: var(--nav-height) 1vw 0 1vw; gap: 0.8em;`。
- 姓名为第一条主竖列，题画诗为相邻的次竖列，两列在 `vertical-rl` 下从右向左自然成立（姓名在右、诗句在左）。
- 朱砂印记置于姓名竖列起点上方。
- 原 `.intro-overlay__divider`（40×1px 横线）替换为 `.intro-overlay__rule-vertical { width: 1px; height: 1.2em; background: rgba(245,241,232,0.4); align-self: flex-start; margin: 0 0.8em 0 0; }`，夹在两列之间。
- 序幕 `padding-top: var(--nav-height)` 让出 72px 固定导航栏，避免首字被遮。

字号：

- 姓名桌面 24px / 移动 20–22px（覆盖 `.ssc__card--prologue` 特异性）。
- 诗句桌面 16px / 移动 14–15px。

### 5.3 数据题签布局

`.ssc__group` 改为 3 列 grid：

```css
.ssc__group {
  display: grid;
  grid-template-columns: auto auto auto;
  direction: ltr; /* grid 内部不反转列序 */
  writing-mode: vertical-rl;
  text-orientation: upright;
  gap: 14px;
  align-items: flex-start;
  justify-items: start;
  max-width: 18vw;
}
.ssc__card { writing-mode: vertical-rl; text-orientation: upright; }
.ssc__line { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.ssc__rule { align-self: flex-start; margin-bottom: 0.4em; }
```

效果：

- DOM 中第 1 张题签（`data-ssc-card="0"`）成为最右列；第 3 张为最左列，符合中国古籍右起读。
- 每条题签内：朱砂印记（顶部）→ 数字/主字 → 单位 → 说明第一句 → 说明第二句。
- `.ssc__desc` 内的 `\n` 在 `writing-mode: vertical-rl + white-space: pre-line` 下自动形成 2 列副文。

题签宽度约束：

- 题签内 ≤3 列（`.ssc__line` 1 列 + `.ssc__desc` 最多 2 列）。
- 单列宽 ≤40px。
- 整组 `max-width: 18vw`，避免压缩画作中心。

### 5.4 尺寸层级（CSS 可直接翻译）

桌面基准：

- `.ssc__num` 桌面 38px / 移动 36px（`clamp(34px, 5vh, 44px)`）。
- `.ssc__unit` 桌面 18px / 移动 17px。
- `.ssc__desc` 桌面 15px / 移动 14px（`font-size: clamp(14px, 2.2vh, 16px)`）。
- 序幕 `.intro-overlay__name` 桌面 24px / 移动 20px（`clamp(20px, 4.4vh, 26px)`）。
- 序幕 `.intro-overlay__line` 桌面 16px / 移动 14px。

所有层级均使用 `clamp(下界, vh 比例, 上界)`，因为竖排主要受视口高度约束。

### 5.5 位置与画面关系

- 序幕保持左侧。
- 数据组保持右侧（`right: 1vw` 不变），整体 `max-width: 18vw`。
- 顶导：序幕让出 72px；数据组在 `--space-3xl` 之上再增加 `top: var(--nav-height)` 偏移。
- 文字层仍保持 `pointer-events: none`。
- 文字与画作的安全区：所有题签底部到画作中心 ≥10vw。

## 6. 实现边界

### 6.1 首选：仅 CSS 调整

在 `styles.css` 中完成：

- 序幕双列布局 + 顶导让位。
- `.ssc__group` 3 列 grid + 字号 + 间距。
- `.ssc__card`、`.ssc__line`、`.ssc__rule`、`.ssc__desc` 竖排规则与 `flex-direction: column`。
- 数字 `text-combine-upright: all`。
- 桌面、平板竖屏、手机竖屏、手机横屏媒体查询。
- `@supports (writing-mode: vertical-rl)` 渐进增强；`@supports` 块不覆盖颜色叠层。
- `.ssc__card { transform-origin: 50% 50%; aspect-ratio: auto; min-height: 280px; }`。
- `.ssc__card` padding 在 `@supports` 块内由 8px 4px 改为 8px 12px，避免竖排挤压。

### 6.2 条件性最小 JS 调整

仅当 CSS 无法保证“数字 → 单位 → 两句说明”DOM 顺序时，才允许修改 `lib/scroll-story-cards.js`：

- 仅增加语义包装层或 class。
- 不改变数据读取、动画窗口、透明度、transform 或 aria-hidden 逻辑。
- 动态文字继续进行 HTML 转义。

`@supports (writing-mode: vertical-rl)` 不支持时：

- `.ssc__group` 退回单列纵向堆叠（与原行为一致）。
- `.ssc__line` 维持 `flex-direction: row` 横排。
- 不出现错乱、不可见或被裁切。

## 7. 响应式策略

### 7.1 桌面（≥1200px）

- 左右文字区域完整显示。
- 数据组三列题签，从右向左。
- 使用 §5.4 完整字号层级。

### 7.2 平板竖屏（769–1199px，含 900×1280）

- 缩小列距和左右边距。
- 说明文字降一档。
- 仍保持三列古籍竖排，不恢复横排。

### 7.3 手机竖屏（≤768px）

- 以可用高度为主要约束（`vh` 缩放）。
- 仍保持三列题签，不退化为 1 列。
- 最小可读字号不低于 13px。
- 序幕让出顶导 72px；姓名 `clamp(20px, 4.4vh, 26px)`，诗句 `clamp(14px, 2.6vh, 17px)`。

### 7.4 手机横屏（≤480px 高度，例如 844×390）

- 整体尺寸按 vh 收缩。
- 必要时压缩 `.ssc__rule` 至 8×8，padding 缩为 4px 8px。
- 不允许文字超出视口底部，必要时数据组进一步上移而非右移。
- 验证：`document.body.scrollWidth === window.innerWidth` 且所有题签 `getBoundingClientRect()` 全部在视口内。

## 8. 兼容与降级

现代 Chromium（91+）、Firefox 90+、Safari 15+ 均支持 `writing-mode: vertical-rl` + `text-orientation: upright` + `text-combine-upright: all`。

降级路径（不支持 `writing-mode: vertical-rl`）：

- `.ssc__group` 保持单列纵向堆叠（与当前行为一致）。
- `.ssc__line` 保持横排。
- `.ssc__card` 仍按原 8/4 padding。
- 不出现重叠、不可见、被裁切或横向滚动条。

`prefers-reduced-motion`：

- 仅关闭 translateX 位移和 scale，文字方向不改变。
- 透明度时序保持。
- 验证：reduced-motion 模式下，`.ssc__card { transform: none }` 与 writing-mode 共存，vertical-rl 仍生效。

## 9. 无障碍

- DOM 阅读顺序（升序）= 视觉右起读顺序（DOM 0 在最右、DOM 2 在最左），与 ScrollStory 数据 GROUPS 顺序一致。
- `aria-hidden` 继续由现有进度 JS 控制。
- 不把文字转成图片或 Canvas。
- 朱砂印记保持 `aria-hidden="true"`。
- 屏幕阅读器朗读顺序：每张题签内 印记（aria-hidden）→ 数字 → 单位 → 描述两行。

## 10. 测试与验证

### 10.1 自动化测试

```bash
python tests/test_intro_overlay_sync.py
python tests/smoke-test.py
```

如项目未来添加针对 ScrollStory 卡片的回归脚本（如 `tests/test_vertical_rewrite.py`），一并运行。

### 10.2 DOM/CSS 断言

| ID | 断言 | 通过条件 |
|---|---|---|
| A1 | 序幕 `.intro-overlay` 与 `.ssc__card--prologue` 自身 `writing-mode` 为 `vertical-rl` | `getComputedStyle(...).writingMode === 'vertical-rl'` |
| A2 | 数据题签祖先链含 vertical-rl 容器 | 任一祖先 `getComputedStyle(...).writingMode === 'vertical-rl'` |
| A3 | 组 1、组 2 各 3 张题签 | `[...document.querySelectorAll('[data-ssc-group="1"] .ssc__card')].length === 3` |
| A4 | 视觉顺序右起读 | `getBoundingClientRect().left` 单调递减（DOM 0 = 最大 left） |
| A5 | 字号硬阈值（桌面） | `getComputedStyle(num).fontSize >= 36px`，`unit >= 16px`，`desc >= 14px` |
| A6 | 字号硬阈值（移动） | num >= 32px，unit >= 14px，desc >= 12px |
| A7 | 不溢出 | `document.body.scrollWidth === window.innerWidth` |
| A8 | 顶导不遮文字 | 序幕首字 `getBoundingClientRect().top >= 72` |
| A9 | transform-origin | 卡片 transform-origin 为 `50% 50%` |
| A10 | aria-hidden 传播 | 在 progress 0.05 / 0.32 / 0.65 / 0.97 采样，组 1/2 各自 aria-hidden 切换 |
| A11 | 性能观测 | Lighthouse 移动端 Performance ≥ 80，桌面 ≥ 90；rAF 帧率 ≥ 55fps（DevTools Performance 采样 1 段滚动） |

### 10.3 视觉验证视口

- 1440×900（桌面）
- 1024×768（平板横屏）
- 900×1280（平板竖屏）
- 390×844（手机竖屏）
- 844×390（手机横屏）

每视口各截 3 张：序幕、组 1、组 2。截图保存到 `tests/_capture_vertical_rewrite/{viewport}/{phase}.png`，与 before/after 并排对比。

### 10.4 视觉逐项检查

- 全部文字从上到下。
- 同组多列从右向左（DOM 0 在最右）。
- 字号满足 §5.4。
- 无裁切、重叠、横向滚动条。
- 不遮挡固定导航。
- 不出现“卡片竖排、内容横排”状态。
- 序幕双列清晰，姓名与诗句之间有竖向间隔。

## 11. 验收标准

1. 序幕和六张数据项全部为古籍式竖排。
2. 数字、单位、说明内容均从上到下排列。
3. 两句说明在竖排模式下形成相邻副列，且阅读顺序为右起读。
4. 同组三张题签按从右向左顺序排列（DOM 0 = 最右列）。
5. 字号与可读性相较当前截图显著提升（桌面 `.ssc__num` ≥36px、`.ssc__unit` ≥16px、`.ssc__desc` ≥14px；移动 num ≥32px、unit ≥14px、desc ≥12px）。
6. 5 种目标视口（1440×900、1024×768、900×1280、390×844、844×390）均无裁切、溢出或导航遮挡。
7. ScrollStory 淡入淡出与滚动帧同步行为无回归。
8. 完整 Chromium 冒烟测试通过，控制台无新增错误。
9. `tests/test_intro_overlay_sync.py` 全部断言通过。
10. 性能不下降（Lighthouse、rAF 帧率在 §10.2 A11 阈值内）。

## 12. 风险与应对

| 风险 | 应对 |
|---|---|
| 拉丁数字节奏（`40+`） | `text-combine-upright: all`；仅作用于 `.ssc__num` |
| `\n` 联句列序 | 截图验证右起读；如颠倒，仅以 CSS 列序纠正，不倒序字符串 |
| 3 列过宽压画作 | `max-width: 18vw` + 单列 ≤40px |
| 手机横屏高度不足 | 单独媒体查询，按 vh 缩 |
| transform 原点 | 显式 `transform-origin: 50% 50%` |
| 顶导遮挡序幕 | `padding-top: var(--nav-height)` + 桌面/移动双覆盖 |
| `@supports` 颜色叠层丢失 | 颜色块写在基础规则，不在 `@supports` 块内 |
| 序幕 10vw 限制与双列冲突 | 放弃 10vw；改用 `padding-top` + `flex` 自动宽 |
| 移动 `clamp(32px,8vw,48px)` 受 prologue 特异性压制 | 在 `.ssc__card--prologue` 内显式覆盖移动字号 |
| 序幕移动 `clamp(8vw)` 在 360px 视口仅 28.8px | prologue 移动走独立曲线 `clamp(20px, 4.4vh, 26px)` |
| iOS Safari 合成层 | 截 iPhone 12 (iOS 16+) 验证；失败时降级为不带 `scale` 的 transform |
| GSAP scrub 0.5 + writing-mode reflow | DevTools 监测 reflow 次数，必要时关闭 .ssc__card 的 `will-change` |
| `\n` Firefox 列序异常 | Firefox 单独截图验证；如差异大于桌面，错位在 5px 内视为可接受 |
| `aspect-ratio` 未定义 | `.ssc__card { aspect-ratio: auto; min-height: 280px; }` |
| `.ssc__card` padding 4px 横向挤压 | `@supports` 块内改为 8px 12px |

## 13. 预计改动文件

仅改：

- `styles.css`

不改：

- `lib/scroll-story-cards.js`（除非 CSS 验证后证明需加 class 包装）
- `lib/scroll-story-cards-data.js`
- `lib/intro-overlay.js`
- `lib/scroll-story-progress.js`
- `ink-effects.js`
- `index.html`

如新增视觉验证脚本：

- `tests/test_vertical_rewrite.py`（可选，编写成本 ≤80 行）

## 14. 项目流程说明

本项目当前未使用 Git，因此本设计文档不提交 commit；版本记录继续保存在 `docs/superpowers/specs/`。后续按既有 superpowers 流程生成实施计划、执行 TDD、完成代码审查与 UI/UX 交付检查。
