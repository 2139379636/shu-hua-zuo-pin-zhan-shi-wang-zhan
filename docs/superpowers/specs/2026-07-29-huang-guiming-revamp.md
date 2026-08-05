# 黄桂明 · 桂林山水 — 网站品牌与体验重塑 Spec

> **Date:** 2026-07-29
> **Status:** Awaiting Spec-Reviewer Approval
> **Author:** Brainstorming session between user & Claude
> **Project:** `C:\Users\17316\Desktop\网页8\` (直接打开 HTML 即可运行)

---

## 0. 一句话总结

把当前"5 个页面、两套品牌缝合"的状态，收束到 **「黄桂明 · 桂林山水」一套完整主线**上：Hybrid 多页路由 + 首页长卷叙事 + Lenis + GSAP ScrollTrigger 完整重写 ScrollStory 的锁定逻辑、新增双行反向 Marquee 作品墙、19 张作品真实数据接入、5 页导航与页脚完全统一。

---

## 1. 背景与现状

### 1.1 项目当前状态
- 5 个 HTML 页面（index / gallery / artwork / artist / cart）+ styles.css + ink-effects.js
- 19 张作品图（`素材/1.jpg` ~ `素材/19.jpg`）+ 画家本人照片（`素材/20.jpg`）+ 原始文本素材（`素材/文本.txt`，微信公众号原文，**题画诗与艺术家自述的原始资料池**，已被 research/ 清洗提取）
- 设计哲学文档（design-system/）+ research 提取的 6 份 markdown（清洗后的素材库）

### 1.2 核心问题（审查发现）
1. **品牌缝合**：index.html 主打"黄桂明·桂林山水"，但 gallery / artwork / artist / cart 全部是"富春江画院·富春江"主题
2. **占位图泛滥**：所有作品卡都用 `有画.png` 或 `留白.png`，19 张真实作品完全未被使用
3. **滚动卡顿**：ScrollStory 用 `wheel preventDefault + body fixed` 旧式方案，与 GSAP ScrollTrigger.pin + scrub 行业标准相距一个时代
4. **首页缺乏"作品墙"**：艺术家网站最大的资产是作品，但首页精选作品展示是普通 3 列 grid，缺少视觉锚点
5. **footer 邮箱电话不统一**：存在 `huang@fuchun-gallery.art`、`+86 571` 等富春江画院痕迹

---

## 2. 已敲定的关键决策（6 项）

| # | 决策 | 选择 |
|---|---|---|
| 1 | 主品牌 | 黄桂明 · 桂林山水 |
| 2 | 首页模式 | Hybrid（多页路由 + 首页长卷叙事）|
| 3 | 滚动技术栈 | Lenis + GSAP ScrollTrigger（重写 ScrollStory） |
| 4 | 改造范围 | 完整改造（路径 A），引入 lib/ 共享模块 |
| 5 | Hero 题诗 | 诗①《清江一曲绕山流》7 字 giant banner |
| 6 | Marquee 位置 | ScrollStory 后直接接（之后接 Story / CTA / Footer） |

---

## 3. 架构

### 3.1 最终目录结构

```
C:\Users\17316\Desktop\网页8\
├── index.html              ← 首页（长卷叙事）
├── gallery.html            ← 全部作品（独立路由）
├── artwork.html            ← 作品详情（?id=N）
├── artist.html             ← 艺术家页
├── cart.html               ← 购物车（功能性）
│
├── styles.css              ← 全局样式 + Design Tokens
├── ink-effects.js          ← 主动画（鼠标遮罩、Marquee、ScrollTrigger）
│
├── lib/                    ← 新建：共享逻辑
│   ├── nav.js              ← 公共 nav 注入 + scroll-state
│   ├── footer.js           ← 公共 footer 注入
│   ├── smooth-scroll.js    ← Lenis + GSAP ScrollTrigger 初始化
│   └── artworks-data.js    ← 19 张作品元数据 + 3 首题画诗 + BRAND 品牌常量
│
├── 素材/
│   ├── 1.jpg ~ 19.jpg
│   ├── 20.jpg
│   └── 文本.txt
│
├── design-system/          ← 已存在，不动
├── research/               ← 已存在，不动
│
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-07-29-huang-guiming-revamp.md  ← 本文件
```

### 3.2 路由与时长

| 页面 | URL | 性质 | 入场方式 |
|---|---|---|---|
| 首页 | `/index.html` | 长卷叙事（5 段）| 滚动驱动 |
| 作品列表 | `/gallery.html` | 静态网格 + 筛选 | 单页淡入 |
| 作品详情 | `/artwork.html?id=N` | 动态渲染 | 单页淡入 |
| 艺术家 | `/artist.html` | 编辑型内容 | 单页淡入 |
| 购物车 | `/cart.html` | 功能 | 单页淡入 |

**页间过场**：每次跳转 500ms 戏剧幕布（墨色 curtain，分两段动画：**顶部落下 200ms + 中段 hold 100ms + 底部升起 200ms = 总 500ms**），5 页统一。

### 3.3 第三方依赖（CDN 懒加载）

```html
<!-- body 末尾 + defer；**顺序固定：GSAP 必须先于 ScrollTrigger 加载**，ScrollTrigger 是 GSAP 插件 -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
```

加载失败由 `lib/smooth-scroll.js` 检测 `typeof gsap === 'undefined'` 并优雅降级到浏览器原生滚动。**ScrollTrigger 单独加载失败**（GSAP 在但 ScrollTrigger undefined）属于第三态，详见 §6 异常 #9。

### 3.4 依赖关系图

```
HTML 页面
  ├── styles.css
  ├── lib/nav.js
  ├── lib/footer.js
  ├── lib/smooth-scroll.js
  ├── lib/artworks-data.js
  └── ink-effects.js
       ├── Hero 鼠标遮罩
       ├── ScrollStory (ScrollTrigger pin + scrub)
       ├── Marquee (双行反向 gsap.to + repeat)
       └── 页间幕布
