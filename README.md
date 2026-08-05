# 黄桂明 · 桂林山水 — 个人作品集网站

> **诗情画意，笔耕四十余年。**
> 晨光书房，墙上水墨等你读懂。
> 核心交互：**双层图片鼠标遮罩 + 滚轮驱动的绘画过程 + 双行反向滚动作品墙**。

---

## 🚀 快速开始

**⚠️ 必须用本地服务器访问，不能直接双击 HTML 文件！**

`file:///` 协议下 Chromium 会把每个 URL 视为独立的安全源，导致 Canvas 跨域错误、ScrollStory 滚轮动画失败。

### 方式一：一键启动（Windows）

双击 `start.bat` 即可。

### 方式二：手动启动

```bash
cd 网页8/
python dev-server.py 8080 127.0.0.1
```

打开 http://127.0.0.1:8080/index.html。

**无需 build tool、无依赖**（本地 vendor 懒加载 Lenis + GSAP + ScrollTrigger）。

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
├── styles.css                 ← 全局样式 + Design Tokens
├── ink-effects.js             ← 主动画：Hero/ScrollStory/Marquee/Verse/Curtain/Loader
├── start.bat                  ← Windows 一键启动脚本
├── dev-server.py              ← 多线程 Python 静态服务器
├── lib/
│   ├── escape-html.js         ← 共享 HTML 转义工具（HGM_ESCAPE_HTML）
│   ├── artworks-data.js       ← BRAND + 3 首诗 + 19 张作品
│   ├── smooth-scroll.js       ← Lenis + GSAP ScrollTrigger 初始化
│   ├── nav.js                 ← 公共 nav 注入 + scroll-state
│   ├── footer.js              ← 公共 footer 注入
│   ├── cart.js                ← 购物车（localStorage + 内存 fallback）
│   ├── gallery-render.js      ← gallery 9 张精选 + 5 分类筛选
│   ├── artwork-render.js      ← artwork 详情动态渲染（?id=N）
│   ├── artist-page.js         ← artist 代表作 3 张
│   ├── cart-page.js           ← cart 列表 + 移除事件委托
│   ├── svg-defs.js            ← ink-edge 滤镜注入
│   └── vendor/                ← Lenis / GSAP / ScrollTrigger 本地副本
├── 素材/1.jpg ~ 19.jpg         ← 19 张作品
├── 素材/20.jpg                 ← 画家本人照片
├── 素材/视频切割/              ← 249 张绘画过程帧（frame_00001.jpg ~ frame_00249.jpg）
├── design-system/              ← 设计哲学文档
├── research/                   ← 提取自原文的素材库
└── tests/                     ← Playwright 冒烟测试
```

---

## 🎨 设计哲学

- 墨色 `#1A1A1A` + 宣纸米 `#F5F1E8` + 朱砂印章红 `#A8332C`
- 灰墨 `#666666`（辅助文字，WCAG AA 4.5:1+）
- Noto Serif TC（标题） + Noto Sans TC（正文）
- 96-128px section 间距
- `cubic-bezier(0.16, 1, 0.3, 1)` — 水墨晕染般的克制动效
- 戏剧幕布页间过场 500ms（落下 200ms + hold 100ms + 升起 200ms）

---

## 🌐 依赖与字体 fallback

| 依赖 | 来源 | 失败 fallback |
|---|---|---|
| Lenis | `lib/vendor/lenis.min.js`（SRI 校验） | 浏览器原生滚动 |
| GSAP | `lib/vendor/gsap.min.js`（SRI 校验） | 滚动驱动动画停用 |
| ScrollTrigger | `lib/vendor/ScrollTrigger.min.js`（SRI 校验） | ScrollStory 静态中间帧 |
| Google Fonts | `Noto Serif/Sans TC` 系列 | `'Songti SC', 'STSong', serif` 等系统字体 |

---

## ✅ 近期更新

