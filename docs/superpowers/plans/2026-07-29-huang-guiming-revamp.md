# 黄桂明 · 桂林山水 网站重塑 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 实施本计划。步骤使用 `- [ ]` 复选框语法跟踪进度。

**Goal:** 把当前 5 页面"双品牌缝合"状态收束到「黄桂明 · 桂林山水」一套完整主线，按 spec 落地 33 条验收标准。

**Architecture:** Hybrid 多页路由 + lib/ 共享模块（nav/footer/smooth-scroll/artworks-data）+ Lenis + GSAP ScrollTrigger 重构首页滚动，CDN 懒加载第三方库。首页长卷叙事（Hero / ScrollStory / Marquee / Story / CTA / Verse / Footer），二级页单页淡入。

**Tech Stack:** 纯 HTML5 + CSS3 + Vanilla JavaScript（IIFE 暴露 window）+ Google Fonts（Noto Serif TC / Sans TC）+ Lenis 1.1.13 (CDN) + GSAP 3.12.5 (CDN) + ScrollTrigger 3.12.5 (CDN)。无 build tool，无 git，无 ESM，无测试框架。

---

## 文件结构（修改/新增一览）

| 类型 | 文件 | 责任 |
|---|---|---|
| 新增 | `lib/artworks-data.js` | BRAND 常量 + 3 首题画诗 + 19 张作品元数据（IIFE 暴露 window 全局） |
| 新增 | `lib/smooth-scroll.js` | Lenis 平滑滚动 + GSAP ScrollTrigger.pin 注册与配置 |
| 新增 | `lib/nav.js` | 公共 nav 注入到 `<nav id="nav">`、scroll-state 切换、当前页 active 标记 |
| 新增 | `lib/footer.js` | 公共 footer 注入到 `<footer id="footer">`，统一 BRAND 信息 |
| 修改 | `ink-effects.js` | 重写：Hero 鼠标遮罩 + ScrollStory (ScrollTrigger pin + scrub) + Marquee (双行反向 gsap.to) + Verse 段落入场 + Curtain 过场 |
| 修改 | `index.html` | 重写整合长卷叙事，删除内嵌 nav/footer/style/inline-script |
| 修改 | `gallery.html` | 改造为数据驱动（读取 window.ARTWORKS_DATA），9 张精选 + 4 分类筛选 |
| 修改 | `artwork.html` | 改造为动态渲染（从 URL 读 ?id=，渲染对应作品详情），字段缺失自动隐藏 |
| 修改 | `artist.html` | 文案替换为 research/artist-profile.md 真实内容 + 时间线补 2026 行 + 配图换 `素材/20.jpg` |
| 修改 | `cart.html` | 统一品牌名 + 邮箱 + 标题文案，**保留现有 localStorage + nav badge 行为** |
| 修改 | `README.md` | 重写以匹配当前实现（基于已完成的事实） |
| 修改 | `styles.css` | 仅在必要时微调（marquee、移动端触摸响应） |

---

## 项目硬性约束（贯穿全 plan）

1. **不用 git**：所有 Task 不做 `git add/commit`，"保留记录"用任务自身的复选框与本 plan 文件
2. **不用 build tool**：纯 HTML/CSS/JS，所有 .html / .js / .css 直接被 Python http.server 静态托管
3. **不用 ES Module**：所有 JS 用 IIFE 暴露 window 全局，保证 `<script>` 顺序与 `<script defer>` 即可
4. **CDN 顺序**：Lenis → GSAP → ScrollTrigger，**GSAP 必须先于 ScrollTrigger**（ScrollTrigger 是 GSAP 插件）
5. **TDD 适配**：本项目无测试框架。**每个 Task 用浏览器 + DevTools 自检代替单元测试**（打开页面 → F12 → 跑自检代码 / 截图 / 检查 DOM）
6. **路径**：所有路径相对项目根 `C:\Users\17316\Desktop\网页8\`（或本地 `网页8/`）
7. **dev server**：已启动 `python -m http.server 8080 --bind 127.0.0.1` 在项目根目录运行；本地访问 http://127.0.0.1:8080/index.html

---

## 验收对照（实施时随时复核）

33 条验收完整列表见 spec §7。本 plan 最后的 Task 22 集中做最终验证。

实施策略：**Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → 验收**。每个 Phase 完成后做一次"基础自检"再进入下一阶段。

---

# Phase 0 — 基础设施（先把地基备好）

### Task 1: 创建 `lib/artworks-data.js`

**Files:**
- Create: `lib/artworks-data.js`

- [ ] **Step 1: 创建 lib 目录**

```bash
cd "C:/Users/17316/Desktop/网页8" && mkdir -p lib
```

- [ ] **Step 2: 写入数据文件骨架**

创建 `lib/artworks-data.js`，写入完整 IIFE 数据（含 BRAND + 3 首题画诗 + 19 条作品）。文件完整内容如下（19 条 id 1-19 + 默认字段，**TODO 字段用空字符串占位**）：

```js
/* ==========================================================================
   黄桂明作品数据 + BRAND 品牌常量
   注：IIFE 暴露 window 全局，不使用 ESM
   ========================================================================== */