```

单向依赖：HTML → lib → ink-effects。任何环节异常都有 graceful fallback。

---

## 4. 组件

### 4.1 首页独有（只 index.html）

#### A1 · Hero（鼠标遮罩 + 题诗 banner）
- **底层图**：`留白.png`（客厅空墙）
- **顶层图**：`有画.png`（挂画客厅）
- 鼠标遮罩 radial gradient（保留现有 CSS 变量方案，已平稳）
- title：诗①《清江一曲绕山流》7 字拆两行居中，font-size `clamp(5rem, 14vw, 12rem)`
- subtitle："—— 诗情画意 · 桂林山水"
- 1200ms 后 `hint-pill` 淡入"移动鼠标以揭示"，4.5s 后自动淡出
- 移动端：不显示自定义光标；点击屏幕触发一次 reveal（半径 0→520px, 600ms 后复位）

#### A2 · ScrollStory（锁定叙事 - 重写）
- **重写**：用 `ScrollTrigger.create({ trigger, start, end, pin: true, scrub: 0.5 })`
- 进度 0→1 映射帧 0→248（drawFrame）；**帧序列来源于 `素材/视频切割/frame_00001.jpg` ~ `frame_00249.jpg` 共 248 张**（与 README 中的"598 张"旧表述已废止，以本项目实际切帧为准）
- 不再用 `body fixed`、不再 wheel preventDefault
- 滚出 end 阈值 → 自然入下一 section（Story）
- `prefers-reduced-motion`：跳过帧动画，显示中间帧

#### A3 · Marquee（双行反向滚动）⭐ 新建
```
┌────────────────────────────────────────────┐
│  Row 1 ←←← (leftward)   duration: 60s      │
│  Row 2 →→→ (rightward)   duration: 80s      │
│  hover row → pause 该行                    │
└────────────────────────────────────────────┘
```
- GSAP `gsap.to(track, { xPercent: -50, duration, ease: "none", repeat: -1 })`
- DOM：每行 `track` 内**复制 1 份** ARTWORKS[0..18]（按 id 升序）渲染后再复制 1 份 = 19×2=38 tile/行；**Row 1 与 Row 2 取同一份 19 张作品列表（每行一份复制）**；无缝循环靠 translate -50% 实现
- hover-pause：`mouseenter` → `gsap.pause()`；`mouseleave` → `gsap.resume()`
- 卡片比例 4:5，每张 `min-width: 320px`，间距 24px
- 滚动速度比 1.33（行 1:60s, 行 2:80s），制造层次
- `prefers-reduced-motion`：禁用 gsap.to，保留 DOM + `overflow-x: auto` 手势滑动
- **非 reduced-motion 模式下的移动端触摸**：触摸 marquee → 临时 `gsap.pause()`；手指离开 2s 后 `gsap.resume()`（行为与桌面 hover 等价）

#### A4 · Story（艺术家自述）
- 沿用现有 `.story` 样式，文案替换为 research/artist-profile.md 真实内容
- IntersectionObserver 触发 `is-page-visible` 淡入（沿用现有实现）
- 替换 `留白.png` 为 `素材/20.jpg`（画家本人照片）

#### A5 · CTA
- 沿用现有 `.cta-section` 样式
- 文案改为"把桂林山水带回家，让墙面有了呼吸"

#### A6 · Verse Section（题画诗金句）⭐ 新建独立 section
- **位置**：A5 CTA 与 Footer **之间**——首页第 6 段（Hero / ScrollStory / Marquee / Story / CTA / Verse / Footer）
- **内容**：完整题画诗全文（如"江岸奇峰耸，行舟顺水流。风吟诗意绕，一路画中游。"）+ 署名"—— 黄桂明"
- **选诗**：从 POEMS 抽 `poemId=2` 或 `poemId=3`（与 hero banner poemId=1 区分）
- **样式**：沿用现有 `.verse` 块（`font-family: var(--font-serif)`、letter-spacing 0.2em、居中两行排版）
- **入场**：IntersectionObserver 触发 `is-page-visible` 淡入（同 A4 Story）

### 4.2 二级页面

#### B1 · Page Header（gallery / artwork / artist 通用）
- 沿用现有 `.page-header` block，**保留样式**
- 每页替换 eyebrow / title / sub 文案

#### B2 · Gallery Grid + Filter（gallery.html）
- **9 张精选 + 4 个分类筛选**（沿用现有 `.filters` + `.gallery-grid`）
- 分类：**漓江 / 奇峰 / 烟雨 / 四季**（从 artworks-data.js 派生）
- 卡片链接：`artwork.html?id=N`

#### B3 · Artwork Detail（artwork.html）
- 接收 `?id=N`，从 `lib/artworks-data.js` 读取对应作品
- 左 1.4fr 大图 + 右 1fr 信息卡（沿用 `.artwork__grid`）
- **字段显示规则**：
  - 永远显示：图、标题、题号、价格、CTA
  - 有数据显示：题画诗、风格、创作年份、地点、尺寸、编号
  - 空字段：该行隐藏，不显示"未知"
- CTA：「**收藏咨询**」按钮（跳转 `mailto:?subject=...` 预填作品名）

#### B4 · Artist Page（artist.html）
- 自述 → 时间线 → 代表作 → CTA（沿用现有 layout）
- 时间线补充今年 2026 行
- 文案按 research/artist-profile.md 重写

#### B5 · Cart（cart.html）
- 用户决定**先搁置**购物车改造——本轮**保持现有功能性**，仅统一品牌名 + 邮箱 + 标题文案
- **现有功能已具备**（继承自现有 artwork.html / cart.html）**：localStorage 持久化、nav badge 同步、加车/移除 toast、F12 验收继承**
- 复用 `BRAND.email` / `BRAND.phone` 注入 footer，统一品牌信息

### 4.3 全局组件（5 页共享）

#### C1 · Nav
- 由 `lib/nav.js` 注入到 `<nav id="nav">`
- 当前页面自动标 `nav__link--active`
- 滚过 hero 后加 `nav--scrolled` class
- **新行为**：cart 按钮在二级页面显示；首页无 cart 按钮（首页 hero 叙事优先）

#### C2 · Footer
- 由 `lib/footer.js` 注入
- **统一品牌信息**：
  - 邮箱：`huang.guiming@art.com`
  - 电话：`+86 771 8000 0000`
  - 所在地：**桂林**

#### C3 · Curtain（页间过场）
- 沿用现有 `.curtain` 实现，统一幕色为墨色 (`--color-ink`)，**时长 500ms（顶部落下 200ms + 中段 hold 100ms + 底部升起 200ms）**

#### C4 · Toast
- 沿用现有，文案改为"已添加意向"对应购物车搁置决策

#### C5 · Loader（仅首页）
- 因为 GSAP + Lenis 改为 CDN 懒加载，**loader 等待 `gsap ready`** 而非预加载 598 张图
- 加载完显示"墨韵·已就绪" 600ms 后淡出

---

## 5. 数据流

### 5.1 数据文件：`lib/artworks-data.js`

形态：IIFE 暴露 `window.ARTWORKS_DATA`（19 条）+ `window.POEMS`（3 首）。**不用 ESM**（规避 MIME 问题、所有浏览器直接可用）。

```js
(function(){
  const POEMS = [
    { id: 1, text: '清江一曲绕山流',                                author: '黄桂明', usage: 'hero-banner' },
    { id: 2, text: '江岸奇峰耸，行舟顺水流。风吟诗意绕，一路画中游。', author: '黄桂明', usage: 'detail-citation' },
    { id: 3, text: '奇峰迎晓日，清渡载行舟。客望千山翠，诗成韵自悠。', author: '黄桂明', usage: 'verse-section' },
  ];

  const ARTWORKS = [
    {
      id: 1,
      title: '清江一曲绕山流',       // TODO: 客户补充真实名称
      seal: '壹',
      image: '素材/1.jpg',
      thumb: '素材/1.jpg',
      category: ['漓江', '山水'],
      featured: true,                // 是否进首页 9 张精选
      size: '100 × 50 cm',
      format: '横幅 · 镜片',
      material: '宣纸 · 水墨',
      year: '',                       // TODO: 客户补充
      location: '',                   // TODO: 客户补充
      style: [],                      // TODO: ['淡彩','小写意']
      poemId: 1,                      // 关联题画诗
      citation: '清江一曲绕山流',
      description: '',                // TODO: 详情描述
      price: 6800,
      inStock: true,
    },
    // … 共 19 条 …
  ];

  const BRAND = {
    name: '黄桂明',
    shortName: '桂明',
    tagline: '诗情画意 · 桂林山水',
    email: 'huang.guiming@art.com',
    phone: '+86 771 8000 0000',
    location: '桂林',
    navMark: '黄',
  };

  window.POEMS = POEMS;
  window.ARTWORKS_DATA = ARTWORKS;
  window.BRAND = BRAND;
})();
```

### 5.2 字段来源矩阵

| 字段 | 来源 | 状态 |
|---|---|---|
| `id`, `seal`, `image`, `featured` | 硬编码（来自素材文件名） | ✅ 已知 |
| `title`, `size`, `format`, `material`, `price` | 现有 gallery.html 9 条迁移 | ✅ 沿用 |
| `category` | 现有 `data-type` 迁移 + 重命名 | ✅ 重构 |
| `poemId`, `citation` | 题画诗库关联 | ✅ 已知 |
| `year`, `location`, `style`, `description` | research 未提供 | ⏳ TODO 客户补充 |

> **核心约定**：data 文件顶部集中注释 `// TODO`，客户补充时只改 data，HTML 不动。

