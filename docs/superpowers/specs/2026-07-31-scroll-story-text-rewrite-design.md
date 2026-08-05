# ScrollStory 文字框组件内容改写 — 设计文档

**日期**：2026-07-31
**作者**：Claude
**状态**：草案（待 spec review + 用户审阅）

---

## 1. 背景

`#scroll-story` 区域是首页的核心叙事组件 —— 锁定屏滚动驱动 248 帧绘画过程动画，期间叠加三层文字卡片：

1. **序幕卡片**（`#introOverlay`）— 滚动起点，介绍艺术家
2. **组 1 · 四十年 · Artist** — 3 张数据卡（年/岁/题材）
3. **组 2 · 三不 · Character** — 3 张数据卡（品格）

当前文案偏白话、缺诗意，与项目"诗情画意 · 桂林山水"的核心定位不匹配。

**素材**：用户提供的 `素材/文本.txt` 含画家生平、画风、题画诗三段丰富内容。

---

## 2. 决策记录（已与用户确认）

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 文案风格基调 | **诗意古雅** | 与品牌"诗情画意"一致，且题款感设计语言（字距 0.18em、宣纸色）支持 |
| 是否补全第 3 组 | **保持 2 组不动** | 用户偏向保守，最小改动 |
| 描述长度 | **对联式两句（4-8字×2）** | 与卡片题款感契合；ascender/descender 留白舒服 |
| 文案方案 | **方案 A · 诗中取句** | 直接引用画家原诗，品牌一致性最强 |

---

## 3. 范围

### 3.1 IN SCOPE

| 文件 | 改动 |
|------|------|
| `lib/artworks-data.js` | 修改 `BRAND.intro.name` / `BRAND.intro.line` |
| `lib/scroll-story-cards-data.js` | 修改 `GROUPS` 中 6 张卡的 `desc` 字段 |
| `styles.css` | `.ssc__desc` 增加 `white-space: pre-line` 支持 `\n` 换行 |

### 3.2 OUT OF SCOPE

- 不改 `scroll-story-cards.js` 渲染逻辑（已支持任意字符串注入）
- 不改 `intro-overlay.js` 动画时序
- 不补第 3 组（README 中的"收尾"组仍待后续）
- 不改 HTML 模板结构
- 不改字距、字号、颜色等视觉契约

---

## 4. 文案内容（方案 A · 诗中取句）

### 4.1 序幕卡片

来源：`window.BRAND.intro`（`lib/artworks-data.js`）

```
name: "黄桂明 · 桂林山水"  // 保持不变
line: "清江一曲绕山流  ·  江岸奇峰耸"  // 引用 POEMS id=1, id=2
```

### 4.2 组 1 · 四十年 · Artist

```
sub: "Artist"  // 保持不变
title: "四十年"  // 保持不变

cards:
  - { num: '40+', unit: '年',    desc: '笔耕四十载\n只此一山水' }
  - { num: '17',  unit: '岁',    desc: '拜师清漓院\n入室为关门' }
  - { num: '1',   unit: '题材',  desc: '一生一幅画\n唯写桂林山' }
```

### 4.3 组 2 · 三不 · Character

```
sub: "Character"  // 保持不变
title: "三不"  // 保持不变

cards:
  - { num: '不', unit: '逐', desc: '不逐浮名远\n不争虚誉来' }
  - { num: '不', unit: '慕', desc: '不慕奢华事\n不媚世俗风' }
  - { num: '素', unit: '心', desc: '素心对素纸\n素笔写素山' }
```

### 4.4 文案出处理由

- 序幕 line 单行内用 `·` 分隔两句，不强制换行（每句 7 字已超 28em，仍宽于 720px max-width 的一半，可自然换行）
- 数据卡 desc 字段以 `\n` 嵌入硬换行；CSS `white-space: pre-line` 渲染中文两行对联

### 4.5 与品牌一致性

