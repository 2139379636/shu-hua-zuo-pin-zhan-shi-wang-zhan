# 滚轮动画 + 自动画墙 最小修补 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在桌面端 Chrome / Edge 上，让 `index.html` 的 ScrollStory 真正由滚轮驱动；让 Marquee 视觉上能看出两行反向滚动；停止产生多余的 `frame_003xx.jpg` 404。

**Architecture:** 仅 3 处定点修改 ——
1. `ink-effects.js` 调整帧探测上限与默认帧数，避免 250 ~ 300 区间无意义 404；
2. `ink-effects.js` 的 Marquee 缩略图去除 `loading="lazy"`；
3. `index.html` 给 3 个 vendor 脚本加 `?v=1` + `onerror`，破除缓存版本号干扰并显式报错。
其余所有逻辑、样式、页面、动效、库、配置 **一律不动**。验证失败立即回到方案二，不再循环加补丁。

**Tech Stack:** 纯 HTML5 + Vanilla JavaScript（IIFE 暴露 window）+ 本地 `lib/vendor/` 下的 Lenis 1.1.13 / GSAP 3.12.5 / ScrollTrigger 3.12.5。无 build tool，无 git，无测试框架。

---

## 项目硬性约束（贯穿本 plan）

1. **不用 git**：所有 Task 不做 `git add/commit`；保留记录靠本文件 `- [ ]` 复选框
2. **不用 build tool**：纯 HTML / JS / CSS，依赖 Python `http.server` 静态托管
3. **不用测试框架**：每个 Task 用桌面 Chrome DevTools 代替单元测试
4. **路径**：所有相对路径基于 `C:\Users\17316\Desktop\网页8\`（dev server 已在 8080 端口运行）
5. **dev server**：项目根目录 `python -m http.server 8080 --bind 127.0.0.1` 后台运行；访问 http://127.0.0.1:8080/index.html
6. **浏览器**：桌面端 Chrome / Edge（用户已确认验收范围）
7. **回退条件**：Task 4 验证任一不通过 → 立即停止打补丁，进入方案二；不进入 Task 5

---

## 验收对照（实施时随时复核）

- 6 条验收来自 spec §6：F1 `SCROLL_CAPABILITY` 全 true / F2 滚轮驱动 0~249 帧 / F3 Marquee 两行反向 / F4 hover 暂停恢复 / F5 console 无 GSAP 加载失败 / F6 `frame_003xx.jpg` 404 ≤ 11
- 任一不通过 → 回到根因排查（不进 Task 5）

---

## File Structure（修改一览）

| 类型 | 文件 | 责任 |
|---|---|---|
| 修改 | `ink-effects.js` | 帧探测范围 + Marquee 缩略图立即加载 |
| 修改 | `index.html` | 3 个 vendor 脚本 `?v=1` 回退 + `onerror` 显式错误 |
| 验证 | `http://127.0.0.1:8080/index.html` | 桌面 Chrome 端到端复测 |
| 输出 | `docs/superpowers/plans/2026-07-29-scroll-and-marquee-fix.md` | 本计划文件 |

---

# Task 1: 调整 ink-effects.js 帧探测范围

**Files:**
- Modify: `ink-effects.js:76` (default FRAME_COUNT)
- Modify: `ink-effects.js:87` (REAL_MAX)

- [ ] **Step 1: 打开 ink-effects.js 定位默认帧数**

定位到：
```js
let   FRAME_COUNT = 248;  // 默认，bootScrollStory 内动态覆盖
```

期望看到 248 字样。

- [ ] **Step 2: 修改默认帧数为 249**

```diff
-  let   FRAME_COUNT = 248;  // 默认，bootScrollStory 内动态覆盖
+  let   FRAME_COUNT = 249;  // 默认，与素材实际帧数一致（frame_00001 ~ frame_00249）
```

- [ ] **Step 3: 打开 ink-effects.js 定位探测上限**

定位到：
```js
const REAL_MAX = 300;  // 探测上限
```

期望看到 `REAL_MAX = 300` 字样。

- [ ] **Step 4: 修改探测上限为 260**

```diff
-  const REAL_MAX = 300;  // 探测上限
+  const REAL_MAX = 260;  // 探测上限：略高于真实 249，探测循环仍从大到小试，但只产生最多 11 次 404（250~260）
```

- [ ] **Step 5: 静态自检 — 确认改动**

在 `ink-effects.js` 全文中搜索：
- `FRAME_COUNT = 249`：期望匹配 1 次
- `REAL_MAX = 260`：期望匹配 1 次
- 不应再出现 `FRAME_COUNT = 248` 与 `REAL_MAX = 300`

期望输出：搜索结果与上述一致。