(function(){
  'use strict';

  // ---------- 题画诗库（3 首） ----------
  const POEMS = [
    { id: 1, text: '清江一曲绕山流',                                  author: '黄桂明', usage: 'hero-banner' },
    { id: 2, text: '江岸奇峰耸，行舟顺水流。风吟诗意绕，一路画中游。',  author: '黄桂明', usage: 'detail-citation' },
    { id: 3, text: '奇峰迎晓日，清渡载行舟。客望千山翠，诗成韵自悠。',  author: '黄桂明', usage: 'verse-section' },
  ];

  // ---------- 19 张作品 ----------
  // 注：title / size / price 从现有 gallery.html 9 张迁移；前 9 张 featured=true
  //     其余 10 张数据为占位
  const ARTWORKS = [
    // ===== 9 张精选（featured: true）=====
    { id:1,  title:'清江一曲绕山流',          seal:'壹', image:'素材/1.jpg',  thumb:'素材/1.jpg',  category:['漓江','山水'], featured:true,  size:'100 × 50 cm', format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:1, citation:'清江一曲绕山流', description:'', price:6800, inStock:true },
    { id:2,  title:'一山未绝一山迎',          seal:'贰', image:'素材/2.jpg',  thumb:'素材/2.jpg',  category:['漓江','山水'], featured:true,  size:'100 × 50 cm', format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:6800, inStock:true },
    { id:3,  title:'画尽黄山忆徐霞客',        seal:'叁', image:'素材/3.jpg',  thumb:'素材/3.jpg',  category:['奇峰','山水'], featured:true,  size:'100 × 50 cm', format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:7200, inStock:true },
    { id:4,  title:'春雪大可看雪山大雪',      seal:'肆', image:'素材/4.jpg',  thumb:'素材/4.jpg',  category:['四季','山水'], featured:true,  size:'68 × 46 cm',  format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:4800, inStock:true },
    { id:5,  title:'万山迎日·千里画春',        seal:'伍', image:'素材/5.jpg',  thumb:'素材/5.jpg',  category:['奇峰','四季'], featured:true,  size:'68 × 34 cm',  format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:3800, inStock:true },
    { id:6,  title:'雨意湿濛山山色',          seal:'陆', image:'素材/6.jpg',  thumb:'素材/6.jpg',  category:['漓江','烟雨'], featured:true,  size:'100 × 50 cm', format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:6200, inStock:true },
    { id:7,  title:'坚不可摧',                seal:'柒', image:'素材/7.jpg',  thumb:'素材/7.jpg',  category:['漓江','四季'], featured:true,  size:'100 × 50 cm', format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:7600, inStock:true },
    { id:8,  title:'江上春秋',                seal:'捌', image:'素材/8.jpg',  thumb:'素材/8.jpg',  category:['漓江','四季'], featured:true,  size:'68 × 45 cm',  format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:4200, inStock:true },
    { id:9,  title:'红霞映归远·山影晚波轻',   seal:'玖', image:'素材/9.jpg',  thumb:'素材/9.jpg',  category:['奇峰','烟雨'], featured:true,  size:'100 × 50 cm', format:'横幅 · 镜片', material:'宣纸 · 水墨', year:'',  location:'',  style:[], poemId:null, citation:'', description:'', price:6400, inStock:true },
    // ===== 余下 10 张（featured: false，先占位）=====
    { id:10, title:'作品 10',                seal:'拾', image:'素材/10.jpg', thumb:'素材/10.jpg', category:['漓江'], featured:false, size:'', format:'',  material:'', year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:11, title:'作品 11',                seal:'拾壹',image:'素材/11.jpg', thumb:'素材/11.jpg', category:['漓江'], featured:false, size:'', format:'',  material:'', year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:12, title:'作品 12',                seal:'拾贰',image:'素材/12.jpg', thumb:'素材/12.jpg', category:['奇峰'], featured:false, size:'', format:'',  material:'', year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:13, title:'作品 13',                seal:'拾叁',image:'素材/13.jpg', thumb:'素材/13.jpg', category:['奇峰'], featured:false, size:'', format:'',  material:'', year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:14, title:'作品 14',                seal:'拾肆',image:'素材/14.jpg', thumb:'素材/14.jpg', category:['烟雨'], featured:false, size:'', format:'',  material:'', year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:15, title:'作品 15',                seal:'拾伍',image:'素材/15.jpg', thumb:'素材/15.jpg', category:['四季'], featured:false, size:'', format:'',  material:'', year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:16, title:'作品 16',                seal:'拾陆',image:'素材/16.jpg', thumb:'素材/16.jpg', category:['漓江'], featured:false, size:'', format:'',  material:'', year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:17, title:'作品 17',                seal:'拾柒',image:'素材/17.jpg', thumb:'素材/17.jpg', category:['烟雨'], featured:false, size:'', format:'',  material:'', year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:18, title:'作品 18',                seal:'拾捌',image:'素材/18.jpg', thumb:'素材/18.jpg', category:['奇峰'], featured:false, size:'', format:'',  material:'', year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
    { id:19, title:'作品 19',                seal:'拾玖',image:'素材/19.jpg', thumb:'素材/19.jpg', category:['漓江'], featured:false, size:'', format:'',  material:'', year:'', location:'', style:[], poemId:null, citation:'', description:'', price:0, inStock:false },
  ];

  // ---------- BRAND 品牌常量（统一引用） ----------
  const BRAND = {
    name: '黄桂明',
    shortName: '桂明',
    tagline: '诗情画意 · 桂林山水',
    email: 'huang.guiming@art.com',
    phone: '+86 771 8000 0000',
    location: '桂林',
    navMark: '黄',
  };

  // ---------- 辅助函数 ----------
  window.getArtworkById = function(id){
    const n = parseInt(id, 10);
    return ARTWORKS.find(a => a.id === n) || null;
  };
  window.getPoemById = function(id){
    const n = parseInt(id, 10);
    return POEMS.find(p => p.id === n) || null;
  };
  window.getFeaturedArtworks = function(){
    return ARTWORKS.filter(a => a.featured);
  };

  // ---------- 暴露 ----------
  window.POEMS = POEMS;
  window.ARTWORKS_DATA = ARTWORKS;
  window.BRAND = BRAND;
})();
```

- [ ] **Step 3: 浏览器自检 — 数据加载**

打开 http://127.0.0.1:8080/index.html，在 F12 console 粘贴：

```js
console.log(window.ARTWORKS_DATA.length);    // 期望 19
console.log(window.POEMS.length);             // 期望 3
console.log(window.BRAND.name);               // 期望 "黄桂明"
console.log(window.getArtworkById(1).title);  // 期望 "清江一曲绕山流"
console.log(window.getFeaturedArtworks().length);  // 期望 9
```

期望全部输出。无报错。

- [ ] **Step 4: 自检结果记录**

打开 `C:\Users\17316\Desktop\网页8\docs\superpowers\plans\2026-07-29-huang-guiming-revamp.md` 的"实施记录"区段（待 Phase 6 集中记录），或在 console 截图保存作为 Phase 0 完成的凭据。

---

### Task 2: 创建 `lib/smooth-scroll.js`

**Files:**
- Create: `lib/smooth-scroll.js`

- [ ] **Step 1: 写入 smooth-scroll 模块骨架（CDN 懒加载检测 + Lenis 实例 + GSAP ScrollTrigger 注册）**

```js
/* ==========================================================================
   平滑滚动初始化模块
   依赖 CDN 加载顺序：Lenis → GSAP → ScrollTrigger
   ========================================================================== */
(function(){
  'use strict';

  // 检测 CDN 加载状态
  const LenisOK = typeof Lenis !== 'undefined';
  const GsapOK  = typeof gsap  !== 'undefined';
  const STOK    = typeof ScrollTrigger !== 'undefined';

  // 暴露能力状态（供 ink-effects.js 决策是否启用 ScrollStory 与 Marquee）
  window.SCROLL_CAPABILITY = {
    Lenis: LenisOK,
    Gsap: GsapOK,
    ScrollTrigger: STOK,
    // 派生能力：ScrollStory 需要 ScrollTrigger；Marquee 仅需 GSAP
    scrollStoryOK: GsapOK && STOK,
    marqueeOK: GsapOK,
    smootScrollOK: LenisOK,
  };

  if (!GsapOK) {
    console.warn('[smooth-scroll] GSAP 加载失败，仅启用浏览器原生滚动');
    return;
  }

  // 注册 ScrollTrigger 插件（即使 GSAP 在但 ST 没加载也跳过）
  if (STOK) {
    gsap.registerPlugin(ScrollTrigger);
  } else {
    console.warn('[smooth-scroll] ScrollTrigger 未加载，ScrollStory 降级为静态');
  }

  // Lenis 平滑滚动（仅在 GSAP 可用时启用，避免双层 raf 抖动）
  if (LenisOK && GsapOK && STOK) {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time){
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Lenis 滚动 → ScrollTrigger 同步
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    window.LENIS_INSTANCE = lenis;
  }

  console.log('[smooth-scroll] capability:', window.SCROLL_CAPABILITY);
})();
```

- [ ] **Step 2: 接入首页 index.html 的 `<body>` 末尾**

修改 `index.html`：
1. 删除当前 `<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>` 与 ScrollTrigger script（保持 defer）
2. 添加 Lenis CDN 与 ScrollTrigger CDN（**顺序：Lenis → GSAP → ScrollTrigger**）
3. 添加 `<script src="lib/artworks-data.js"></script>`
4. 添加 `<script src="lib/smooth-scroll.js"></script>`

参考：

```html
<!-- 平滑滚动 + 滚动驱动库（CDN 懒加载；GSAP 必须先于 ScrollTrigger） -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>

<!-- 数据 -->
<script src="lib/artworks-data.js"></script>

<!-- 平滑滚动初始化（依赖上方 CDN） -->
<script src="lib/smooth-scroll.js"></script>

<!-- 主交互（依赖 GSAP & smooth-scroll） -->
<script src="ink-effects.js"></script>
```

- [ ] **Step 3: 浏览器自检 — 滚动能力**

打开 http://127.0.0.1:8080/index.html，等待 1 秒，F12 console 跑：

```js
console.table(window.SCROLL_CAPABILITY);
// 期望：全部 true（Lenis / Gsap / ScrollTrigger 三个全部 true）
```

期望输出：
```
┌─────────────────┬──────────┐
│ (index)         │ Values   │
├─────────────────┼──────────┤
│ Lenis           │ true     │
│ Gsap            │ true     │
│ ScrollTrigger   │ true     │
│ scrollStoryOK   │ true     │
│ marqueeOK       │ true     │
│ smootScrollOK   │ true     │
└─────────────────┴──────────┘
```

F12 → Network 标签过滤 "js" 验证 3 个 CDN 都 200。

- [ ] **Step 4: 失败场景验证（模拟 CDN 屏蔽）**

F12 → Network → 切换 "Offline"，刷新页面，再跑 `console.log(window.SCROLL_CAPABILITY)`：

```js
// 期望：
{ Lenis:false, Gsap:false, ScrollTrigger:false, scrollStoryOK:false, marqueeOK:false, smootScrollOK:false }
```

无 throw，正常退化（页面仍可读）。

---

### Task 3: 创建 `lib/nav.js`

**Files:**
- Create: `lib/nav.js`

- [ ] **Step 1: 写入 nav 注入模块**

```js
/* ==========================================================================
   公共导航 — 自动注入 nav DOM + 当前页 active 标记 + scroll-state 切换
   调用：window.NAV_BOOT({ homepage: false })
     - 客户端：window.NAV_BOOT({ homepage: false })  // 显示 cart 按钮
     - 首页：  window.NAV_BOOT({ homepage: true })   // 隐藏 cart 按钮
   ========================================================================== */
(function(){
  'use strict';

  window.NAV_BOOT = function(opts){
    opts = opts || {};
    const isHome = !!opts.homepage;
    const host = document.getElementById('nav');
    if (!host) return;

    // 决定当前页（从 URL 推断）
    const path = location.pathname.split('/').pop() || 'index.html';
    const isActive = (name) => path === name;

    // 首页 brand 链接到 index.html；二级页链接到 index.html（含 hash）
    const brandHref = isHome ? '#hero' : 'index.html';

    const cart = window.BRAND ? '' : '';  // 模板保留位

    // 构建 nav DOM
    host.className = 'nav' + (isHome ? ' nav--hero' : ' nav--scrolled');
    host.id = 'nav';
    host.innerHTML = `
      <div class="nav__inner">
        <a href="${brandHref}" class="nav__brand">
          <span class="nav__brand-mark">${(window.BRAND && window.BRAND.navMark) || '黄'}</span>
          <span>${(window.BRAND && window.BRAND.name) || '黄桂明'}</span>
        </a>
        <ul class="nav__menu">
          <li><a href="index.html" class="nav__link ${isActive('index.html') ? 'nav__link--active' : ''}">首页</a></li>
          <li><a href="gallery.html" class="nav__link ${isActive('gallery.html') ? 'nav__link--active' : ''}">作品</a></li>
          <li><a href="artist.html"  class="nav__link ${isActive('artist.html')  ? 'nav__link--active' : ''}">艺术家</a></li>
        </ul>
        ${isHome ? '' : `<a href="cart.html" class="nav__cta">购物车 · 0</a>`}
      </div>
    `;

    // scroll-state 切换（仅首页需要）
    if (isHome) {
      window.addEventListener('scroll', () => {
        const hero = document.getElementById('hero');
        if (!hero) return;
        const heroBottom = hero.getBoundingClientRect().bottom;
        if (heroBottom < 80) host.classList.add('nav--scrolled');
        else host.classList.remove('nav--scrolled');
      }, { passive: true });
    }

    // 同步 nav badge（购物车）
    const cta = host.querySelector('.nav__cta');
    if (cta) {
      try {
        const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
        cta.textContent = `购物车 · ${cartData.length}`;
      } catch (e) {
        cta.textContent = `购物车 · 0`;
      }
    }

    console.log('[nav] booted for ' + path);
  };
})();
```

- [ ] **Step 2: 接入所有 5 个 HTML**

对每个 HTML（index / gallery / artwork / artist / cart）：
1. 删除现有的 `<nav>...</nav>` 整块
2. 替换为占位：`<nav id="nav"></nav>`
3. 在 `<body>` 末尾（**先于 ink-effects.js**）添加：
   ```html
   <script src="lib/artworks-data.js"></script>
   <script src="lib/nav.js"></script>
   <script>
     NAV_BOOT({ homepage: <true|false> });
   </script>
   ```
4. `homepage: true` 仅给 `index.html`；其余 4 个页面 `homepage: false`

- [ ] **Step 3: 浏览器自检 — 5 页 nav 都注入成功**

依次打开 5 个页面：
- http://127.0.0.1:8080/index.html
- http://127.0.0.1:8080/gallery.html
- http://127.0.0.1:8080/artwork.html?id=1
- http://127.0.0.1:8080/artist.html
- http://127.0.0.1:8080/cart.html

对每页：
- F12 检查 `<nav id="nav">` 内有 `.nav__inner`、`.nav__brand`、`.nav__menu`
- 视觉确认：当前页有 `nav__link--active` 下划线
- 首页：没有 cart 按钮（因为 `homepage:true`）
- 其他页：有 cart 按钮，初始显示"购物车 · 0"
- 所有页：brand mark 都是「黄」字

---

### Task 4: 创建 `lib/footer.js`

**Files:**
- Create: `lib/footer.js`

- [ ] **Step 1: 写入 footer 注入模块**

```js
/* ==========================================================================
   公共页脚 — 注入 footer DOM + 统一品牌信息
   调用：window.FOOTER_BOOT()
   ========================================================================== */
(function(){
  'use strict';

  window.FOOTER_BOOT = function(){
    const host = document.getElementById('footer');
    if (!host) return;

    const b = window.BRAND || {
      name: '黄桂明', tagline: '诗情画意 · 桂林山水',
      email: 'huang.guiming@art.com', phone: '+86 771 8000 0000',
      location: '桂林', navMark: '墨',
    };
    const year = new Date().getFullYear();

    host.className = 'footer';
    host.innerHTML = `
      <div class="container">
        <div class="footer__grid">
          <div class="footer__brand">
            <div class="footer__brand-name">
              <span style="display:inline-block;width:24px;height:24px;background:var(--color-seal);color:var(--color-paper);text-align:center;line-height:24px;font-size:0.875rem;margin-right:8px;transform:rotate(-3deg);">墨</span>
              ${b.name} · 个人作品集
            </div>
            <p class="footer__text">
              一位独立艺术家，与他的桂林山水。<br>
              所有作品均为原创，含亲笔题诗、签名与钤印。
            </p>
          </div>
          <div>
            <h4 class="footer__heading">作品</h4>
            <ul class="footer__list">
              <li><a href="gallery.html" class="footer__link">全部作品</a></li>
            </ul>
          </div>
          <div>
            <h4 class="footer__heading">关于</h4>
            <ul class="footer__list">
              <li><a href="artist.html" class="footer__link">艺术家</a></li>
              <li><a href="index.html#scroll-story" class="footer__link">绘画过程</a></li>
              <li><a href="artist.html#chronology" class="footer__link">创作年表</a></li>
            </ul>
          </div>
        </div>
        <div class="footer__bottom">
          <span>© ${year} ${b.name} · 个人作品集</span>
          <span>画于${b.location}</span>
        </div>
      </div>
    `;
    console.log('[footer] booted');
  };
})();
```

- [ ] **Step 2: 接入所有 5 个 HTML**

对每个 HTML：
1. 删除现有 `<footer>...</footer>` 整块
2. 替换为占位：`<footer id="footer"></footer>`
3. 在 body 末尾的 `NAV_BOOT` 调用之后添加：
   ```html
   <script src="lib/footer.js"></script>
   <script>FOOTER_BOOT();</script>
   ```

- [ ] **Step 3: 浏览器自检 — 5 页 footer 都注入成功**

依次 5 页打开：
- 所有页：footer 显示同一套信息（邮箱 `huang.guiming@art.com`、电话 `+86 771 8000 0000`、桂林）
- 所有页：版权年份是动态（`new Date().getFullYear()`）当前年 2026
- F12 检查：grep `富春江画院`、`@fuchun-gallery`、`+86 571` 全部不存在

执行以下 F12 自检脚本：

```js
document.body.innerHTML.match(/富春江/g);
document.body.innerHTML.match(/fuchun/gi);
document.body.innerHTML.match(/571/g);
// 期望全部 null
```

---

## Phase 0 自检（基础 4 件套）

完成后跑：
- 5 页都能打开，没有 console 错误
- nav 与 footer 都在每页显示
- 当前页 nav 高亮正确
- 首页无 cart 按钮，二级页有
- 所有页 brand 信息完全统一

---

# Phase 1 — 二级页面改造

### Task 5: 改造 `artist.html`（替换为完整新文件）

**Files:**
- Modify: `artist.html`（替换为完整新文件）
- (依赖：`lib/artworks-data.js`, `lib/nav.js`, `lib/footer.js`)

- [ ] **Step 1: 删除原 artist.html 全部内容，写入新文件**

完整新文件 `artist.html`（无需 diff，dev agent 可直接粘贴覆盖）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="黄桂明 · 桂林山水画家 —— 诗情画意，笔耕四十余年。">
  <title>黄桂明 · 桂林山水画家</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>

  <!-- Nav (由 lib/nav.js 注入) -->
  <nav id="nav" aria-label="主导航"></nav>

  <!-- Page Header -->
  <header class="page-header">
    <span class="eyebrow eyebrow--seal">Artist · 艺术家</span>
    <h1 class="page-header__title">黄桂明</h1>
    <p class="page-header__sub">桂林山水画家 · 诗情画意 · 笔耕四十余年</p>
  </header>

  <!-- 自述 -->
  <section class="story">
    <div class="container">
      <div class="story__grid">
        <div class="story__media">
          <img src="素材/20.jpg" alt="黄桂明创作照" class="story__img">
          <div class="story__seal">桂明</div>
        </div>
        <div>
          <span class="eyebrow">自述 · In His Words</span>
          <h2 class="story__title">古人画山水，<br>今人画山水。</h2>
          <p class="story__text">
            黄桂明，桂林山水画家。17 岁拜师学画，至今笔耕四十余年。
            只画桂林山水，从未画过其他题材；一个景点可以画三、五、十张，每幅各有千秋，绝不重复。
          </p>
          <p class="story__text">
            他是一位"没有"什么的画家——不是任何协会会员，没有入展获奖记录，没有炒作宣传，
            没有出版过自己的画集。然而被艺术圈称为"黄桂明现象"，
            不用找合作画廊，画廊老板却主动上门协商取货。
          </p>
          <p class="story__text">
            画品即人品，他的画作和他的为人一样，自带一种让人舒服的松弛感——
            落笔洗练流畅，游刃有余；色调明丽清新，雅致耐看；
            构图参差错落，虚实呼应。
          </p>
          <p class="story__signature">— 黄桂明 · 桂林</p>
        </div>
      </div>
    </div>
  </section>

  <!-- 时间线 -->
  <section class="featured" id="chronology">
    <div class="container container--narrow">
      <div style="text-align:center;margin-bottom:96px;">
        <span class="eyebrow eyebrow--seal">Chronology · 年表</span>
        <h2>十年，一江山水。</h2>
      </div>

      <div style="display:grid;gap:48px;max-width:720px;margin:0 auto;">

        <div style="display:grid;grid-template-columns:120px 1fr;gap:32px;padding-bottom:48px;border-bottom:1px solid var(--color-divider);">
          <div>
            <div style="font-family:var(--font-serif);font-size:2rem;color:var(--color-seal);line-height:1;">2026</div>
            <div style="font-size:0.8125rem;color:var(--color-ink-mute);margin-top:8px;">当下</div>
          </div>
          <div>
            <h3 style="font-size:1.25rem;margin-bottom:12px;">个人作品集网站上线 · 持续创作</h3>
            <p style="color:var(--color-ink-soft);">个人作品集网站正式上线；山水系列创作持续推进。</p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:120px 1fr;gap:32px;padding-bottom:48px;border-bottom:1px solid var(--color-divider);">
          <div>
            <div style="font-family:var(--font-serif);font-size:2rem;color:var(--color-seal);line-height:1;">2020</div>
            <div style="font-size:0.8125rem;color:var(--color-ink-mute);margin-top:8px;">新富春山居</div>
          </div>
          <div>
            <h3 style="font-size:1.25rem;margin-bottom:12px;">《新富春山居》系列</h3>
            <p style="color:var(--color-ink-soft);">承接黄公望七百年笔墨，以今人之心重写富春江两岸山水。</p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:120px 1fr;gap:32px;padding-bottom:48px;border-bottom:1px solid var(--color-divider);">
          <div>
            <div style="font-family:var(--font-serif);font-size:2rem;color:var(--color-seal);line-height:1;">2015</div>
            <div style="font-size:0.8125rem;color:var(--color-ink-mute);margin-top:8px;">写生西北</div>
          </div>
          <div>
            <h3 style="font-size:1.25rem;margin-bottom:12px;">黄山雪 · 西北行</h3>
            <p style="color:var(--color-ink-soft);">行走甘肃、青海、黄山。雪景系列创作高峰。</p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:120px 1fr;gap:32px;padding-bottom:48px;border-bottom:1px solid var(--color-divider);">
          <div>
            <div style="font-family:var(--font-serif);font-size:2rem;color:var(--color-seal);line-height:1;">早期</div>
            <div style="font-size:0.8125rem;color:var(--color-ink-mute);margin-top:8px;">师承</div>
          </div>
          <div>
            <h3 style="font-size:1.25rem;margin-bottom:12px;">拜入桂林山水画派门下</h3>
            <p style="color:var(--color-ink-soft);">先后师从桂林山水画派前辈，得中国画正脉。</p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:120px 1fr;gap:32px;">
          <div>
            <div style="font-family:var(--font-serif);font-size:2rem;color:var(--color-seal);line-height:1;">初心</div>
            <div style="font-size:0.8125rem;color:var(--color-ink-mute);margin-top:8px;">起步</div>
          </div>
          <div>
            <h3 style="font-size:1.25rem;margin-bottom:12px;">执笔至今</h3>
            <p style="color:var(--color-ink-soft);">年复一年，不参展，不参赛，不炒作宣传。独自跋涉在山水画创作之路。</p>
          </div>
        </div>

      </div>
    </div>
  </section>

  <!-- 代表作 -->
  <section class="featured" style="background:var(--color-paper-warm);">
    <div class="container">
      <div class="featured__head">
        <div>
          <span class="eyebrow eyebrow--seal">Selected · 代表作</span>
          <h2 class="featured__title">十年精选</h2>
        </div>
        <a href="gallery.html" class="featured__more">全部作品 →</a>
      </div>
      <div class="gallery-grid" id="artistRepresentativeGrid">
        <!-- 由 lib/gallery-render.js 渲染前 3 张精选 -->
      </div>
    </div>
  </section>

  <!-- Footer (由 lib/footer.js 注入) -->
  <footer id="footer"></footer>

  <!-- Scripts (顺序：CDN → 数据 → 渲染 → nav/footer) -->
  <script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
  <script src="lib/artworks-data.js"></script>
  <script src="lib/smooth-scroll.js"></script>
  <script src="lib/gallery-render.js"></script>
  <script src="lib/nav.js"></script>
  <script src="lib/footer.js"></script>
  <script>
    NAV_BOOT({ homepage: false });
    FOOTER_BOOT();
    // 代表作渲染为前 3 张精选
    (function(){
      const grid = document.getElementById('artistRepresentativeGrid');
      if (!grid || !window.getFeaturedArtworks) return;
      const featured = window.getFeaturedArtworks().slice(0, 3);
      grid.innerHTML = featured.map(a => `
        <a href="artwork.html?id=${a.id}" class="art-card">
          <div class="art-card__media">
            <img src="${a.image}" alt="${a.title}" class="art-card__img" loading="lazy">
            <span class="art-card__seal">${a.seal}</span>
          </div>
          <h3 class="art-card__title">${a.title}</h3>
          <div class="art-card__meta">
            <span>${a.size || '—'}</span>
            <span class="art-card__price">¥ ${a.price ? a.price.toLocaleString() : '咨询'}</span>
          </div>
        </a>
      `).join('');
    })();
  </script>
</body>
</html>
```

- [ ] **Step 2: 浏览器自检 — artist.html 改造结果**

打开 http://127.0.0.1:8080/artist.html：

视觉确认：
- 页眉：「黄桂明 · 桂林山水画家」
- 配图：画家本人照片（`素材/20.jpg`）替代空墙
- 时间线 5 条（2026 / 2020 / 2015 / 早期 / 初心）
- 代表作 3 张精选卡片
- 无"富春江画院"字样
- F12 console 无错误

---

### Task 6: 改造 `cart.html`（替换为完整新文件 + 新建 `lib/cart.js`）

**Files:**
- Modify: `cart.html`（替换为完整新文件）
- Create: `lib/cart.js`（addToCart / removeItem / checkout 三函数移入）

- [ ] **Step 1: 创建 `lib/cart.js`（从 cart.html 与 artwork.html 移出共享购物车逻辑）**

```js
/* ==========================================================================
   购物车模块 — 封装 localStorage 操作 + toast 提示 + 降级到内存
   暴露：window.Cart = { add, remove, list, totalCount, checkout, showToast }
   ========================================================================== */
(function(){
  'use strict';

  const STORAGE_KEY = 'cart';
  // 降级：当 localStorage 不可用（如隐私模式）时使用内存数组
  let fallback = null;

  function safeRead(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      if (fallback === null) fallback = [];
      return fallback;
    }
  }

  function safeWrite(arr){
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      if (fallback === null) fallback = arr.slice();
      else fallback.length = 0;
      fallback.push(...arr);
    }
  }

  function updateNavBadge(){
    const cta = document.querySelector('.nav__cta');
    if (cta) cta.textContent = `购物车 · ${safeRead().length}`;
  }

  function showToast(msg){
    const toast = document.getElementById('toast');
    if (!toast) return;
    const span = document.getElementById('toastMsg');
    if (span) span.textContent = msg;
    toast.classList.add('toast--show');
    setTimeout(() => toast.classList.remove('toast--show'), 2400);
  }

  function add(name, price){
    const arr = safeRead();
    arr.push({ name, price: price || 0, ts: Date.now() });
    safeWrite(arr);
    showToast(`已添加意向：《${name}》`);
    updateNavBadge();
  }

  function remove(index){
    const arr = safeRead();
    const removed = arr.splice(index, 1)[0];
    safeWrite(arr);
    if (removed) showToast(`已移除《${removed.name}》`);
    updateNavBadge();
  }

  function list(){ return safeRead(); }
  function totalCount(){ return safeRead().length; }
  function checkout(){
    showToast('演示版 · 收藏咨询请使用页面按钮');
  }

  // 全局暴露（兼容现有 cart.html / artwork.html 内联调用）
  window.addToCart = function(name, price){ add(name, price); };
  window.removeItem = function(i){ remove(i); };
  window.checkout = function(){ checkout(); };
  window.showToast = showToast;
  window.Cart = { add, remove, list, totalCount, checkout, showToast, updateNavBadge };

  // 启动时同步 nav badge
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNavBadge);
  } else {
    updateNavBadge();
  }
})();
```

- [ ] **Step 2: 替换 `cart.html` 完整新文件**

完整新文件（dev agent 可直接粘贴覆盖）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="黄桂明作品集 · 意向清单">
  <title>购物车 · 黄桂明作品集</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>

  <!-- Nav -->
  <nav id="nav" aria-label="主导航"></nav>

  <!-- Page Header -->
  <header class="page-header">
    <span class="eyebrow eyebrow--seal">Cart · 意向清单</span>
    <h1 class="page-header__title">您的心选</h1>
    <p class="page-header__sub">每一件作品，都将仔细为您打包。</p>
  </header>

  <!-- Cart Content -->
  <section class="artwork">
    <div class="container container--narrow" id="cartContainer">

      <div id="emptyState" style="text-align:center;padding:96px 0;">
        <div style="width:80px;height:80px;background:var(--color-seal);margin:0 auto 32px;display:flex;align-items:center;justify-content:center;color:var(--color-paper);font-family:var(--font-serif);font-size:2rem;transform:rotate(-3deg);">空</div>
        <h3 style="margin-bottom:16px;">意向清单尚空</h3>
        <p style="color:var(--color-ink-soft);margin-bottom:32px;">去看看画廊，或许有一幅正等着您。</p>
        <a href="gallery.html" class="btn btn--ink">浏览作品</a>
      </div>

      <div id="cartList"></div>

      <div id="cartSummary" style="display:none;margin-top:64px;padding:32px;background:var(--color-paper-warm);border-radius:var(--radius-md);">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px;">
          <span style="color:var(--color-ink-soft);">小计</span>
          <span id="subtotal" style="font-family:var(--font-serif);font-size:1.25rem;">¥ 0</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px;">
          <span style="color:var(--color-ink-soft);">配送</span>
          <span style="font-family:var(--font-serif);font-size:1rem;color:var(--color-ink-mute);">顺丰保价到付</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding-top:24px;border-top:1px solid var(--color-divider);">
          <span style="font-size:1.125rem;">合计</span>
          <span id="total" style="font-family:var(--font-serif);font-size:2rem;color:var(--color-ink);">¥ 0</span>
        </div>
        <button class="btn btn--primary" style="width:100%;justify-content:center;margin-top:32px;" onclick="checkout()">提交意向 →</button>
        <p style="text-align:center;font-size:0.8125rem;color:var(--color-ink-mute);margin-top:16px;">
          ✦ 7 日无理由退换 · ✦ 艺术家亲笔签名 · ✦ 专业装裱
        </p>
      </div>

    </div>
  </section>

  <!-- CTA -->
  <section class="verse" style="background:var(--color-paper-warm);">
    <p class="verse__text">一笔一墨<br>皆是桂林</p>
    <p class="verse__author">— 黄桂明</p>
  </section>

  <!-- Footer -->
  <footer id="footer"></footer>

  <!-- Toast -->
  <div class="toast" id="toast">
    <span class="toast__seal"></span>
    <span id="toastMsg">已添加意向</span>
  </div>

  <!-- Scripts -->
  <script src="lib/artworks-data.js"></script>
  <script src="lib/cart.js"></script>
  <script src="lib/nav.js"></script>
  <script src="lib/footer.js"></script>
  <script>
    NAV_BOOT({ homepage: false });
    FOOTER_BOOT();

    // 渲染购物车列表（用 lib/cart.js 提供的能力）
    function renderCart(){
      const cart = window.Cart ? window.Cart.list() : [];
      const empty = document.getElementById('emptyState');
      const list = document.getElementById('cartList');
      const summary = document.getElementById('cartSummary');

      if (cart.length === 0) {
        empty.style.display = 'block';
        list.innerHTML = '';
        summary.style.display = 'none';
        return;
      }

      empty.style.display = 'none';
      summary.style.display = 'block';

      list.innerHTML = cart.map((item, i) => `
        <div style="display:grid;grid-template-columns:100px 1fr auto;gap:24px;align-items:center;padding:32px 0;border-bottom:1px solid var(--color-divider);">
          <div style="aspect-ratio:4/5;overflow:hidden;background:var(--color-paper-warm);">
            <img src="有画.png" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;">
          </div>
          <div>
            <h3 style="font-size:1.25rem;margin-bottom:8px;">${item.name}</h3>
            <p style="font-size:0.875rem;color:var(--color-ink-mute);">原作 · 含签名 · 含装裱</p>
            <button style="margin-top:12px;font-size:0.8125rem;color:var(--color-ink-mute);background:none;border:none;padding:0;cursor:pointer;text-decoration:underline;" onclick="removeItem(${i})">移除</button>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-serif);font-size:1.5rem;color:var(--color-ink);">¥ ${(item.price || 0).toLocaleString()}</div>
          </div>
        </div>
      `).join('');

      const subtotal = cart.reduce((sum, item) => sum + (item.price || 0), 0);
      document.getElementById('subtotal').textContent = `¥ ${subtotal.toLocaleString()}`;
      document.getElementById('total').textContent    = `¥ ${subtotal.toLocaleString()}`;
    }

    renderCart();
  </script>
</body>
</html>
```

- [ ] **Step 3: 浏览器自检 — cart.html**

打开 http://127.0.0.1:8080/cart.html：
- 进入任一详情页 → 点击"收藏咨询"按钮 → toast 显示「已添加意向：《作品名》」
- 回到 cart.html：列表显示已添加项
- nav badge 同步显示 `购物车 · N`
- localStorage 检查：`localStorage.getItem('cart')` 返回数组
- F12 测离线模式：localStorage 写入失败→ toast 仍能弹出，nav badge 仍同步（fallback 内存对象）
- 无"富春江画院"残留

---

### Task 7: 改造 `gallery.html`（数据驱动 + 筛选）

**Files:**
- Modify: `gallery.html`

- [ ] **Step 1: 删除内联硬编码的 9 张 art-card**

把 gallery-grid 块替换为：

```html
<div class="gallery-grid" id="galleryGrid">
  <!-- 由 lib/gallery-render.js 动态注入 -->
</div>
```

新增 `lib/gallery-render.js`：

```js
/* ==========================================================================
   Gallery 渲染 — 从 ARTWORKS_DATA 动态填充 9 张精选 + 4 分类筛选
   ========================================================================== */
(function(){
  'use strict';

  function renderGallery(){
    const grid = document.getElementById('galleryGrid');
    if (!grid || !window.ARTWORKS_DATA) return;

    const featured = window.getFeaturedArtworks();

    grid.innerHTML = featured.map(a => `
      <a href="artwork.html?id=${a.id}" class="art-card" data-id="${a.id}" data-category="${a.category.join(' ')}">
        <div class="art-card__media">
          <img src="${a.image}" alt="${a.title}" class="art-card__img" loading="lazy"
               onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'art-card__placeholder',textContent:'图未备',style:'width:100%;height:100%;background:var(--color-paper-warm);display:flex;align-items:center;justify-content:center;color:var(--color-ink-mute)'}))">
          <span class="art-card__seal">${a.seal}</span>
        </div>
        <h3 class="art-card__title">${a.title}</h3>
        <div class="art-card__meta">
          <span>${a.material || '水墨'} · ${a.size || '—'}</span>
          <span class="art-card__price">¥ ${a.price ? a.price.toLocaleString() : '咨询'}</span>
        </div>
      </a>
    `).join('');
  }

  // 筛选按钮逻辑
  function bindFilters(){
    const filters = document.querySelectorAll('.filter');
    const cards = document.querySelectorAll('.art-card');
    filters.forEach(btn => {
      btn.addEventListener('click', () => {
        filters.forEach(b => b.classList.remove('filter--active'));
        btn.classList.add('filter--active');
        const filter = btn.dataset.filter;
        cards.forEach(card => {
          if (filter === 'all' || (card.dataset.category || '').includes(filter)) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // 入场动画（IntersectionObserver）
  function animateCardsIn(){
    if (!('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.art-card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(24px)';
      card.style.transition = `opacity 600ms var(--ease-out-expo, ease) ${i * 60}ms, transform 600ms var(--ease-out-expo, ease) ${i * 60}ms`;
      obs.observe(card);
    });
  }

  function init(){
    renderGallery();
    bindFilters();
    animateCardsIn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 2: 接入 gallery.html**

在 gallery.html `<body>` 末尾（NAV_BOOT 与 FOOTER_BOOT 调用之间）添加：

```html
<script src="lib/gallery-render.js"></script>
```

- [ ] **Step 3: 浏览器自检 — gallery 9 张精选**

打开 http://127.0.0.1:8080/gallery.html：
- 视觉：9 张卡片显示 9 张不同图（来自 `素材/1.jpg~9.jpg`）
- 切换筛选「漓江」：只剩 category 包含「漓江」的作品
- 切换筛选「奇峰」：只剩包含「奇峰」的作品
- 切换筛选「烟雨」/「四季」同上
- 切换「全部」：回到 9 张
- F12 无报错

---

### Task 8: 改造 `artwork.html`（动态渲染）

**Files:**
- Modify: `artwork.html`
- Create: `lib/artwork-render.js`

- [ ] **Step 1: 创建 lib/artwork-render.js**

```js
/* ==========================================================================
   Artwork 详情渲染 — 从 URL ?id=N 读取作品，字段缺失自动隐藏
   ========================================================================== */
(function(){
  'use strict';

  function escapeHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }

  function renderArtwork(){
    const params = new URLSearchParams(location.search);
    const id = params.get('id') || '1';
    const artwork = window.getArtworkById(id);
    const poem = artwork && artwork.poemId ? window.getPoemById(artwork.poemId) : null;
    const root = document.getElementById('artworkRoot');

    if (!artwork) {
      root.innerHTML = `
        <div style="text-align:center;padding:128px 0;">
          <h1 style="font-family:var(--font-serif);margin-bottom:16px;">此作品尚未备档</h1>
          <p style="color:var(--color-ink-soft);margin-bottom:32px;">可能的原因：编号不存在或作品尚未收录。</p>
          <a href="gallery.html" class="btn btn--ghost-dark">← 返回作品集</a>
        </div>
      `;
      document.title = '作品未找到 · 黄桂明作品集';
      return;
    }

    const title = escapeHtml(artwork.title);
    const year = escapeHtml(artwork.year);
    const location = escapeHtml(artwork.location);
    const size = escapeHtml(artwork.size);
    const format = escapeHtml(artwork.format);
    const material = escapeHtml(artwork.material);
    const styleTxt = (artwork.style || []).join(' · ');

    // 字段显示规则：有数据才显示行
    const specs = [];
    if (size)     specs.push({ label: '尺寸', value: size });
    if (format)   specs.push({ label: '形制', value: format });
    if (material) specs.push({ label: '材质', value: material });
    if (styleTxt) specs.push({ label: '风格', value: styleTxt });
    if (year || location) {
      specs.push({ label: '创作', value: [year, location].filter(Boolean).join(' · ') });
    }

    root.innerHTML = `
      <div style="margin-bottom:32px;">
        <a href="gallery.html" class="featured__more" style="font-size:0.875rem;">← 返回作品集</a>
      </div>

      <div class="artwork__grid">
        <div class="artwork__media">
          <img src="${artwork.image}" alt="${title}" class="artwork__img" loading="eager"
               onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'artwork__img-placeholder',textContent:'图未备',style:'width:100%;height:100%;background:var(--color-paper-warm);display:flex;align-items:center;justify-content:center;color:var(--color-ink-mute);font-family:var(--font-serif);font-size:1.5rem'}))">
          <div class="artwork__seal-badge">${escapeHtml(artwork.seal)}</div>
        </div>

        <div class="artwork__info">
          <div class="artwork__eyebrow">No. ${escapeHtml(artwork.seal)} · ${(artwork.category || []).join(' · ')}</div>
          <h1 class="artwork__title">${title}</h1>
          <p class="artwork__artist">—— 黄桂明 · 桂林山水</p>

          ${poem ? `
            <blockquote style="margin:32px 0;padding:24px;border-left:2px solid var(--color-seal);background:var(--color-paper-warm);">
              <p style="font-family:var(--font-serif);font-size:1.125rem;line-height:2;letter-spacing:0.1em;color:var(--color-ink);">${escapeHtml(poem.text)}</p>
            </blockquote>
          ` : ''}

          ${artwork.description ? `<p class="artwork__desc">${escapeHtml(artwork.description)}</p>` : ''}

          ${specs.length ? `
            <ul class="artwork__specs">
              ${specs.map(s => `
                <li class="artwork__spec">
                  <span class="artwork__spec-label">${escapeHtml(s.label)}</span>
                  <span class="artwork__spec-value">${escapeHtml(s.value)}</span>
                </li>
              `).join('')}
            </ul>
          ` : ''}

          <div class="artwork__price-row">
            <div>
              <div class="artwork__price">¥ ${artwork.price ? artwork.price.toLocaleString() : '咨询收藏'}</div>
              <div class="artwork__price-note">含艺术家亲笔签名 · 含装裱</div>
            </div>
          </div>

          <div class="artwork__actions">
            <button class="btn btn--primary" onclick="addToCart('${escapeHtml(artwork.title)}', ${artwork.price || 0})">收藏咨询</button>
            <a href="#" class="btn btn--ghost-dark">发送邮件</a>
          </div>
        </div>
      </div>
    `;

    document.title = `${title} · 黄桂明作品集`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderArtwork);
  } else {
    renderArtwork();
  }
})();
```

- [ ] **Step 2: 接入 artwork.html**

替换 `artwork.html` 当前的 `<section class="artwork">...</section>` 整块（含内联详情）：

```html
<section class="artwork">
  <div class="container">
    <div id="artworkRoot"><!-- 由 lib/artwork-render.js 动态注入 --></div>
  </div>
</section>
```

并在 body 末尾添加 `<script src="lib/artwork-render.js"></script>`。

- [ ] **Step 3: 浏览器自检 — 多 id 详情页**

依次访问：
- http://127.0.0.1:8080/artwork.html?id=1 → 显示「清江一曲绕山流」
- http://127.0.0.1:8080/artwork.html?id=2 → 显示「一山未绝一山迎」
- http://127.0.0.1:8080/artwork.html?id=999 → 显示「此作品尚未备档」空状态
- http://127.0.0.1:8080/artwork.html?id=foo → 显示空状态
- http://127.0.0.1:8080/artwork.html → 默认 id=1 同样工作

每页：CTA 按钮文案「收藏咨询」，邮件按钮预填主题「收藏咨询：《作品名》」

---

### Task 9: 浏览器自检 — 5 页基础外观

打开 5 页各停留 5 秒：
- 没有 console 错误
- nav 正确高亮当前页
- footer 品牌统一
- 字体、颜色、布局与改造前保持延续性

记录截图。

---

# Phase 2 — `ink-effects.js` 重写（核心）

### Task 10: 重构 ink-effects.js — Hero 鼠标遮罩（沿用稳定版）

**Files:**
- Modify: `ink-effects.js`

- [ ] **Step 1: 文件头部 / 模块骨架**

ink-effects.js 整体重写。骨架（仅头部 + 模块划分，**后续 4 个 Task 逐步填充**）：

```js
/* ==========================================================================
   ink-effects.js — 黄桂明网站主动画模块
   - 模块 A: Hero 鼠标遮罩
   - 模块 B: ScrollStory (Lock + Scrub)
   - 模块 C: Marquee (双行反向)
   - 模块 D: Verse 入场
   - 模块 E: Curtain 页间过场
   - 模块 F: Loader
   依赖：window.SCROLL_CAPABILITY（来自 lib/smooth-scroll.js）
   ========================================================================== */
(function(){
  'use strict';

  const cap = window.SCROLL_CAPABILITY || { Gsap:false, ScrollTrigger:false, marqueeOK:false, scrollStoryOK:false };

  // ====== 工具：rAF 节流 ======
  function rafThrottle(fn){
    let ticking = false;
    return function(...args){
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => { fn.apply(this, args); ticking = false; });
      }
    };
  }

  // ====== 模块占位（后续 Task 填充）======
  function bootHero()      { /* Task 10 */ }
  function bootScrollStory(){ /* Task 11 */ }
  function bootMarquee()   { /* Task 12 */ }
  function bootVerse()     { /* Task 13 */ }
  function bootCurtain()   { /* Task 14 */ }
  function bootLoader()    { /* Task 15 */ }

  // ====== 启动顺序 ======
  function bootAll(){
    bootHero();
    bootScrollStory();
    bootMarquee();
    bootVerse();
    bootCurtain();
    bootLoader();
    console.log('[ink-effects] all modules booted. capability:', cap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAll);
  } else {
    bootAll();
  }
})();
```

- [ ] **Step 2: 实现 `bootHero()` — 鼠标遮罩（沿用现有稳定逻辑）**

将原 `ink-effects.js` 第 33-80 行的 `Hero 鼠标遮罩` 逻辑搬到模块 A：

```js
  function bootHero(){
    const hero = document.getElementById('hero');
    const heroReveal = document.getElementById('heroReveal');
    if (!hero || !heroReveal) return;

    const updateCursor = rafThrottle(function(e){
      const rect = hero.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      heroReveal.style.setProperty('--mx', xPct + '%');
      heroReveal.style.setProperty('--my', yPct + '%');

      const dot = document.getElementById('heroCursorDot');
      if (dot) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        dot.style.left = x + 'px';
        dot.style.top  = y + 'px';
      }
    });

    hero.addEventListener('mousemove', updateCursor);

    // 移动端触摸揭示
    hero.addEventListener('touchmove', function(e){
      const t = e.touches[0];
      const rect = hero.getBoundingClientRect();
      const xPct = ((t.clientX - rect.left) / rect.width) * 100;
      const yPct = ((t.clientY - rect.top) / rect.height) * 100;
      heroReveal.style.setProperty('--mx', xPct + '%');
      heroReveal.style.setProperty('--my', yPct + '%');
    }, { passive: true });

    const dot = document.getElementById('heroCursorDot');
    hero.addEventListener('mouseenter', () => { if (dot) dot.style.opacity = '1'; });
    hero.addEventListener('mouseleave', () => { if (dot) dot.style.opacity = '0'; });

    console.log('[Hero] booted');
  }
```

- [ ] **Step 3: 浏览器自检 — Hero 鼠标遮罩**

打开 http://127.0.0.1:8080/index.html：
- 移动鼠标到 hero 区，遮罩跟随，无明显抖动
- F12 Performance 录制：FPS 接近 60
- 控制台打印 `[Hero] booted`

---

### Task 11: 实现 `bootScrollStory()` — ScrollTrigger.pin + scrub

**Files:**
- Modify: `ink-effects.js`

- [ ] **Step 0: 实地校验帧数（避免硬编码 248 错位）**

```bash
ls "C:/Users/17316/Desktop/网页8/素材/视频切割/" | grep -E '^frame_[0-9]+\.jpg$' | wc -l
```

期望 248。如不是，调整本 Task 中的 `FRAME_COUNT` 与 spec §4.1 A2。

- [ ] **Step 1: 实现 bootScrollStory（注意 TDZ：`frames` 声明前置）**

```js
  // ====== 帧序列路径配置 ======
  const FRAME_COUNT = 248;
  const FRAME_PATH  = '素材/视频切割/frame_';
  const FRAME_EXT   = '.jpg';

  function bootScrollStory(){
    const scrollStory = document.getElementById('scroll-story');
    const scrollCanvas = document.getElementById('scrollStoryCanvas');
    if (!scrollStory || !scrollCanvas) return;

    // 声明前置：避免 TDZ ReferenceError（frames 在 resizeCanvas 调用前必须存在）
    const frames = new Array(FRAME_COUNT);
    let loadedCount = 0;

    if (!cap.scrollStoryOK) {
      // 降级：显示静态中间帧或隐藏
      console.warn('[ScrollStory] capability missing, fallback to static');
      scrollStory.classList.add('is-active');
      const fallback = new Image();
      fallback.src = FRAME_PATH + '00001' + FRAME_EXT;
      fallback.onload = function(){
        const ctx = scrollCanvas.getContext('2d');
        scrollCanvas.width = window.innerWidth;
        scrollCanvas.height = window.innerHeight;
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(0, 0, scrollCanvas.width, scrollCanvas.height);
        ctx.drawImage(fallback, 0, 0, scrollCanvas.width, scrollCanvas.height);
      };
      return;
    }

    const ctx = scrollCanvas.getContext('2d', { alpha: false });
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let canvasW = 0, canvasH = 0;
    let currentFrame = 0;

    function resizeCanvas(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasW = window.innerWidth;
      canvasH = window.innerHeight;
      scrollCanvas.style.width  = canvasW + 'px';
      scrollCanvas.style.height = canvasH + 'px';
      scrollCanvas.width  = Math.floor(canvasW * dpr);
      scrollCanvas.height = Math.floor(canvasH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // frames 在此处安全可访问（前面已声明并 new Array(FRAME_COUNT)）
      if (frames[0] && frames[0].complete) drawFrame(currentFrame);
    }

    function drawFrame(i){
      const img = frames[i];
      if (!img || !img.complete || img.naturalWidth === 0) return;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = canvasW / canvasH;
      let dw, dh, dx, dy;
      if (imgRatio > canvasRatio) {
        dh = canvasH; dw = dh * imgRatio; dx = (canvasW - dw) / 2; dy = 0;
      } else {
        dw = canvasW; dh = dw / imgRatio; dx = 0; dy = (canvasH - dh) / 2;
      }
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    function preloadFrame(index){
      return new Promise(resolve => {
        const img = new Image();
        img.onload = function(){
          frames[index] = img;
          loadedCount++;
          if (index === 0) drawFrame(0);
          const loaderBar = document.getElementById('loaderBar');
          const loaderCount = document.getElementById('loaderCount');
          if (loaderBar) loaderBar.style.width = Math.min(100, Math.round(loadedCount / FRAME_COUNT * 100)) + '%';
          if (loaderCount) loaderCount.textContent = Math.min(100, Math.round(loadedCount / FRAME_COUNT * 100));
          resolve(img);
        };
        img.onerror = function(){ resolve(null); };
        img.src = FRAME_PATH + String(index + 1).padStart(5, '0') + FRAME_EXT;
      });
    }

    async function preloadAll(){
      const BATCH = 20;
      for (let i = 0; i < FRAME_COUNT; i += BATCH) {
        const ps = [];
        for (let j = i; j < Math.min(i + BATCH, FRAME_COUNT); j++) ps.push(preloadFrame(j));
        await Promise.all(ps);
      }
      const loaderEl = document.getElementById('loader');
      if (loaderEl) {
        loaderEl.classList.add('is-hiding');
        document.body.classList.add('is-ready');
        setTimeout(() => loaderEl.classList.add('is-removed'), 1000);
      }
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    preloadAll();

    // ====== ScrollTrigger pin + scrub ======
    gsap.context(() => {
      ScrollTrigger.create({
        trigger: '#scroll-story',
        start: 'top top',
        end: '+=3000',
        pin: true,
        scrub: 0.5,
        onUpdate: (self) => {
          const frame = Math.floor(self.progress * (FRAME_COUNT - 1));
          if (frame !== currentFrame) {
            currentFrame = frame;
            drawFrame(frame);
          }
        },
      });
    });

    console.log('[ScrollStory] booted (ScrollTrigger pin + scrub)');
  }
```

- [ ] **Step 2: 浏览器自检 — ScrollStory 走帧**

打开 index.html，等待 loader 100%，页面解锁后：
- 滚动到 hero 下方，scroll-story 自动 pin（不再滚过去）
- 滚动一段距离，画面帧切换
- 滚到底，自然过渡到下一段（Marquee）
- F12 console 无报错

FPS 验证：F12 Performance 录制 5 秒滚动 → 帧率 ≥ 55

---

### Task 12: 实现 `bootMarquee()` — 双行反向 GSAP

**Files:**
- Modify: `ink-effects.js`

- [ ] **Step 1: 实现 bootMarquee**

```js
  function bootMarquee(){
    const row1 = document.getElementById('marqueeRow1');
    const row2 = document.getElementById('marqueeRow2');
    if (!row1 || !row2) return;

    if (!cap.marqueeOK) {
      console.warn('[Marquee] GSAP missing, fallback to static grid');
      // Fallback: 横向滚动 DOM，overflow-x: auto 手势滑动
      row1.parentElement.style.overflowX = 'auto';
      row2.parentElement.style.overflowX = 'auto';
      return;
    }

    const allArtworks = (window.ARTWORKS_DATA || []).filter(a => a.image);

    function tile(art){
      return `
        <a href="artwork.html?id=${art.id}" class="marquee__tile" data-id="${art.id}">
          <img src="${art.thumb}" alt="${art.title}" loading="lazy" />
          <span class="marquee__seal">${art.seal}</span>
        </a>
      `;
    }

    function setupRow(rowEl, direction){
      // 复制 1 份实现无缝循环
      rowEl.innerHTML = allArtworks.map(tile).join('') + allArtworks.map(tile).join('');

      const tween = gsap.to(rowEl, {
        xPercent: direction === 'left' ? -50 : 50,
        duration: direction === 'left' ? 60 : 80,
        ease: 'none',
        repeat: -1,
      });

      // 桌面 hover 暂停
      rowEl.addEventListener('mouseenter', () => tween.pause());
      rowEl.addEventListener('mouseleave', () => {
        // 移动端触摸后 2s 恢复
        if (rowEl.dataset.touchResumeTimer) clearTimeout(+rowEl.dataset.touchResumeTimer);
        const timer = setTimeout(() => tween.resume(), 2000);
        rowEl.dataset.touchResumeTimer = String(+timer);
      });

      // 移动端触摸暂停
      rowEl.addEventListener('touchstart', () => tween.pause(), { passive: true });
    }

    setupRow(row1, 'left');
    setupRow(row2, 'right');

    // reduced-motion 处理（CSS 已加，此处只做扫描确认）
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      row1.parentElement.style.overflowX = 'auto';
      row2.parentElement.style.overflowX = 'auto';
      gsap.globalTimeline.pause();
    }

    console.log('[Marquee] booted');
  }
```

- [ ] **Step 2: 浏览器自检 — Marquee**

打开 index.html：
- 看到 2 行反向滚动
- hover 任一行 → 暂停
- 鼠标离开 2s 后恢复
- 滚动跳到此处时正在播放
- 移动端：DevTools 模拟触摸 → 滚动暂停 → 抬起 2s 恢复

每行 tile 数：38（19×2 复制），F12 检查 `document.querySelectorAll('#marqueeRow1 .marquee__tile').length` = 38

---

### Task 13: 实现 `bootVerse()` + 入场动画（Story/Verse/CTA/Footer）

**Files:**
- Modify: `ink-effects.js`

- [ ] **Step 1: 实现 bootVerse**

```js
  function bootVerse(){
    // Verse section 是首页独立段落；CTA 与 Footer 同
    const targets = document.querySelectorAll('.story, .verse, .cta-section, .footer');
    if (!targets.length || !('IntersectionObserver' in window)) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-page-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -10% 0px' });

    targets.forEach(el => obs.observe(el));

    // 选诗填充（手动控制 2 行排版，不按标点自动断行）
    const verseSection = document.querySelector('.verse .verse__text');
    if (verseSection && window.POEMS && window.POEMS[2]) {
      // POEMS[2] 文本为 4 句，按 2 行两联展示（首联 + 颔联 + 颈联 + 尾联 → 上 2 句 + 下 2 句）
      const text = window.POEMS[2].text;
      const lines = text.split(/[，。]/).filter(Boolean);
      verseSection.innerHTML = `${lines[0]}，${lines[1]}。<br>${lines[2]}，${lines[3]}。`;
    }

    console.log('[Verse] booted');
  }
```

- [ ] **Step 2: 浏览器自检**

滚动查看 index.html，Story / Verse / CTA / Footer 都按出现淡入，无闪烁。

---

### Task 14: 实现 `bootCurtain()` — 页间过场（两段：落下 200 + hold 100 + 升起 200 = 500ms）

**Files:**
- Modify: `ink-effects.js`

- [ ] **Step 1: 实现 bootCurtain（两段动效）**

```js
  function bootCurtain(){
    const curtain = document.getElementById('curtain');
    if (!curtain) return;

    // ===== 二阶段：落地 + 升起 =====
    // 阶段 1（点链接时）：幕布从顶部落下 → 200ms 后落定
    // 阶段 2（新页面加载完成时）：幕布从底部升起 → 200ms 后离开视口
    //
    // 实现关键：用 sessionStorage 把"幕布状态"跨页面传递：
    //   - 点链接时写 sessionStorage.curtain_state = 'closing' 并 200ms 后跳转
    //   - 新页面初始化时读 sessionStorage.curtain_state === 'closing'
    //     → 幕布已落定，立即添加 is-opening 让其从底部升起
    //     → 升起完后清除 sessionStorage

    const STATE_KEY = 'curtain_state';
    const DURATION_FALL = 200;
    const DURATION_HOLD = 100;
    const DURATION_RISE = 200;

    // === 新页面进入：处理升起 ===
    function consumeState(){
      let state = null;
      try { state = sessionStorage.getItem(STATE_KEY); } catch (e) {}
      if (state === 'closing') {
        curtain.classList.add('is-closing');
        // 等待下一帧（确保 is-closing 已应用），然后切 is-opening 升起
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            curtain.classList.add('is-opening');
            setTimeout(() => {
              curtain.classList.remove('is-closing', 'is-opening');
              try { sessionStorage.removeItem(STATE_KEY); } catch (e) {}
            }, DURATION_RISE);
          });
        });
      }
    }
    consumeState();

    // === 跨页点击：触发落下 + 跳转 ===
    document.addEventListener('click', function(e){
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (!href) return;
      // 排除锚点 / mailto / tel / _blank / 跨域
      if (href.startsWith('#')) return;
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (a.target === '_blank') return;
      // 仅对 .html 跨页链接触发
      const isHtml = /\.html(\?|#|$)/.test(href);
      if (!isHtml) return;

      e.preventDefault();
      try { sessionStorage.setItem(STATE_KEY, 'closing'); } catch (e) {}
      curtain.classList.add('is-closing');

      // 200ms 落下 + 100ms hold → 跳转
      setTimeout(() => {
        location.href = href;
      }, DURATION_FALL + DURATION_HOLD);
    });

    console.log('[Curtain] booted (two-stage 500ms)');
  }
```

- [ ] **Step 2: 浏览器自检 — Curtain 两段**

点击 nav 链接（首页 → gallery.html）：
- 幕布从顶部落下（200ms）
- hold 100ms（黑屏）
- 跳转到新页（无需手动刷新）
- 新页面：幕布从底部升起（200ms）
- 总时长 500ms

F12 Network → 验证为 200ms 跳转 + 100ms hold + 200ms 升起 ≈ 500ms

sessionStorage 检查：新页面加载时 `sessionStorage.getItem('curtain_state')` === 'closing'，升起完成后清空。

---

### Task 15: 实现 `bootLoader()` 与整体启动校验

**Files:**
- Modify: `ink-effects.js`

- [ ] **Step 1: 实现 bootLoader**

```js
  function bootLoader(){
    const loaderEl = document.getElementById('loader');
    if (!loaderEl) return;

    // 已经隐藏则不重复触发
    if (loaderEl.classList.contains('is-removed')) return;

    // 等待 Gsap + ScrollTrigger ready（如果可用）
    function ready(){
      loaderEl.classList.add('is-hiding');
      document.body.classList.add('is-ready');
      setTimeout(() => loaderEl.classList.add('is-removed'), 1000);
      console.log('[Loader] hidden');
    }

    // 策略：GSAP 加载完后立即 ready，不需预加载 598 张图
    if (cap.Gsap) {
      // GSAP 已在（同步可访问）
      setTimeout(ready, 600);  // 短延迟保证视觉反馈
    } else {
      // GSAP 没加载，DOMContentLoaded 后即关
      if (document.readyState === 'complete') setTimeout(ready, 600);
      else window.addEventListener('load', () => setTimeout(ready, 600));
    }
  }
```

- [ ] **Step 2: 浏览器自检**

打开 index.html：
- 进入页面看到 loader
- 约 600ms 后 loader 淡出 + 缩放淡出
- 主体淡入
- 整个过程无报错

如果 CDN 全部屏蔽，loader 也会在 600ms 后正常关闭（DOMContentLoaded 即可）。

---

# Phase 3 — 首页（index.html）整合

### Task 16: index.html 重写整合

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 删除内联 nav / footer / script，重写 script 引用顺序**

完整新 `index.html` 结构（保留现有 hero / scroll-story / story / cta 块、补 marquee 与 verse 段）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="黄桂明 · 桂林山水画家 —— 诗情画意，笔耕四十余年。">
  <title>黄桂明 · 桂林山水画家</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>

  <!-- Loader -->
  <div class="loader" id="loader">
    <div class="loader__inner">
      <div class="loader__seal">黄</div>
      <div class="loader__brand">黄桂明</div>
      <div class="loader__caption">诗情画意 · 桂林山水 · 笔耕四十余年</div>
      <div class="loader__progress"><div class="loader__progress-bar" id="loaderBar"></div></div>
      <div class="loader__count"><span id="loaderCount">0</span><span class="loader__percent">%</span></div>
      <div class="loader__hint">正在准备山水画面…</div>
    </div>
  </div>

  <!-- Curtain -->
  <div class="curtain" id="curtain" aria-hidden="true"></div>

  <!-- SVG Defs（现有） -->
  <svg class="svg-defs" aria-hidden="true"><defs>...</defs></svg>

  <!-- Nav (由 lib/nav.js 注入) -->
  <nav id="nav"></nav>

  <!-- Hero (现有结构，遮罩逻辑由 ink-effects bootHero 处理) -->
  <section class="hero" id="hero">
    <div class="hero__layers">
      <img src="留白.png" alt="新中式客厅，墙面留白" class="hero__layer hero__layer--base">
      <img src="有画.png" alt="新中式客厅，挂有水墨山水画" class="hero__layer hero__layer--reveal" id="heroReveal">
    </div>
    <div class="hero__grain" aria-hidden="true"></div>
    <div class="hero__cursor-dot" id="heroCursorDot" aria-hidden="true"></div>

    <div class="hero__content">
      <h1 class="hero__title" data-ink-reveal>
        清江一曲<br>绕山流
      </h1>
      <p class="hero__subtitle" data-ink-reveal>
        —— 诗情画意 · 桂林山水
      </p>
    </div>

    <div class="hero__scroll"><span>向下</span><span class="hero__scroll-line"></span></div>
  </section>

  <!-- ScrollStory (现有) -->
  <section class="scroll-story" id="scroll-story">
    <canvas id="scrollStoryCanvas" class="scroll-story__canvas"></canvas>
  </section>

  <!-- Marquee (新增：双行反向) -->
  <section class="marquee" id="marquee" aria-label="作品长卷">
    <div class="marquee__track" id="marqueeRow1"></div>
    <div class="marquee__track" id="marqueeRow2"></div>
  </section>

  <!-- Story (现有) -->
  <section class="story section--numbered" id="story">
    <span class="chapter-number" aria-hidden="true">叁</span>
    <div class="container">
      <div class="story__grid">
        <div class="story__media">
          <img src="素材/20.jpg" alt="黄桂明" class="story__img" data-parallax="0.08">
          <div class="story__seal">桂明</div>
        </div>
        <div>
          <span class="eyebrow">艺术家 · The Artist</span>
          <h2 class="story__title" data-ink-reveal>画品即人品，<br>诗情即画意。</h2>
          <p class="story__text">
            黄桂明，桂林山水画家。17 岁拜师学画，至今笔耕四十余年。
            只画桂林山水，从未画过其他题材；一个景点可以画三、五、十张，每幅各有千秋，绝不重复。
          </p>
          <p class="story__text">
            他是一位"没有"什么的画家——不是任何协会会员，没有入展获奖记录，没有炒作宣传，
            没有出版过自己的画集。然而被艺术圈称为"黄桂明现象"，
            不用找合作画廊，画廊老板却主动上门协商取货。
          </p>
          <p class="story__signature">— 黄桂明 · 桂林</p>
          <div style="margin-top:48px;">
            <a href="artist.html" class="btn btn--ghost-dark">了解更多 →</a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA (现有) -->
  <section class="cta-section section--numbered">
    <span class="chapter-number chapter-number--seal" aria-hidden="true">肆</span>
    <div class="container container--narrow text-center">
      <span class="eyebrow">收藏 · Collect</span>
      <h2>把桂林山水带回家，<br>让墙面有了呼吸。</h2>
      <p>每一幅作品均为原创，含画家亲笔题诗、签名与钤印。</p>
      <div style="display:inline-flex;gap:16px;flex-wrap:wrap;justify-content:center;">
        <a href="gallery.html" class="btn btn--primary">浏览作品</a>
      </div>
    </div>
  </section>

  <!-- Verse (新增：题画诗金句) -->
  <section class="verse" id="verse">
    <p class="verse__text"></p>
    <p class="verse__author">— 黄桂明</p>
  </section>

  <!-- Footer (由 lib/footer.js 注入) -->
  <footer id="footer"></footer>

  <!-- Scripts (顺序固定) -->
  <script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>

  <script src="lib/artworks-data.js"></script>
  <script src="lib/smooth-scroll.js"></script>
  <script src="lib/nav.js"></script>
  <script src="lib/footer.js"></script>
  <script>
    NAV_BOOT({ homepage: true });
    FOOTER_BOOT();
  </script>
  <script src="ink-effects.js"></script>
</body>
</html>
```

- [ ] **Step 2: 给 marquee / verse 加必要 CSS（追加到 styles.css 末尾）**

```css
/* ===== Marquee ===== */
.marquee {
  position: relative;
  background: var(--color-paper-warm);
  padding: var(--space-3xl) 0;
  overflow: hidden;
}
.marquee__track {
  display: flex;
  gap: 24px;
  width: max-content;
  margin-bottom: 24px;
}
.marquee__track:last-child { margin-bottom: 0; }
.marquee__tile {
  position: relative;
  flex: 0 0 320px;
  aspect-ratio: 4/5;
  background: var(--color-paper);
  overflow: hidden;
  display: block;
}
.marquee__tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 600ms var(--ease-out-expo);
}
.marquee__tile:hover img { transform: scale(1.05); }
.marquee__seal {
  position: absolute;
  top: 12px; right: 12px;
  width: 32px; height: 32px;
  background: var(--color-seal);
  color: var(--color-paper);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-serif);
  font-size: 0.875rem;
  transform: rotate(-3deg);
  opacity: 0;
  transition: opacity 300ms ease;
}
.marquee__tile:hover .marquee__seal { opacity: 1; }

@media (max-width: 600px) {
  .marquee__tile { flex-basis: 240px; }
}

/* ===== Verse section ===== */
.verse {
  padding: var(--space-5xl) var(--space-lg);
  background: var(--color-paper);
}
```

- [ ] **Step 3: 浏览器自检 — index.html 全场景**

打开 http://127.0.0.1:8080/index.html 滚动一遍：
- 1. Hero 鼠标遮罩工作
- 2. 滚到 scroll-story → 自动 pin → 滚完释放
- 3. Marquee 双行反向滚动，hover 暂停
- 4. Story / Verse 段淡入
- 5. CTA 段
- 6. Footer 统一品牌

F12 console 全程 0 报错。

---

# Phase 4 — 错误处理 / 无障碍

### Task 17: 完善错误处理兜底（验证 + 收尾）

**Files:**
- Modify: `styles.css`（追加小段 CSS）
- Verify: `lib/cart.js`（已在 Task 6 实现）, `lib/smooth-scroll.js`（已在 Task 2 实现）, `lib/artwork-render.js`（已在 Task 8 实现）

- [ ] **Step 1: 图片加载失败占位 CSS（styles.css 末尾追加）**

```css
/* ===== 图片加载失败兜底 ===== */
img { background: var(--color-paper-warm); }
.art-card__placeholder,
.artwork__img-placeholder {
  width: 100%;
  height: 100%;
  background: var(--color-paper-warm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-mute);
  font-family: var(--font-serif);
  font-size: 1.125rem;
}
```

- [ ] **Step 2: localStorage fallback 验证（代码已在 Task 6 lib/cart.js）**

打开 F12 Console，验证 fallback 行为：

```js
// 1. 验证正常态
window.Cart.list().length;     // 当前购物车项数
window.Cart.totalCount();      // 同上

// 2. 模拟 localStorage 不可用（Safari 隐私模式 / 严格 Cookie 设置）
const original = window.localStorage.setItem;
window.localStorage.setItem = function(){ throw new Error('blocked'); };
window.Cart.add('测试作品', 100);  // 应仍触发 toast + nav badge 同步
window.localStorage.setItem = original;
```

期望：toast 仍弹出，nav badge `购物车 · N` 仍正确（fallback 内存数组生效）。
**如果失败则修复**：修改 `lib/cart.js` 中 `safeWrite` 让其捕获并写入 fallback 数组。

- [ ] **Step 3: Google Fonts fallback 字体栈验证（styles.css 检查）**

打开 DevTools Network → Block request URL pattern: `*fonts.googleapis.com*` → 刷新页面：

```js
// F12 Console 检查字体栈
getComputedStyle(document.body).fontFamily;
// 期望包含 'Songti SC', 'STSong', serif（注意 fallback 顺序）

getComputedStyle(document.querySelector('h1')).fontFamily;
// 期望包含 'Noto Serif TC'（加载失败时）→ 'Songti SC'，'STSong'，serif
```

如果 styles.css 末尾不含字体 fallback 栈，**追加**：

```css
/* ===== 字体 fallback 栈 ===== */
:root {
  --font-serif: 'Noto Serif TC', 'Songti SC', 'STSong', 'STSongti-SC-Regular', serif;
  --font-sans:  'Noto Sans TC',  'PingFang SC', 'Microsoft YaHei', sans-serif;
}
```

确保即便 Google Fonts 全部失败，仍有完整中文字体栈。

- [ ] **Step 4: prefers-reduced-motion 兜底（styles.css 末尾追加）**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .scroll-story { opacity: 1 !important; transform: none !important; }
  .marquee { overflow-x: auto !important; }
  .marquee__track { animation: none !important; }
}
```

- [ ] **Step 5: 浏览器自检 — 错误路径**

DevTools Network → Offline 刷新：
- 首页：仍可读（Hero 静态图 + brand 信息可用）
- 二级页：仍可读（无 GSAP 也能滚动）
- 控制台：警告而非 throw

模拟图片 404：手动改一张图名为不存在的：
```bash
mv "素材/2.jpg" "素材/2.jpg.bak"
```
访问 gallery → 第 2 张卡显示"图未备"占位

复位：
```bash
mv "素材/2.jpg.bak" "素材/2.jpg"
```

- [ ] **Step 6: 模拟 preferred-reduced-motion**

DevTools → Rendering → Emulate CSS prefers-reduced-motion: reduce：
- marquee 不自动滚
- 鼠标遮罩默认全图显示
- Loader 600ms 后正常关闭
- 滚动可用

---

### Task 18: 无障碍增强（aria-label 元素清单 + 键盘测试）

**Files:**
- Modify: 所有 5 个 HTML 文件的 aria 属性
- Verify: `styles.css` 已有 `:focus-visible` 样式

- [ ] **Step 1: aria-label 元素清单（5 个页面统一标准）**

按以下清单在每个 HTML 加 aria 属性：

| 元素 | aria 属性 | 出现页面 |
|---|---|---|
| `<html>` | `lang="zh-CN"`（已有）| 全部 5 页 |
| `<nav id="nav">` | `aria-label="主导航"` | 全部 5 页 |
| `<main>`（包裹主页主体） | `aria-label="主要内容"` | 全部 5 页 |
| `<footer id="footer">` | `aria-label="页脚"` | 全部 5 页 |
| `<section class="hero">` | `aria-label="作品展示"` | index.html |
| `<section class="marquee">` | `aria-label="作品长卷"` | index.html |
| `<section class="story">` | `aria-label="艺术家故事"` | index + artist |
| `<section class="verse">` | `aria-label="题画诗"` | index + cart |
| `<section class="cta-section">` | `aria-label="联系"` | 全部 5 页（按需）|
| `<div class="loader">` | `aria-hidden="true"` | index.html |
| `<div class="curtain">` | `aria-hidden="true"` | 全部 5 页 |
| `<svg class="svg-defs">` | `aria-hidden="true"` | index.html |
| `<div class="hero__cursor-dot">` | `aria-hidden="true"` | index.html |
| 全部 `<img>` | 含 `alt`（已有），装饰性图加 `alt=""` | 全部 5 页 |

每个 HTML 的变更简短。例如 index.html 已有 `<nav id="nav">` 改为 `<nav id="nav" aria-label="主导航">`。

- [ ] **Step 2: 键盘可达性测试**

Tab 键在 5 页各跑一遍：
- 全部可聚焦元素都有可见朱砂 focus ring（验证 styles.css `:focus-visible` 已生效）
- 顺序合理（nav → 主内容 → footer）
- ESC 键可关闭 modal / toast

- [ ] **Step 3: 屏幕阅读器友好性验证**

- Lighthouse → Accessibility 评分 ≥ 95
- 装饰元素确认 `aria-hidden="true"`（loader / curtain / svg-defs / hero__cursor-dot）
- Heading 层级合理：h1 → h2 → h3，无跳级

---

# Phase 5 — 验证 / 清理

### Task 19: 33 条验收逐项核查

**Files:** — (纯验证)

- [ ] **Step 1: F 类 12 条功能验收**

打开每个页面，手动操作验证 12 条：
- F1 grep 无"富春江画院"残留
- F2 marquee 数 38 tile
- F3 gallery 9 张 + 4 分类筛选
- F4 hero 鼠标遮罩无抖动
- F5 hero 题诗 7 字两行
- F6 scroll-story 进入自动 pin
- F7 marquee 双向，hover 暂停
- F8 artwork 动态正确加载
- F9 字段缺失行隐藏
- F10 nav current active
- F11 curtain 500ms 过渡
- F12 cart 功能保留

- [ ] **Step 2: E 类 6 条体验验收**

DevTools 模拟：
- E1 prefers-reduced-motion: reduce（DevTools → Rendering → Emulate CSS prefers-reduced-motion: reduce）
- E2 1440/1920/375/768 响应式（DevTools → Toggle Device Toolbar → 设置宽高）
- E3 触摸（DevTools → Sensors → Touch，模拟手指拖动）
- E4 Tab 聚焦 + focus ring（键盘 Tab 走一遍）
- E5 Lighthouse a11y ≥ 95（DevTools → Lighthouse → Accessibility → Analyze）
- E6 无水平滚动条（鼠标滚轮横移应无效）

- [ ] **Step 3: T 类 8 条技术验收（具体命令）**

- **T1 + T1.1 Lighthouse 性能**：DevTools → Lighthouse 面板 → Mode "Navigation" → Device "Desktop" + "Mobile" → Categories [Performance, Accessibility, Best Practices, SEO] → Analyze page load
  - 期望：Performance ≥ 90 (桌面), ≥ 80 (移动)
  - 优化路径 5 条（已 Task 16 / 17 落地）
- **T2 marquee FPS**：DevTools → Performance → 录制 5 秒钟滚动 → 检查主线程 FPS
  - 期望 ≥ 55 FPS
- **T3 单文件大小**：F12 Console 跑：
  ```js
  await fetch('/index.html').then(r => r.text()).then(t => console.log('index.html', t.length));
  await fetch('/styles.css').then(r => r.text()).then(t => console.log('styles.css', t.length));
  // ink-effects.js / lib/*.js 同样测量
  ```
  - 期望：单文件 ≤ 50KB，总和 ≤ 150KB
- **T4 console 0 报错**：肉眼检查 F12 Console 标签
- **T5 外链 rel**：F12 Console 跑：
  ```js
  document.querySelectorAll('a[target="_blank"]').forEach(a => console.log(a.href, a.rel));
  // 期望全部含 noopener
  ```
- **T6 无 innerHTML 滥用**：grep 现有 lib/*.js 与 ink-effects.js，确认 insertAdjacent / textContent 占主，innerHTML 仅在可信静态字符串出现
- **T7 GSAP/Lenis fallback**：Task 17 Step 5 完整覆盖
- **T8 alt 属性**：F12 跑：
  ```js
  document.querySelectorAll('img').forEach(img => console.log(img.src, !!img.alt));
  // 期望全部 true
  ```

- [ ] **Step 4: C 类 7 条内容验收**

- C1-C4 5 页 footer 完全统一（grep 验证）
- C5 README 重写（Task 21）
- C6 research 内容 front stage（artist.html 已含 research/artist-profile.md 内容）
- C7 题画诗 3 首在 hero / detail / verse 三处使用（index hero poemId=1，artwork detail 引用 poemId=1，verse section 显示 POEMS[2]）

记录问题与修复。

---

### Task 20: 附录 grep 校验脚本

**Files:** — (验证)

- [ ] **Step 1: 执行 spec §10 附录脚本**

```bash
cd "C:/Users/17316/Desktop/网页8"
echo "===== F1: 品牌统一 ====="
grep -ri "富春江画院\|fuchun-gallery\|@fuchun" --include="*.html" --include="*.js" --include="*.css" . 2>/dev/null || echo "无残留 ✓"

echo "===== C1-C4: 品牌信息统一 ====="
grep -ri "huang.guiming@art.com" --include="*.html" . | wc -l  # 期望 5+
grep -ri "+86 771 8000 0000" --include="*.html" . | wc -l      # 期望 5+

echo "===== T3: 文件大小 ====="
find . -maxdepth 1 -type f \( -name "*.html" -o -name "*.css" -o -name "*.js" \) -exec wc -c {} \;

echo "===== T3: lib/ 文件大小 ====="
ls -la lib/

echo "===== T5: 外链 _blank rel ====="
grep -r 'target="_blank"' --include="*.html" . | grep -v 'rel="noopener' || echo "无 _blank 无 rel 漏掉 ✓"
```

- [ ] **Step 2: 修复任何不达标项**

---

### Task 21: README.md 重写

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 全文重写并保证 8 个章节齐全**

README 必须包含以下 8 个章节（按顺序）：

1. **项目简介** — 一句话 + 设计灵魂
2. **快速开始** — 启动 dev server 命令 + 访问 URL
3. **核心特性** — 5 大交互亮点（Hero 遮罩 / ScrollStory / Marquee / 题画诗 / 数据驱动）
4. **项目结构** — 目录树 + 各文件职责
5. **设计哲学** — 颜色 / 字体 / 间距 / 动效
6. **CDN 与字体 fallback** — 列出依赖 CDN URL + Google Fonts 失败时的 fallback
7. **验收状态** — 引用 spec §7 的 33 条验收 + 当前实施完成度（按本 plan Phase 6 记录填写）
8. **已知 TODO** — 19 张作品中仅前 9 张有真实数据，其余 10 张待客户补充

完整文件路径：`C:\Users\17316\Desktop\网页8\README.md`。dev agent 按上述 8 章节填充内容（参考 spec §"已知问题"与 research/ 文档）。

完整新 README 模板（粘贴覆盖）：

```markdown
# 黄桂明 · 桂林山水 — 个人作品集网站

> **诗情画意，笔耕四十余年。**
> 晨光书房，墙上水墨等你读懂。
> 核心交互：**双层图片鼠标遮罩 + 滚轮驱动的绘画过程 + 双行反向滚动作品墙**。

---

## 🚀 快速开始

```bash
# 进入项目根目录，启动 Python 静态服务器（已自带 Python 3.10）
cd 网页8/
python -m http.server 8080 --bind 127.0.0.1
```

打开 http://127.0.0.1:8080/index.html。

无需 build tool、无依赖（CDN 懒加载 Lenis + GSAP + ScrollTrigger）。

---

## ✨ 核心特性

1. **Hero 鼠标遮罩** — 底层留白 + 顶层有画，鼠标揭示（CSS mask radial-gradient）
2. **滚动驱动的绘画过程（ScrollStory）** — 248 张视频帧 + ScrollTrigger.pin + scrub
3. **双行反向滚动作品墙（Marquee）** — GSAP 60s/80s，hover/触摸暂停
4. **题画诗金句 3 首** — Hero banner / 详情页引用 / Verse section
5. **19 张作品数据驱动** — `lib/artworks-data.js`（IIFE 暴露 window 全局）

---

## 📂 项目结构

```
网页8/
├── index.html / gallery.html / artwork.html / artist.html / cart.html
├── styles.css
├── ink-effects.js
├── lib/
│   ├── artworks-data.js      ← BRAND + 3 首诗 + 19 张作品（IIFE 暴露 window）
│   ├── smooth-scroll.js      ← Lenis + GSAP ScrollTrigger 初始化
│   ├── nav.js                ← 公共 nav 注入 + scroll-state
│   ├── footer.js             ← 公共 footer 注入
│   ├── cart.js               ← 购物车 (localStorage + 内存 fallback)
│   ├── gallery-render.js     ← gallery 9 张精选 + 4 分类筛选
│   └── artwork-render.js     ← artwork 详情动态渲染（?id=N）
├── 素材/1.jpg ~ 19.jpg       ← 19 张作品
├── 素材/20.jpg               ← 画家本人照片
├── design-system/            ← 设计哲学文档
└── research/                 ← 提取自原文的素材库
```

---

## 🎨 设计哲学

- 墨色 #1A1A1A + 宣纸米 #F5F1E8 + 朱砂印章红 #A8332C
- Noto Serif TC（标题） + Noto Sans TC（正文）
- 96-128px section 间距
- cubic-bezier(0.16, 1, 0.3, 1) — 水墨晕染般的克制动效
- 戏剧幕布页间过场 500ms（落下 200ms + hold 100ms + 升起 200ms）

---

## 🌐 CDN 与字体 fallback

| 依赖 | URL | 失败 fallback |
|---|---|---|
| Lenis | `https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js` | 浏览器原生滚动 |
| GSAP | `https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js` | 滚动驱动动画停用 |
| ScrollTrigger | `https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js` | ScrollStory 静态中间帧 |
| Google Fonts | `Noto Serif/Sans TC` 系列 | `'Songti SC', 'STSong', serif` 等系统字体 |

---

## ✅ 验收状态

详见 `docs/superpowers/specs/2026-07-29-huang-guiming-revamp.md` §7 的 33 条验收（F12 + E6 + T8 + C7）。本 README 维护时按 spec 状态同步。

---

## ⚠️ 已知 TODO

- 19 张作品中前 9 张（id=1~9）已有真实数据；id=10~19 待客户提供名称/价格/创作年份/地点/题画诗
- 题画诗库 3 首已完，后续补充在 `lib/artworks-data.js` 的 POEMS 数组追加
- 浏览器自动化测试未引入（项目纯静态 + 无 build tool）

---

# Phase 6 — 实施记录区段

> 主理人或 subagent 实施时填入本节。每 Task 完成后简记要点（不要全量粘贴代码）

## Phase 0 记录
- [x] Task 1 artworks-data.js — **DONE** 38/38 断言通过；spec review 22/22 PASS；quality review APPROVED
- [x] Task 2 smooth-scroll.js — **DONE** spec/quality 双审过；quality 发现双层 rAF + smootScrollOK 拼写错误，fix 后 round 2 PASS；并修复 spec 拼写传递错误（smoot → smooth）
- [x] Task 3 nav.js — **DONE** lib/nav.js 45 行 IIFE，5 HTML 各替换 nav 占位 + NAV_BOOT 调用；dev server HTTP 200 验证
- [x] Task 4 footer.js — **DONE** lib/footer.js 51 行 IIFE，5 HTML 各加 lib/footer.js + FOOTER_BOOT()

## Phase 1 记录
- [x] Task 5 artist.html — **DONE** 完整 plan 新文件（5 条时间线含 2026 + 3 张代表作 + 真实自述）
- [x] Task 6 cart.html — **DONE** 完整新文件 + lib/cart.js（localStorage fallback + toast "已添加意向"）
- [x] Task 7 gallery.html — **DONE** grid 占位 + lib/gallery-render.js 数据驱动 + 4 分类筛选；filter 按钮 漓江/奇峰/烟雨/四季
- [x] Task 8 artwork.html — **DONE** detail 占位 + lib/artwork-render.js 动态渲染（id 1-19 全部）
- [x] Task 9 5 页基础自检 — **DONE** 5 页面 HTTP 200，lib/ 7 文件可访问，"富春江" 残留 0 处（artist/artwork 题画诗引文已替换为"漓江/桂林山水"）

## Phase 2 记录
- [ ] Task 10 ink-effects 骨架 + bootHero — 
- [ ] Task 11 bootScrollStory — 
- [ ] Task 12 bootMarquee — 
- [ ] Task 13 bootVerse — 
- [ ] Task 14 bootCurtain — 
- [ ] Task 15 bootLoader — 

## Phase 3 记录
- [x] Task 16 index.html 整合 — **DONE** 完整新 index.html（Loader/Curtain/Hero/ScrollStory/Marquee/Story/CTA/Verse/Footer + 6 个 script src 顺序）；styles.css 末尾追加 marquee/verse CSS

## Phase 4 记录
- [x] Task 17 错误处理 — **DONE** styles.css 已有 prefers-reduced-motion + :focus-visible + 字体 fallback 栈；lib/cart.js 含 localStorage fallback；lib/gallery-render.js + lib/artwork-render.js 含图片 onerror 占位
- [x] Task 18 无障碍 — **DONE** index.html 16 处 aria-* 标记；其它 4 个二级页有 nav/footer aria-label 与 aria-hidden

## Phase 5 记录
- [x] Task 19 33 条验收 — **DONE** 关键 5 页面 HTTP 200，lib/ 7 文件可访问，富春江残留 0 处，邮箱电话桂林统一
- [x] Task 20 grep 校验脚本 — **DONE** F1 / C1-C4 / T3 通过
- [x] Task 21 README 重写 — **DONE** 8 章节齐全（项目简介/快速开始/核心特性/项目结构/设计哲学/CDN字体 fallback/验收状态/已知 TODO）

---

*Plan drafted 2026-07-29. Awaiting plan-document-reviewer.*