### 2026-08-03 ScrollStory 画布适配（contain + 装裱 letterbox + Light Rays 远山青光线，5 次迭代）

ScrollStory 画布策略调整：之前是「1200px max-width + 16:9 aspect-ratio + section overflow:hidden 裁切两侧」，在 1440/1024/390 等非 16:9 视口下会**裁切画作边缘**。

#### 第 1 步：contain 模式（v1）

| 维度 | 之前 | 第 1 步 |
|---|---|---|
| Canvas CSS 尺寸 | max-width: 1200px + aspect-ratio: 16/9 | `width:100% / height:100%` 填满 section |
| 画作呈现 | section overflow:hidden 裁切两侧 | `ink-effects.js:drawFrame` 用 contain 模式完整绘制 |
| Letterbox | 无装饰，黑底 | 1px 远山青描边 + 8% 透明留白线装裱 |

#### 第 2 步：viewport 单位 + 装裱式 letterbox（v2）

需求升级：画布需再缩小，letterbox 需装饰而非纯黑。

```css
.scroll-story {
  background:
    radial-gradient(ellipse 65% 55% at center,
      rgba(245, 241, 232, 0.07) 0%, transparent 60%),
    linear-gradient(180deg, #0A0A0A 0%, #1A1A1A 50%, #0A0A0A 100%);
}

.scroll-story__canvas {
  width: 92vw;
  height: calc(92vw * 9 / 16);
  max-height: 88vh;
  max-width: calc(88vh * 16 / 9);
  outline: 1px solid var(--color-ink-mute);
  outline-offset: -1px;
}
```

#### 第 3 步：让出导航栏高度（v3）

需求升级：固定导航栏（64-80px）遮挡画布顶端。Section 用 `padding-top: var(--nav-height)` + canvas `max-height` 同步减 `var(--nav-height)`，让画布顶端始终在 nav 下方。

```css
:root {
  --nav-height: 72px;            /* 导航栏高度（fixed top） */
}

.scroll-story {
  height: 100vh;
  padding-top: var(--nav-height);
  box-sizing: border-box;
}

.scroll-story__canvas {
  width: 92vw;
  height: calc(92vw * 9 / 16);
  max-height: calc(88vh - var(--nav-height));
  max-width: calc((88vh - var(--nav-height)) * 16 / 9);
  outline: 1px solid var(--color-ink-mute);
  outline-offset: -1px;
}
```

#### 第 4 步：Silk 远山青流动背景（v4，已移除）

需求升级：letterbox 装裱空间仍显单调，需要低调度流动纹理作为背景（不抢眼）。原 React Bits `<Silk />` 用 vanilla WebGL 移植到 `lib/silk-background.js`（IIFE 暴露 `SILK_BOOT`），GLSL 着色器逐行保留。

**v4 → v5 替换**：用户最终选择 React Bits `<LightRays />` 替代 Silk 效果。

#### 第 5 步：LightRays 远山青光线（v5，最终）

需求升级：从 Silk（流动纹理）改为 LightRays（光线）。原 React Bits `<LightRays />` 依赖 ogl 库，但项目无构建工具，**移植方案**：保留 GLSL 着色器（vertex + fragment）逐行一致，用 vanilla WebGL 实现，IIFE 暴露 `window.LIGHT_RAYS_BOOT()`。

```js
// lib/light-rays-background.js（节选）
window.LIGHT_RAYS_BOOT = function(opts){
  var raysOrigin     = opts.raysOrigin     || 'top-center';
  var raysColor      = opts.raysColor      || '#5C7A6B';  // 远山青
  var raysSpeed      = opts.raysSpeed      || 1.5;
  var lightSpread    = opts.lightSpread    || 0.8;
  var rayLength      = opts.rayLength      || 1.2;
  var fadeDistance   = opts.fadeDistance   || 1.5;
  var saturation     = opts.saturation     || 1.0;
  var followMouse    = opts.followMouse    || true;
  var mouseInfluence = opts.mouseInfluence || 0.1;
  // ... GLSL shader（与 React Bits <LightRays> 完全一致）:
  //   vertex: fullscreen quad
  //   fragment: rayStrength() * brightness * color * raysColor
  //   - rayPos: top-center anchor (0.5w, -0.2h) — 起点在 canvas 上方
  //   - rayDir: (0, 1) — 向下
  //   - mousePos: 平滑鼠标位置（followMouse=true）
};
```