- [ ] **Step 6: 浏览器自检（前置）**

打开 http://127.0.0.1:8080/index.html → Ctrl+F5 强刷 → F12 → Network 过滤 `frame_0025` 与 `frame_003`：

期望：`frame_00249.jpg` 200；`frame_00250.jpg ~ frame_00260.jpg` 共 11 个 404；`frame_00261.jpg` 及以上不再有请求。

> 此时 SCROLL_CAPABILITY 仍可能全 false（vendor 脚本版本号未改），属正常。

---

# Task 2: 修改 Marquee 缩略图为立即加载

**Files:**
- Modify: `ink-effects.js:284` (`<img ... loading="lazy" ...>`)

- [ ] **Step 1: 定位 marquee tile 渲染**

打开 `ink-effects.js`，定位到 `function tile(art)` 内的：
```js
<img src="${src}" alt="${art.title}" loading="lazy" decoding="async" width="240" height="300" />
```

期望看到 `loading="lazy"` 字样。

- [ ] **Step 2: 去掉 loading="lazy"**

```diff
-      <img src="${src}" alt="${art.title}" loading="lazy" decoding="async" width="240" height="300" />
+      <img src="${src}" alt="${art.title}" decoding="async" width="240" height="300" />
```

- [ ] **Step 3: 静态自检 — 确认无残留**

在 `ink-effects.js` 全文中搜索 `loading="lazy"`：

期望：0 次匹配。

- [ ] **Step 4: 浏览器自检（前置）**

打开 http://127.0.0.1:8080/index.html → Ctrl+F5 强刷 → F12 → Network 过滤 `thumbs`：

期望：19 个 `thumbs/1.jpg ~ thumbs/19.jpg` 全部 `200`，且每个 `<img>` 对应的请求都出现在首屏加载过程中（而不是仅在 hover 边缘才发起）。

---

# Task 3: index.html 给 3 个 vendor 脚本加 onerror 与 ?v=1

**Files:**
- Modify: `index.html:128-130` (3 个 vendor `<script>` 标签)

- [ ] **Step 1: 定位 3 个 vendor script**

打开 `index.html` 第 128~130 行，期望看到：

```html
<script src="lib/vendor/lenis.min.js?v=20260729" defer></script>
<script src="lib/vendor/gsap.min.js?v=20260729" defer></script>
<script src="lib/vendor/ScrollTrigger.min.js?v=20260729" defer></script>
```

- [ ] **Step 2: 替换为带 onerror 的版本**

将上面 3 行整块替换为：

```html
<script src="lib/vendor/lenis.min.js?v=1" defer
        onerror="console.error('[index.html] lenis.min.js 加载失败')"></script>
<script src="lib/vendor/gsap.min.js?v=1" defer
        onerror="console.error('[index.html] gsap.min.js 加载失败')"></script>
<script src="lib/vendor/ScrollTrigger.min.js?v=1" defer
        onerror="console.error('[index.html] ScrollTrigger.min.js 加载失败')"></script>
```

> 版本号回退到 `?v=1`：破除 `?v=20260729` 缓存键的潜在干扰（即使本地 dev server 不缓存，浏览器仍可能保留强缓存 304）。
> `onerror` 仅用于**显式报错**，不改变加载成功时的行为。

- [ ] **Step 3: 静态自检**

在 `index.html` 全文中搜索：
- `?v=20260729`：期望 0 次匹配
- `onerror="console.error('[index.html]`：期望 3 次匹配
- `lib/vendor/gsap.min.js?v=1`：期望 1 次匹配
- `lib/vendor/ScrollTrigger.min.js?v=1`：期望 1 次匹配
- `lib/vendor/lenis.min.js?v=1`：期望 1 次匹配

---

# Task 4: 端到端验证（必过项）

> **重要**：本 Task 是继续推进的**硬性门槛**。任一必过项不通过 → **立即停止**，回到根因排查（不进 Task 5）。

- [ ] **Step 1: 强刷 + 清理缓存**

打开 http://127.0.0.1:8080/index.html → Ctrl+Shift+Delete → 清空"缓存的图片和文件" → 关闭 DevTools 重新打开。

- [ ] **Step 2: Network 验证（必过）**

F12 → Network 过滤 `js`、`jpg`：

期望：
- `lib/vendor/lenis.min.js?v=1` / `gsap.min.js?v=1` / `ScrollTrigger.min.js?v=1`：**全部 200**
- 50+ 条 `frame_003xx.jpg` 404 **消失**；最多出现 `frame_00250.jpg ~ frame_00260.jpg` 共 11 个 404
- `thumbs/1.jpg ~ thumbs/19.jpg` 全部 200

- [ ] **Step 3: Console 验证（必过）**