### 5.3 各页面消费方式

```
ARTWORKS_DATA ─┬─ index.html        → marquee (全部 19) + featured (9 张精选)
               ├─ index.html        → story 右侧抽 1 条 poemId 作题画诗展示
               ├─ gallery.html      → 全部 19 张 + category 筛选
               └─ artwork.html?id=N → 按 id 取 1 条渲染详情

POEMS ─┬─ index.html hero          → poemId=1 显示 7 字 banner
       ├─ artwork detail 右侧       → poemId 关联诗全文
       └─ index.html verse section → poemId=2 或 3
```

### 5.4 字段显示规则（artwork detail）

| 字段 | 有数据 | 无数据 |
|---|---|---|
| `image` | 必显示 | 兜底 placeholder |
| `title` + `seal` | 必显示 | — |
| `poemId` | 显示整首诗 | 行隐藏 |
| `description` | 段落 | 行隐藏 |
| `year` + `location` | "2020 · 桂林·漓江" | 行隐藏 |
| `size` + `format` + `material` + `style` | 表格行 | 缺一行隐藏一行 |
| `price` | 必显示，符号 ¥ | — |

### 5.5 数据迁移来源

| 原文件 | 迁移到 |
|---|---|
| `gallery.html` 9 张 `<a class="art-card">` | `ARTWORKS[0..8]`，前 9 条 featured=true |
| `gallery.html` `<button data-filter>` | `CATEGORIES` 常量 |
| `artwork.html` 文案 | `ARTWORKS[0]` description 占位模板 |
| `index.html` 题画诗金句区 | `POEMS[1] / POEMS[2]` |
| 全部页面 footer 邮箱/电话 | 集中常量 `BRAND = { email, phone, location, name }` |