- 序幕 line 引用 POEMS id=1, id=2（已存在于 `artworks-data.js`）
- 闭幕（Marquee 前的 verse 区域）继续引用 POEMS id=3，呼应整站
- 整站形成"开篇诗句 → 画家精神 → 收尾诗句"的三段诗链

---

## 5. 技术实现

### 5.1 CSS 改动（追加 1 行）

```css
.ssc__desc {
  font-family: var(--font-serif);
  font-size: clamp(14px, 1.4vw, 18px);
  color: rgba(245, 241, 232, 0.78);
  letter-spacing: 0.18em;
  margin: 0;
  text-transform: none;
  white-space: pre-line;          /* 新增：支持 \n 换行 */
  line-height: 1.5;               /* 微调：两行对联行距 */
}
```

### 5.2 数据改动（字符串字面量）

仅修改 `lib/artworks-data.js` 中 `BRAND.intro` 两字段；`lib/scroll-story-cards-data.js` 中 `GROUPS` 6 张卡的 `desc` 字段。

### 5.3 渲染

无需改 `scroll-story-cards.js` —— 模板字符串已支持任意 `${c.desc}` 注入；`HGM_ESCAPE_HTML` 已保护（虽然 desc 中无 HTML 风险，但为安全，模板已 checkHtml）。

---

## 6. 验证

### 6.1 单元/手工验证

- 启动 `python dev-server.py 8080 127.0.0.1`
- 浏览器打开 `http://127.0.0.1:8080/index.html`
- 滚动到 ScrollStory 区域：
  - 序幕卡：name "黄桂明 · 桂林山水"、line 单行两诗句分隔
  - 组 1 出现：3 张卡数字 + 两行对联描述
  - 组 2 出现：3 张卡不/不/素 + 两行对联描述
- 验证 `prefers-reduced-motion`: reduce 下仍能正常显示文案

### 6.2 现有测试

- `tests/test_intro_overlay_sync.py` —— 验证序幕进度同步（不应受文案改动影响）
- `tests/smoke-test.py` —— 验证首页 5 个 section 渲染（不应受影响）
- `tests/test_marquee_rows.py` —— 不相关

### 6.3 a11y

- 视觉用户：清晰可读
- 屏幕阅读器：`aria-hidden` 仍由 JS 按进度切换；desc 文字被朗读
- 颜色对比：`#F5F1E8` 0.78 + `#1A1A1A` 0.62 背景 ≥ 4.5:1（WCAG AA）

---

## 7. 风险与回退

| 风险 | 应对 |
|------|------|
| 中文 4-8 字 + 字距 0.18em 在 390px 宽度内可能溢出 | 通过 `clamp(14px, 1.4vw, 18px)` 字号 + `word-break: keep-all` 默认中文不强制断行；如溢出则减小字号 |
| desc 字段未来扩展为长文 | `white-space: pre-line` 已支持，未来直接 `\n` 即可 |
| 诗句引用与 POEMS 库不同步 | 在 code review 中提醒：line 字段即 POEMS 文本的字面引用，不要跨字段改动 |

---

## 8. 实施步骤

1. **Data**: 改 `lib/artworks-data.js` `BRAND.intro.line`（1 行）
2. **Data**: 改 `lib/scroll-story-cards-data.js` `GROUPS` 6 张卡的 `desc`（6 行）
3. **CSS**: 改 `styles.css` `.ssc__desc` 加 `white-space: pre-line` + `line-height`（1 行）
4. **Verify**: 重启 dev-server，浏览器目视 + 跑 `tests/smoke-test.py` + `tests/test_intro_overlay_sync.py`

总计 3 个文件、< 10 行净改动。

---

## 9. 后续（非本次范围）

- 补全组 3「收尾」（README 中已规划，待后续 spec）
- 19 张作品中 10~19 题款诗补充（README TODO）
- POEMS 库扩充（首屏、详情页、verse 三处金句联动）