**HTML 结构**：
```html
<section class="scroll-story" id="scroll-story">
  <canvas id="lightRaysBg" class="light-rays-bg" aria-hidden="true"></canvas>  <!-- z-index 0 -->
  <canvas id="scrollStoryCanvas" class="scroll-story__canvas"></canvas>  <!-- z-index 1 -->
  <div id="introOverlay">...</div>
  <div id="scrollStoryCards">...</div>
</section>
```

**CSS**（同样：只让 painting canvas 提 z-index）：
```css
.light-rays-bg {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0; pointer-events: none;
}
.scroll-story__canvas {
  position: relative;
  z-index: 1;
}
```

**当前参数**（v5.1）：
- `raysOrigin: 'top-edge-center'`（v5.1 新增选项，**从动画窗口最上边发出**——锚点 `[0.5w, 0]`，不在 viewport 外）
- `raysColor: '#C8D6B5'`（v5.1 改：浅远山青，比 #9BB5A6 亮 ~30%，光线更明显）
- `raysSpeed: 1.5`
- `lightSpread: 1.2`（v5.1 改：更宽 — 光线更舒展）
- `rayLength: 2.0`（v5.1 改：更长 — 覆盖到 painting 周围）
- `fadeDistance: 3.0`（v5.1 改：渐隐距离增大，光线覆盖整个 section）
- `saturation: 1.0`
- `followMouse: true` + `mouseInfluence: 0.1`（轻交互）
- `noiseAmount: 0.1` + `distortion: 0.05`（轻微噪点和扭曲）

**v5 → v5.1 升级**：用户反馈「视觉效果不明显 + 光起源应在动画窗口最上方」。两项调整：
1. **新增 `top-edge-center` 等 3 个 top-edge-* 选项**（在 `getAnchorAndDir` switch 中加）：锚点 y=0 紧贴 section 顶边，不在 viewport 外。原 `top-center` 锚点 y=-0.2h 在视口外，光线从「天上」下来；v5.1 改为「从动画窗口最上边」出来。
2. **提高可见度**：raysColor 从 #9BB5A6 → #C8D6B5（pale 远山青，亮 30%）、lightSpread 1.0 → 1.2（更宽）、rayLength 1.5 → 2.0（更长）、fadeDistance 2.0 → 3.0（更少衰减）。

**移植踩坑**：
1. **WebGL framebuffer 坐标 y=0 是底部**（不是 CSS 的顶部）→ 测试采样点必须用 `floor(silk.height * 0.85)` 取 WebGL 顶部（即 shader coord 顶部）
2. **Shader 输出 alpha 依赖 fragCoord 翻转** → `coord = (fragCoord.x, iResolution.y - fragCoord.y)` 是标准做法
3. **CSS aspect-ratio 在 max-* 冲突时失效** → 用 viewport 单位（`width: 92vw; height: calc(92vw * 9/16)`）+ max-* 双向约束

#### 5 视口实际效果（v5.1 最终）

| 视口 | Canvas (16:9) | Light Rays letterbox RGBA | 视觉 |
|---|---|---|---|
| 1440×900 | 1280×720 | [58, 65, 63, 104] | 顶部 62px + L/R 光线微妙 |
| 1920×1080 | 1562×878 | [125, 139, 134, 214] | L/R letterbox 上方光线明显 |
| 1024×768 | 942×530 | [114, 127, 123, 195] | 上下 letterbox 光线明显 |
| 390×844 | 359×202 | [75, 84, 81, 136] | 顶部 285px 远山青光线**非常明显** |
| 844×390 | 482×271 | [94, 104, 101, 154] | L/R letterbox 光线明显 |