### 5.6 数据规模与边界

- `lib/artworks-data.js` 总长 ≤ 12 KB（远小于一张图）
- 无网络请求、离线可用
- data-layer 与 present-layer 严格分离：JS 注入模板后只改 class，不修改 data shape

---

## 6. 错误处理与降级

| # | 异常 | 降级策略 |
|---|---|---|
| 1 | **GSAP 加载失败** | `smooth-scroll.js` 检测 `typeof gsap === 'undefined'` → 不初始化；ScrollStory 显示静态中间帧；marquee 改 `overflow-x: auto` 手势滚动 |
| 2 | Lenis 加载失败但 GSAP 成功 | ScrollTrigger pin 可用但失去平滑插值（瞬间 scrub）。功能完整 |
| 3 | Canvas 不可用 | 隐藏 ScrollStory section，显示 message |
| 4 | **图片加载失败** | `<img onerror>` 替换为内联 SVG 占位（淡宣纸色 + 印章 + "图未备"） |
| 5 | **prefers-reduced-motion** | CSS 全局 `animation: none`，JS 不初始化 GSAP，marquee 改手势滑动，鼠标遮罩默认全部显示 |
| 6 | localStorage 不可用 | `try/catch`，fallback 到 `window.__cartFallback` 内存对象 + toast 提示 |
| 7 | 路由缺失（artwork?id=999/foo） | `getArtworkById` 返回 null → 显示"此作品尚未备档"+ 返回 gallery |
| 8 | Google Fonts 失败 | 已 fallback 到 `'Songti SC', 'STSong', serif` 等系统字体 |
| 9 | **ScrollTrigger 加载失败但 GSAP 存在**（第三态） | ScrollStory 显示静态中间帧；marquee 仍运行（marquee 用 `gsap.to` 不依赖 ScrollTrigger 插件）；nav.js / footer.js 与 Lenis 平滑滚动不受影响 |

