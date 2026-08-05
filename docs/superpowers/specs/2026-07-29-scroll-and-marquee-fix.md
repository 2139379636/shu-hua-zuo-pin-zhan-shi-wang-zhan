# 滚轮动画 + 自动画墙 最小修补 Spec

> **Date:** 2026-07-29
> **Status:** Awaiting Spec-Reviewer Approval
> **Project:** `C:\Users\17316\Desktop\网页8\`
> **Scope:** 桌面端 Chrome / Edge 范围内，最低成本修复“滚轮跳过 ScrollStory” + “自动画墙看不出滚动”两个症状。**不做视觉伴侣、页间转场、整体动效重构。**

---

## 0. 一句话总结

通过 3 处定点修改，让 `index.html` 的 ScrollStory 真正由滚轮驱动，让 Marquee 视觉上能看出两行反向滚动；其余页面、所有视觉、Curtain / Loader / Hero 鼠标遮罩均保持现状。

---

## 1. 现象（用户截图与控制台证据）

1. F12 Console：
   - `[smooth-scroll] GSAP 加载失败，仅启用浏览器原生滚动`
   - `[ink-effects] GSAP 不可用，将使用 fallback`
   - `[ScrollStory] capability missing, fallback to static`
2. Network：出现 1 条 `Failed to load resource: net::ERR_CONNECTION_TIMED OUT（oss2:1）`；及大量 `frame_00300.jpg ~ frame_00286.jpg` 的 404。
3. 用户操作：滚轮从 Hero 向下，ScrollStory 区块被一掠而过；Marquee 鼠标移入瞬间像“动一下又停”，肉眼几乎看不到滚动。

---

## 2. 已确认的根因

| # | 根因 | 证据 | 修复点 |
|---|---|---|---|
| A | **GSAP / ScrollTrigger / Lenis 在某些环境下未真正加载** | 控制台显示 GSAP 加载失败；Network 报 `ERR_CONNECTION_TIMED_OUT`；`SCROLL_CAPABILITY` 全部为 `false`；`window.gsap` / `window.ScrollTrigger` 未定义 | 在 `index.html` 给 3 个 vendor 脚本加 `onerror` 显式提示 + 回退到 `?v=1`，破除可能存在的缓存版本号干扰 |
| B | **帧探测上限设错** | `ink-effects.js` 中 `REAL_MAX = 300`，而 `素材/视频切割` 实际只有 1 ~ 249 帧（已用 Python `ls` 验证）；`FRAME_COUNT` 默认 `248` 与实际 249 也不一致 | `REAL_MAX` 降到 `260`，`FRAME_COUNT` 改为 `249` |
| C | **自动画墙视觉上看不出动** | 缩略图与宣纸背景几乎同色；`<img loading="lazy">` 让 hover 边缘才“懒加载” | 把 `marquee__tile` 渲染里的 `loading="lazy"` 去掉，使首屏 19 张立即加载 |

> 重要备注：根因 A 的真正根因可能不止“脚本顺序”。控制台 + Network 已经明确显示 GSAP 没加载成功。最小修补的目标是**先让 GSAP 正常加载**（破缓存 + 显式错误提示），不再推测背后的网络原因；如仍失败，再走方案二。

---

## 3. 不动的东西（明确列出，避免范围漂移）

- 页面转场 / Curtain / Loader / Hero 鼠标遮罩 / Lenis 实例化逻辑；
- `lib/smooth-scroll.js` 的能力检测函数体（检测本身正确，问题在它检测的目标）；
- `lib/artworks-data.js`、`lib/nav.js`、`lib/footer.js`；
- `styles.css`（不动 CSS 动画）；
- `gallery.html` / `artwork.html` / `artist.html` / `cart.html`；
- 5 个页面的品牌信息、导航、页脚、视觉风格。

---

## 4. 改动清单

### 4.1 `ink-effects.js`

#### 4.1.1 帧探测范围

```diff
-  let   FRAME_COUNT = 248;  // 默认，bootScrollStory 内动态覆盖
+  let   FRAME_COUNT = 249;  // 默认，与实际帧数一致
   ...