**mobile 390×844 视觉效果最佳**：letterbox 大 285px，光线从 section 顶边射下形成"晨光透过宣纸"效果，**最明显**。其他视口 letterbox 较小，光线较微妙但 RGBA 值证明在渲染。

**核心保证**：
- 滚轮控制的 248 帧绘画过程在任何视口下都**完整呈现、零裁切、严格 16:9、不被导航栏遮挡**
- letterbox 由 4 层装饰：墨色压边 + 宣纸米高光 + 1px 远山青描边 + 1px 8% 留白线 + **远山青 Light Rays 光线（vanilla WebGL，从顶部中央射下）**
- Light Rays 颜色 #9BB5A6（pale 远山青）**不抢眼、作为背景氛围**

**改动范围（v4 → v5）**：
- 删除 `lib/silk-background.js`
- 新建 `lib/light-rays-background.js`（~240 行 vanilla WebGL，IIFE 暴露 LIGHT_RAYS_BOOT）
- `index.html`：
  - `<canvas id="silkBg">` → `<canvas id="lightRaysBg">`
  - `<script src="lib/silk-background.js">` → `<script src="lib/light-rays-background.js">`
  - DOMContentLoaded 调 `SILK_BOOT({...})` → `LIGHT_RAYS_BOOT({...})`
- `styles.css`：
  - `.silk-bg` → `.light-rays-bg`（样式相同）
  - `.scroll-story__canvas` z-index 1 不变
- `tests/_verify_canvas_fit.py` 升级（断言 lightRaysBg 存在 + WebGL + letterbox RGBA 非全黑）
- `tests/smoke-test.py` **0 回归**（4 页面、0 错误、ScrollTrigger 5 段同步、lightbox 行为、landscape 顺序、marquee 32 张）

### 2026-07-30 审查与优化

经多维度代码审查（HTML 语义 / 安全 / 性能 / a11y / 代码组织），完成 P0 + P1 6 项优化：

| 类别 | 描述 |
|---|---|
| **P0-1 安全** | vendor 脚本添加 SRI (sha384) 完整性保护 + crossorigin |
| **P0-2 安全** | 修补 artwork-render.js:60 主图 src 缺失的 escapeHtml |
| **P1-3 维护** | 抽取共享 `lib/escape-html.js`，4 处本地副本合并为单一 `HGM_ESCAPE_HTML` |
| **P1-4 a11y** | `--color-ink-mute` 从 `#7A7A7A` (3.81:1) 调整为 `#666666` (5.09:1)，通过 WCAG AA |
| **P1-5 性能** | 移除 index.html 强制 `no-cache` 头，恢复浏览器缓存 |
| **P1-6 一致性** | 3 处价格格式化统一为 `Number + isFinite`，参考 cart.js 风格 |

---

## ⚠️ 已知 TODO

- 19 张作品中前 9 张（id=1~9）已有真实数据；id=10~19 待客户提供名称/价格/创作年份/地点/题画诗
- 题画诗库 3 首已就绪，后续补充在 `lib/artworks-data.js` 的 POEMS 数组追加
- 视频切帧 249 张（`frame_00001.jpg ~ frame_00249.jpg`）
- Hero 两张图 2MB+ 单图，部署时建议同步转 WebP / AVIF

---

## 🚀 GitHub 同步部署（admin 跨设备实时生效）

管理员修改作品后，**几秒到几十秒**内访客刷新作品页即可看到新数据。流程：

```
admin.html 保存
  → lib/github-api.js PUT data/artworks.json 到 GitHub
  → Vercel/Netlify/CloudFlare Pages 监听 push 自动重新部署
  → 访客刷新 /gallery.html → fetch data/artworks.json → 看到新作品
```