### 通用兜底原则

- 任何 CDN 加载放 body 末尾 + `defer`，不阻塞首屏
- ink-effects.js 外层 `try/catch` + `console.warn`，异常不 throw
- 不可恢复错误各 section 都有最小可读内容兜底

---

## 7. Acceptance Criteria（验收标准）

### F · 功能（12 条）

| ID | 标准 | 验证方式 |
|---|---|---|
| F1 | 5 页品牌统一为「黄桂明 · 桂林山水」，无"富春江画院"残留 | grep |
| F2 | 19 张作品在 marquee 全展示（38 tile，19×2 复制） | 数 |
| F3 | 首页精选 9 张 + 4 分类筛选 | 切换 → 数 |
| F4 | Hero 鼠标遮罩中心跟随，无抖动，60fps | DevTools |
| F5 | Hero 题诗"清江一曲绕山流"两行排版 | 视觉 |
| F6 | ScrollStory 自动 pin，滚轮走帧；滚到底自然入下一段 | 操作 |
| F7 | Marquee 行 1 左 / 行 2 右，hover 任一行该行暂停 | 操作 |
| F8 | 点击作品卡 → `artwork.html?id=N` 详情正确加载 | 操作 |
| F9 | artwork.html 字段缺失行自动隐藏，无"未知"占位 | 视觉 |
| F10 | 5 页 nav 当前页高亮 `nav__link--active` | 视觉 |
| F11 | 页间跳转 → 戏剧幕布 500ms 过渡（顶部落下 200ms + 中段 hold 100ms + 底部升起 200ms）| 视觉 |
| F12 | cart 加入/移除 + localStorage 同步 + nav badge 更新（**功能继承自现有 artwork.html/cart.html，本轮不重写**）| 操作 |

### E · 体验（6 条）