F12 → Console：

```js
console.table(window.SCROLL_CAPABILITY);
```

期望输出（任一项 false 即失败）：

```
┌──────────────────┬──────────┐
│ (index)          │ Values   │
├──────────────────┼──────────┤
│ Lenis            │ true     │
│ Gsap             │ true     │
│ ScrollTrigger    │ true     │
│ scrollStoryOK    │ true     │
│ marqueeOK        │ true     │
│ smoothScrollOK   │ true     │
└──────────────────┴──────────┘
```

并且：
- **不应**出现 `[smooth-scroll] GSAP 加载失败`
- **不应**出现 `[ScrollStory] capability missing, fallback to static`
- **不应**出现 `[index.html] xxx 加载失败`（即不应触发 onerror）

- [ ] **Step 4: 滚轮控制 ScrollStory 验证（必过）**

- 滚轮从 Hero 向下 → 应当感受到 ScrollStory 锁住一段距离（约 3 个屏幕高度）；
- 继续滚动 → Canvas 上的绘画过程画面应随滚轮逐步变化（从空白 → 山水成型）；
- 滚到底 → 自然进入 Marquee。

如果出现"滚轮一掠而过 ScrollStory"，立即停止，进入根因排查。

- [ ] **Step 5: Marquee 视觉验证（必过）**

- 视线停留 Marquee 至少 3 秒 → 两行应持续反向滚动，第一行向左、第二行向右；
- 鼠标移入 Marquee 任一位置 → 整个 marquee 暂停（两行均停）；
- 鼠标移出 → 两行恢复滚动。

如果"看不出滚动"，进入方案二（说明 hover-pause 与首屏可见性不构成问题，剩下来需要重写画墙动效）。

- [ ] **Step 6: 控制台无新增错误**

F12 → Console 顶部过滤 `Errors`：

期望：除已知的 `?AI features` 提示外，0 条红色错误；与 Task 4 步骤 3 之前相比无新增。

- [ ] **Step 7: 记录本计划完成情况**

如果 Step 1 ~ 6 全部通过：继续进入 Task 5（设计文档收尾）。
如果任一步骤未通过：**停止本 plan**，回到方案二。

---

# Task 5: 设计文档收尾（仅当 Task 4 全过才执行）

**Files:**
- Modify: `docs/superpowers/specs/2026-07-29-scroll-and-marquee-fix.md`（追加"实施记录"段）

- [ ] **Step 1: 在 spec 末尾追加实施记录**

打开 `docs/superpowers/specs/2026-07-29-scroll-and-marquee-fix.md`，在文件末尾（最后一行 `*Spec drafted on 2026-07-29 ...*` 之后）追加：

```markdown

---

## 实施记录

- **Date:** 2026-07-29
- **实施人:** Claude (subagent-driven-development)
- **修改清单：**
  1. `ink-effects.js:76` `FRAME_COUNT = 248` → `249`
  2. `ink-effects.js:87` `REAL_MAX = 300` → `260`
  3. `ink-effects.js:284` `<img ... loading="lazy" ...>` → 去掉 `loading="lazy"`
  4. `index.html:128-130` 3 个 vendor 脚本 `?v=20260729` → `?v=1`，加 `onerror`
- **验证结果（Task 4 全部必过项）：**
  - [ ] F1 `SCROLL_CAPABILITY` 6 项 true
  - [ ] F2 滚轮驱动 0 ~ 249 帧
  - [ ] F3 Marquee 两行反向
  - [ ] F4 hover 暂停 / 移出恢复
  - [ ] F5 console 无 `GSAP 加载失败` / 无 `capability missing`
  - [ ] F6 `frame_003xx.jpg` 404 ≤ 11
- **回退触发：** 任一必过项未通过 → 已回退至方案二（详见回退记录）
```

- [ ] **Step 2: 最终自检**

打开 http://127.0.0.1:8080/index.html，再跑一次 Task 4 步骤 2 ~ 6 的检查清单。

期望：与 Task 4 步骤 2 ~ 6 完全一致。

---

## 回退记录（若 Task 4 未通过）

如发生回退，按以下格式在 `docs/superpowers/plans/2026-07-29-scroll-and-marquee-fix.md` 末尾追加（本文件自身）：

```markdown
## 回退记录

- **回退日期：** 2026-07-29
- **未通过的必过项：** <F1 / F2 / F3 / F4 / F5 / F6 中具体哪一条>
- **回退后的真实表现：** <F12 Console 截图或行为描述>
- **下一步：** 进入方案二：重写 `ink-effects.js` 的 ScrollStory / Marquee 运行机制。
```

---

*Plan drafted on 2026-07-29 by writing-plans skill. Awaiting plan-document-reviewer.*