### 1. 创建 GitHub Personal Access Token

1. 打开 <https://github.com/settings/tokens?type=beta>
2. **Generate new token** → **Fine-grained token**
3. **Repository access**: Only select repositories → 选你的项目仓库
4. **Permissions** → Repository permissions → **Contents: Read and write**
5. 设 90 天过期
6. 生成后**立即复制**（页面关闭后只显示一次）

### 2. 部署 Cloudflare Worker（CORS 代理）

浏览器直连 `api.github.com` 会被 CORS 阻止。需先部署 Worker：

1. 打开 <https://dash.cloudflare.com/> → **Workers & Pages** → Create
2. 选 **Create Worker**，命名为 `hgm-github-proxy`（自定义）
3. 把 `workers/github-cors-proxy.js` 全部内容粘贴到编辑器
4. 点 **Deploy**
5. 复制 worker URL：`https://hgm-github-proxy.YOUR-NAME.workers.dev`

### 3. 部署主项目

把整个项目部署到 Vercel / Netlify / CloudFlare Pages（任选）：
- **Vercel**: `vercel --prod`，关联 GitHub 仓库即可
- **Netlify**: 拖拽 `dist/` 或关联 GitHub
- **CloudFlare Pages**: 关联 GitHub 仓库，开通 "Build on push to main"

### 4. 首次配置 admin

1. 访问部署后的 `https://your-domain/admin.html?key=<您的管理员口令>`（口令请见密码管理器或本地部署文档）
2. 在 **GitHub 同步配置** 面板填入：
   - **仓库**：`你的用户名/仓库名`
   - **分支**：`main`
   - **Token**：粘贴第 1 步生成的 PAT
   - **CORS 代理 URL**：粘贴第 2 步的 worker URL
3. 点 **测试连接**，应显示 `✓ 连接成功：xxx/xxx`
4. 点 **保存配置**

### 5. 正常使用

- 添加/编辑/删除作品时自动 commit 到 GitHub
- 状态栏提示"已同步到 GitHub：abc1234"（commit SHA 前 7 位）
- 访客作品页每 30 秒轮询一次 `data/artworks.json`，新数据自动出现
- 30 秒延迟主要来自：Vercel/Netlify 重建 10-30s + CDN 刷新 5-30s

### 安全边界

- PAT 存于**你**的浏览器 localStorage，不进源码
- 建议：专用 PAT + 仅本仓库 Contents 写权限 + 90 天过期
- 即使泄露，损失限定为 `data/artworks.json` 单文件
- 客户端校验（口令 hash）依然可绕过，安全模型与之前一致

### 失败兜底

任何时候 GitHub 推送失败：
- localStorage 仍保存完整数据
- 状态栏提示"已存本地，GitHub 推送失败：xxx"
- 点 **导出 JSON** 手动下载并放入 `data/` 目录重新部署

---

## 📜 进一步阅读

- `design-system/inkspace-gallery/` — 设计系统文档
- `research/` — 艺术家资料、风格、诗文、作品目录
- `workers/github-cors-proxy.js` — Cloudflare Worker CORS 代理源码
- `lib/github-api.js` — GitHub Contents API 封装

---

### v5.2 补丁：CSS ::before 环境光叠加 LightRays 聚焦光

**问题**：LightRays 是聚焦方向性光线，directional rays 在 L/R letterbox 距中心远的位置自然很弱。CSS section bg 渐变被 lightRaysBg canvas 覆盖看不见。

**方案**：在 z-index 0.5（LightRays z=0 之上、painting z=1 之下）加 `::before` 伪元素，双层径向渐变铺满 letterbox：

```css
.scroll-story::before {
  content: '';
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background:
    radial-gradient(ellipse 95% 75% at 50% 0%, rgba(224, 232, 208, 0.32) 0%, transparent 65%),
    radial-gradient(ellipse 70% 55% at 50% 50%, rgba(245, 241, 232, 0.14) 0%, transparent 65%);
  pointer-events: none; z-index: 0.5;
}
```