| ID | 标准 | 验证 |
|---|---|---|
| E1 | reduced-motion → 所有动画停，marquee 手势滑 | DevTools 模拟 |
| E2 | 1440/1920/375/768px 全部响应式正常 | 4 断点截图 |
| E3 | 移动端 Hero 触摸揭示 + marquee 触摸滑 | 真机 |
| E4 | 全部 CTA / 卡片 Tab 可聚焦，focus ring 可见 | 操作 |
| E5 | 文字对比度 ≥ 4.5:1 | Lighthouse a11y |
| E6 | 无水平滚动条 | 操作 |

### T · 技术（8 条）

| ID | 标准 | 验证 |
|---|---|---|
| T1 | Lighthouse Performance ≥ 90（桌面）/ ≥ 80（移动） | Lighthouse |
| T1.1 | 优化路径 | ① marquee 38 tile 全部 `loading="lazy"`；② 图片用 `srcset` 多尺寸；③ 首屏 critical CSS inline；④ curtain 不阻塞 a 标签 click（`pointer-events: none`）；⑤ GSAP 仅首页加载，二级页不引 |
| T2 | Marquee FPS ≥ 55 | DevTools Performance |
| T3 | 单文件 ≤ 50KB，HTML/CSS/JS 总和 ≤ 150KB（不算素材图、字体、CDN） | ls |
| T4 | 浏览器控制台 0 报错/警告 | F12 |
| T5 | 外链 `_blank` 必带 `rel="noopener"` | grep |
| T6 | 无 XSS：动态插入用 `textContent` / DOM API | code review |
| T7 | GSAP/Lenis 加载失败 fallback 完整 | Network throttle |
| T8 | 所有图片含 `alt`；缺失 fallback 占位 SVG | devtools |

### C · 内容（7 条）

| ID | 标准 |
|---|---|
| C1 | 5 页 footer 邮箱统一 `huang.guiming@art.com` |
| C2 | 5 页 footer 电话统一 `+86 771 8000 0000` |
| C3 | 5 页画家所在地统一「桂林」（去掉"浙江·富春江畔"） |
| C4 | 5 页 nav brand mark 统一为「黄」（去掉"富""墨"不统一） |
| C5 | README.md 重写以匹配当前实现 |
| C6 | research/ 资料核心内容已在 index / artist 页 front stage 体现 |
| C7 | 题画诗 3 首在 hero / detail / verse 三处至少各使用一次 |

> **完整 33 条验收**（F12 + E6 + T8 + C7），全部为 writing-plans 阶段的 Definition of Done。

---

## 8. 设计哲学与禁区

继承 DESIGN_ESSENCE.md 的所有约束：

- ❌ 不像电商促销页（满减、倒计时、闪烁 badge）
- ❌ 不像社交媒体瀑布流（信息密集）
- ❌ 不用花哨字体、过饱和颜色、emoji 图标
- ❌ 鼠标遮罩不用突兀硬边缘（保留柔和径向）
- ✅ 像"晨光书房"邀请进客厅 —— 96-128px section 间距
- ✅ 水墨晕染般的克制动效（cubic-bezier(0.16, 1, 0.3, 1)，200-500ms）
- ✅ 朱砂印章式的点睛之笔

---

## 9. 下一步

> ⚠️ **本项目暂不使用 git**（用户明确决定）。Spec 文件不做 git 提交，writing-plans 阶段也不会引入 git 操作。所有版本管理以文件覆盖实现。

1. **本 spec 由 spec-document-reviewer 子代理审核**（最多 3 轮循环）
2. **用户 review 书面 spec** 签字
3. **转入 writing-plans skill** 产出实施计划（按本 spec 拆任务）

---

## 10. 附录：grep 校验脚本（验收时用）

```bash
# F1 — 全局无"富春江画院"残留
grep -ri "富春江画院\|fuchun-gallery\|@fuchun" --include="*.html" --include="*.js" --include="*.css" \
  C:/Users/17316/Desktop/网页8/

# C5 — README 是否完整
test -f "C:/Users/17316/Desktop/网页8/README.md" && wc -l "C:/Users/17316/Desktop/网页8/README.md"

# T3 — 单文件大小
find "C:/Users/17316/Desktop/网页8/" -maxdepth 1 -type f \
  \( -name "*.html" -o -name "*.css" -o -name "*.js" \) -exec ls -la {} \;
```

---

*Spec drafted on 2026-07-29 by brainstorming session. Awaiting spec-document-reviewer.*