-  const REAL_MAX = 300;  // 探测上限
+  const REAL_MAX = 260;  // 探测上限：略高于真实 249，避免无谓的 404
```

> 探测循环语义不变：仍然从大到小试，加载成功的最高编号就是真实帧数上限。

#### 4.1.2 Marquee 缩略图立即加载

```diff
   return `
     <a href="artwork.html?id=${art.id}" class="marquee__tile" data-id="${art.id}">
-      <img src="${src}" alt="${art.title}" loading="lazy" decoding="async" width="240" height="300" />
+      <img src="${src}" alt="${art.title}" decoding="async" width="240" height="300" />
       <span class="marquee__seal">${art.seal}</span>
     </a>
   `;
```

> 仍保留 `decoding="async"`、`width`、`height`，仅去掉 `loading="lazy"`。这 19 张缩略图是首屏可见，必须立即下载。

### 4.2 `index.html`

#### 4.2.1 vendor 脚本加 `onerror` 与版本回退

```diff
-  <script src="lib/vendor/lenis.min.js?v=20260729" defer></script>
-  <script src="lib/vendor/gsap.min.js?v=20260729" defer></script>
-  <script src="lib/vendor/ScrollTrigger.min.js?v=20260729" defer></script>
+  <script src="lib/vendor/lenis.min.js?v=1" defer
+          onerror="console.error('[index.html] lenis.min.js 加载失败')"></script>
+  <script src="lib/vendor/gsap.min.js?v=1" defer
+          onerror="console.error('[index.html] gsap.min.js 加载失败')"></script>
+  <script src="lib/vendor/ScrollTrigger.min.js?v=1" defer
+          onerror="console.error('[index.html] ScrollTrigger.min.js 加载失败')"></script>
```

- 版本号回退到 `?v=1`：破除 `?v=20260729` 缓存键的潜在干扰（即使本地 dev server 不缓存，浏览器仍可能保留强缓存 304）；
- 加 `onerror`：当确实下载失败时，错误信息直接指向 `index.html`，便于下一轮快速判断“到底是谁没加载到”。

> 这是**最小可观测性补丁**，不是“修好 GSAP”本身。如果 vendor 文件确实返回 200，则无副作用。

---

## 5. 验证方式

### 5.1 必须通过（继续推进的条件）

1. F12 → Network：3 个 vendor 脚本全部 `200`；不再出现 50+ 条 `frame_003xx.jpg` 404（最多 11 条）；
2. F12 → Console：
   - `console.table(window.SCROLL_CAPABILITY)` → 6 个 `true`；
   - 出现 `[Marquee] booted (19 × 2 = 38 tiles, CSS-driven, thumbs)`；
   - 出现 `[Curtain] booted (two-stage 500ms)`；
   - **无** `[smooth-scroll] GSAP 加载失败`、**无** `[ScrollStory] capability missing, fallback to static`；
3. 滚轮从 Hero 向下，能感受到 ScrollStory 锁住一段距离（约 3 个屏幕高度），画面随滚轮变化；滚到底后自然进入 Marquee；
4. Marquee 两行持续反向滚动，肉眼可见；鼠标悬停整段 marquee 时暂停，移出后恢复。

### 5.2 失败回退

如果 5.1 任意一项不通过（特别是 1 与 2），**不再**继续打补丁，回到根因排查，进入**方案二**（重写 `ink-effects.js` 中 ScrollStory / Marquee 的运行机制）。

---

## 6. 验收标准

| ID | 标准 | 验证 |
|---|---|---|
| F1 | `SCROLL_CAPABILITY` 6 项全部 `true` | `console.table` |
| F2 | ScrollStory 锁住，滚轮驱动 0 → 249 帧 | DevTools 监听 `ScrollTrigger.getAll()` |
| F3 | Marquee 两行反向滚动 | 肉眼 + 截图对比 |
| F4 | 悬停暂停、移出恢复 | 操作 |
| F5 | 浏览器控制台无 `GSAP 加载失败` / 无 `capability missing` | F12 |
| F6 | `frame_003xx.jpg` 404 数量 ≤ 11 | F12 Network |

---

## 7. 下一步

1. 本 spec 由 `spec-document-reviewer` 子代理审核（最多 3 轮）；
2. 用户 review 后签字；
3. 转入 `writing-plans` skill，产出包含本 spec 3 处修改的实施 plan。

---

*Spec drafted on 2026-07-29 by brainstorming session. Awaiting spec-document-reviewer.*