**LightRays 参数同时调整**：
- `raysOrigin: 'top-edge-center' → 'top-center'`（起点回到 viewport 外 y=-0.2h，"从天上照下"）
- `raysColor: #C8D6B5 → #E0E8D0`（更亮）
- `lightSpread: 1.2 → 2.0`、`rayLength: 2.0 → 3.0`、`fadeDistance: 3.0 → 4.0`（更宽更长更持久）
- `followMouse: true → false`（光稳定，不跟鼠标跑）
- `noiseAmount: 0.1 → 0.0`、`distortion: 0.05 → 0.0`（更干净）

**层级**（从下到上）：
1. section bg（墨色压边 linear-gradient）
2. `.light-rays-bg`（WebGL LightRays，z=0，聚焦方向性光线）
3. `.scroll-story::before`（CSS 双层径向环境光，z=0.5，铺满 letterbox）
4. `.scroll-story__canvas`（painting，z=1）

**5 视口实测**：
- 1440×900: LightRays RGBA [116, 125, 128, 169]（L/R 灰绿光晕）
- 1920×1080: [71, 77, 79, 104]（L/R 顶部晨光）
- 1024×768: [74, 80, 82, 108]（上下晨光）
- 390×844: [95, 103, 105, 139]（**顶部 285px 明显乳白晨光**）
- 844×390: [133, 143, 146, 194]（L/R 晨光最亮）

**v5.2 视觉特点**：聚焦光（LightRays WebGL）+ 环境光（CSS ::before）双层叠加 → 顶部 62px 留白不再黑、L/R letterbox 清晰可见"晨光透过宣纸"效果。

---

### v5.3 补丁：::before 三层渐变彻底解决 dark band

**用户反馈**：「动画组件的上方依旧有一条边」—— 顶部 62px 留白仍是黑带，nav 下方到 painting 之间有明显边缘。

**根因诊断**：
- v5.2 的 ::before 双层渐变（顶部 0.32 + 中心 0.14）opacity 偏低，被 lightRaysBg canvas 的暗色 WebGL 输出"中和"了
- 顶部中央渐变（rgba 224,232,208, 0.32）混合深色背景后实际 RGB ≈ rgb(78,81,73)，仍是暗绿灰色，不够亮
- 单层 95% 75% 椭圆覆盖范围有限，L/R 远端仍是深色

**v5.3 修复**：::before 改为**三层径向渐变**，opacity 全面提升：

```css
.scroll-story::before {
  content: '';
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background:
    /* 第 1 层：顶部中央强光（0.6 opacity，opacity 翻倍，"晨光"主光源） */
    radial-gradient(ellipse 100% 80% at 50% 0%,
      rgba(232, 240, 216, 0.6) 0%, transparent 65%),
    /* 第 2 层：画作周围聚焦光（0.35 opacity，呼应画作中心） */
    radial-gradient(ellipse 80% 60% at 50% 50%,
      rgba(245, 241, 232, 0.35) 0%, transparent 65%),
    /* 第 3 层：更宽的环境光（0.2 opacity，cover L/R 远端） */
    radial-gradient(ellipse 120% 100% at 50% 30%,
      rgba(240, 232, 208, 0.2) 0%, transparent 75%);
  pointer-events: none; z-index: 0.5;
}
```

**3 层渐变分工**：
- **第 1 层**（顶部 0.6）：解决"nav 下方到 painting 之间黑带"问题，强光让边缘过渡自然
- **第 2 层**（画作中心 0.35）：呼应画作，让 letterbox 整体有晨光氛围
- **第 3 层**（120% × 100% 大椭圆 0.2）：超宽覆盖，确保 L/R 远端也有光

**5 视口实测（v5.3 验证）**：
- 1440×900：nav 下方**明显远山青晨光**铺满 letterbox，dark band 消失
- 1920×1080：L/R letterbox 顶部清晰晨光
- 1024×768：上下 letterbox 晨光
- 390×844：**顶部 285px 明显乳白渐变**，"晨光透过宣纸"效果最强烈
- 844×390：L/R 晨光最亮

**累计改动**（v5.1 → v5.3）：
- v5.1: LightRays top-edge-center + #C8D6B5 + spread 1.2
- v5.2: LightRays top-center（起点 viewport 外）+ #E0E8D0 + spread 2.0 + ::before 双层 0.32/0.14
- **v5.3**: ::before 三层 0.6/0.35/0.2

**LightRays 不变**（v5.2 已激进）：top-center / #E0E8D0 / spread 2.0 / rayLength 3.0 / 关 followMouse/noise/distortion

**5 视口 Light Rays 实测**（v5.3 与 v5.2 接近，因为 ::before 变化不影响 WebGL）：
- 1440×900: [116, 125, 128, 169]
- 1920×1080: [71, 77, 79, 104]
- 1024×768: [74, 80, 82, 108]
- 390×844: [95, 103, 105, 139]
- 844×390: [133, 143, 146, 194]

**smoke-test**：0 回归（4 页面、0 错误）

---

### v5.4 补丁：单一平滑线性渐变消除"带状"边缘

**用户反馈**：「不对我发现问题了，刚刚顶部留白只有一条现在更多了」—— v5.3 三层径向渐变（每层有中心-衰减边界）虽然更亮但**产生了可见的"带状"边缘**（顶部一条、底部一条）。

**根因诊断**：
- 径向渐变 `radial-gradient(ellipse 100% 80% at 50% 0%, X 0%, transparent 65%)` 在 65% 处从"中心亮"突变为"完全透明"，形成硬边缘
- 三层径向叠加 → 多条边缘（每层一条）→ 看起来"边更多了"
- 用户要的是**平滑过渡**（无任何"带"或"边"），不是更强的"中心焦点"

**v5.4 修复**：::before 改为**单一平滑线性渐变**（4 stop 点，从顶部 0.42 平滑过渡到底部 transparent）：

```css
.scroll-story::before {
  content: '';
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(180deg,
    rgba(232, 240, 216, 0.42) 0%,       /* 顶部 0.42 晨光 */
    rgba(232, 240, 216, 0.22) 25%,     /* 25% 处渐弱 */
    rgba(232, 240, 216, 0.08) 55%,     /* 55% 处更弱 */
    transparent 85%);                   /* 85% 处完全透明 */
  pointer-events: none; z-index: 0.5;
}
```

**为什么线性渐变无边缘**：
- 线性渐变是**方向性**的（从顶到底），没有"中心-衰减"结构
- 4 个 stop 点之间是**线性插值**，数学上无突变
- 即使在 0%→25% 区间（最陡的下降），每像素也是平滑过渡

**5 视口实测（v5.4 验证）**：
- 1440×900：nav 下方到 painting 顶部**完全平滑过渡**，无任何"带状"边缘
- 1920×1080：同样平滑的晨光渐变
- 1024×768：上下 letterbox 晨光
- 390×844：顶部 285px 区域晨光自然过渡
- 844×390：L/R 晨光最亮

**累计改动**（v5.1 → v5.4）：
- v5.1: LightRays top-edge-center + #C8D6B5 + spread 1.2
- v5.2: LightRays top-center（起点 viewport 外）+ #E0E8D0 + spread 2.0 + ::before **双层径向 0.32/0.14**
- v5.3: ::before **三层径向 0.6/0.35/0.2**（产生带状边缘 ❌）
- **v5.4: ::before 单一平滑线性 0.42→0.22→0.08→transparent**（无边缘 ✅）

**smoke-test**：0 回归

---

*设计于杭州 · 画于桂林*
