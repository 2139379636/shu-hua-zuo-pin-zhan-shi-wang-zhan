# 黄桂明 · 桂林山水 — 作品管理后台 v2（组件级配置）

**日期**: 2026-10-09
**类型**: 重构 + 设计
**作者**: HGM 工作室
**决策阶段**: Brainstorming → Spec Review → User Review → Writing Plans → Implementation
**关联文件**:
- `admin.html`（旧：作品级 CRUD，保留作为半年回退）
- `admin-v2.html`（新：组件级 Tab，本次设计目标）
- `data/components.json`（新：唯一真相源）
- `lib/github-api.js`（升级：Git Data API 6 步原子提交）

---

## 一、背景与动机

### 1.1 现况盘点

黄桂明个人作品集网站已具备 v5.4 状态，包含：

- 1 个静态首页（Hero 鼠标遮罩 + 248 帧 ScrollStory + 反向滚动 Marquee + 19 张作品展示）
- 5 个内容页（`gallery.html` / `artwork.html` / `artist.html` / 备份的 `cart.html` / 调试用 `diag.html`）
- 1 个旧后台（`admin.html`）：基于 **作品级 CRUD**（添加/编辑/删除作品）的轻量管理界面
- 数据存储：**localStorage**（仅当前浏览器有效）+ **GitHub Contents API 同步**（commit 到 `data/artworks.json`）
- 鉴权：URL `?key=<口令>` + SHA-256 hash 比对（客户端校验）
- 图片存仓库 `素材/` 目录

### 1.2 动机

用户（画家本人 / 工作室）希望能"**非常简单地控制每个展示组件里的作品替换**"。当前 admin 虽然有作品 CRUD，但是：
- 仅"可上架作品"（与首页 19 张解耦），与展示组件的实际"槽位配置"未打通
- 替换某个组件的图片需要手工编辑源码或 JSON，无 UI 引导
- 用户实际上想"每个组件里要哪张图换一下"，而不是"添加/删除作品"

→ 本次设计目标：**用"组件级配置后台"取代现有"作品级 CRUD 后台"**，针对画家非技术背景做到极致简单。

---

## 二、范围（已与用户对齐）

### 2.1 在范围内（v2.2：按用户 2026-10-09 最终反馈收敛到 4 组件）

| 后台 Tab | 槽位数 | 数据内容 | 操作 | 出现在哪一页 |
|---|---|---|---|---|
| **横幅** | 6 槽位 | `marquee-landscape` section（自动滚动下方的静态网格）的 6 张作品 id（与 LANDSCAPE_LAYOUT 一致，宽跨列在头尾） | 选择/换图/重置 | index.html 风景作品 section |
| **自动滚动** | 12 槽位 | Marquee row1+row2 共 12 个竖向作品 id（前 6 给 row1，后 6 给 row2） | 选择/换图/拖拽排序 | index.html Marquee row1+row2 |
| **全部作品** | 9 槽位 | `gallery.html` 9 张精选 id | 选择/换图/拖拽排序 | gallery.html |
| **十年精选** | 3 槽位 | `artist.html` "Selected · 十年精选" 3 张代表作 id | 选择/换图/重置 | artist.html |

总槽位数 = 6 + 12 + 9 + 3 = **30 个图片槽位**

### 2.2 不在范围内（明确排除）

- ❌ 题画诗编辑（诗词库保留在 `lib/artworks-data.js:POEMS`，不入后台）
- ❌ BRAND/品牌信息编辑（保留 `lib/artworks-data.js:BRAND`）
- ❌ 首页 19 张非卖作品的元数据编辑（继续硬编码 `lib/artworks-data.js:ARTWORKS`）
- ❌ ScrollStory 248 帧替换（用户确认纯前端展示，永不后台管理）
- ❌ Artwork 详情页（artwork.html?id=N）的标题/价格/描述/年份/地点（v2.1 用户决定不纳入后台）
- ❌ 订单/支付/购物车（用户声明后续单独做微信小程序配套）
- ❌ 访客侧功能（询单、留言、分享）
- ❌ 多管理员账号体系（仅 1 个 admin）

---

## 三、架构总览

### 3.1 数据流

```
管理员浏览器                  GitHub Repository                 Cloudflare Pages                  访客浏览器
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
admin-v2.html ── GET ────→ /data/components.json                 静态托管                              ── GET ──→ index.html
            ←── JSON ────  (admin 启动时拉取)                                              ←── HTML ──
                                                                                                         
admin-v2.html ── POST ───→ GitHub Data API (6 步原子)              main 分支 push                       监听到 push
   (保存全部改动)    │         │                                       │                                ↓
                    │         │ 1. GET ref                            │                          自动 rebuild
                    │         │ 2. GET commit                          │                             ↓
                    │         │ 3. POST blobs (N 个图片 + 1 个 JSON)   │                          30-60 秒后新版本生效
                    │         │ 4. POST trees                         │                               
                    │         │ 5. POST commits                        │                          ── GET ──→ 看到新内容
                    │         │ 6. PATCH refs                          │
                    │         ↓                                       │
                    │       main HEAD 原子移动                         │
                    │                                                │
                    ←── 201 OK / 失败 ──────────────────────────────────┘
                    
admin-v2.html ── 拉取最新 ──→ 30s 长轮询或手动 ⟳ 按钮
```

### 3.2 组件关系

| 组件 | 角色 | 文件 |
|---|---|---|
| **CF Pages** | 静态资产托管 + 入口 | `index.html` / `gallery.html` / `admin-v2.html` / `styles.css` |
| **Cloudflare CORS Worker**（已存在，加强） | 转发浏览器直连 GitHub API 的请求 | `workers/github-cors-proxy.js`（升级 Allow-Methods + User-Agent） |
| **GitHub Repository**（已存在） | 唯一真相源 + git push 触发 deploy | `data/components.json` + `素材/{N}.webp` |
| **CF Pages Build Hook**（已配置） | 监听 main push → rebuild | Cloudflare Dashboard |
| **客户端 admin-v2** | 全栈逻辑在浏览器端（白嫖 GitHub API） | `admin-v2.html` + `lib/admin-v2.js` + `lib/github-api.js`（升级） |

### 3.3 关键设计决策

| # | 决策 | 理由 |
|---|---|---|
| 1 | **单一 `data/components.json`**（所有组件配置在一文件） | 简化原子提交 + admin 多 Tab 映射；减少 rebuild 频率 |
| 2 | **图片仍存仓库 `素材/`**：转 WebP（≤200KB/张） | 缓解仓库膨胀 + 触 CF Pages 25MB 单文件限制 |
| 3 | **保留 Cloudflare CORS Worker**（已存在） | GitHub API 必需代理，不变（仅升级方法允许） |
| 4 | **不引入 D1 / R2 / Turnstile** | 方案 C 是极简路线，避免引入未用上的服务 |
| 5 | **认证**：URL `?key=<口令>` + SHA-256 + 浏览器 cookie | 现有机制；服务端校验 hash，不存明文 |
| 6 | **回退路径**：admin v1 保留半年 | 旧 admin.html 完全保留作为回退 |
| 7 | **多设备保护**：保存前 GET 校验 SHA | 防止后保存覆盖先保存 |

---

## 四、数据 Schema（`data/components.json`）

```jsonc
{
  "version": "2026-10-09",
  "exportedAt": "2026-10-09T14:32:00.000Z",

  // ========== 组件配置（后台各 Tab 读写）==========
  "components": {
    "hero": {
      "blankImage":    "素材/留白.webp",      // 底层留白
      "paintedImage":  "素材/有画.webp"       // 顶层有画
    },
    "marqueePortrait": {
      // 竖向滚动行（GSAP 60s）—— 6 张
      "slots": ["1", "3", "5", "7", "9", "11"]   // 引用 artworkLibrary 中的 id
    },
    "marqueeLandscape": {
      // 横向滚动行（GSAP 80s）—— 6 张
      "slots": ["4", "6", "13", "16", "17", "19"]
    },
    "gallery": {
      // gallery.html 9 张精选
      "featured": ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
    },
    "artistRepresentatives": {
      // artist.html 3 张代表作
      "slots": ["1", "5", "9"]
    },
    "artworkDetail": {
      // artwork.html?id=N 详情数据（19 个 id）
      // 字段集：{title, price, description, year, location}  ← 5 字段，统一用 §6.2 Artwork Detail Tab 表单
      "details": {
        "1":  { "title": "清江一曲绕山流",    "price": 6800, "description": "", "year": "", "location": "" },
        "2":  { "title": "一山未绝一山迎",    "price": 6800, "description": "", "year": "", "location": "" },
        "3":  { "title": "画尽黄山忆徐霞客",  "price": 7200, "description": "", "year": "", "location": "" },
        // ... 4-9 同上（默认值拷贝自 `lib/artworks-data.js:ARTWORKS` 对应字段）
        // 10-19 默认 {title: "作品 N", price: 0, description: "", year: "", location: ""}
      }
    }
  },

  // ========== 作品库（首页 19 张 + 后台上传新图追加）==========
  "artworkLibrary": {
    "1":  { "id": 1, "title": "清江一曲绕山流", "image": "素材/1.webp",  "thumb": "素材/1.webp",  "seal": "壹" },
    "2":  { "id": 2, "title": "一山未绝一山迎", "image": "素材/2.webp",  "thumb": "素材/2.webp",  "seal": "贰" },
    "3":  { "id": 3, "title": "画尽黄山忆徐霞客", "image": "素材/3.webp", "thumb": "素材/3.webp", "seal": "叁" },
    // 4-19 同上
    // 后台上传新图 → 自动追加 (nextId, "作品 N+1")
  }
}
```

### 字段语义

| 字段 | 类型 | 说明 |
|---|---|---|
| `components.hero.blankImage` / `paintedImage` | string 路径 | 相对路径，CF Pages 直接 serve |
| `components.marquee{...}.slots` | string[] | 引用 artworkLibrary 中的 id（不是路径） |
| `components.gallery.featured` | string[] | 9 个 id |
| `components.artistRepresentatives.slots` | string[] | 3 个 id |
| `components.artworkDetail.details[id]` | object | 详情文本字段（含 `{title, price, description, year, location}` 共 5 个键） |
| `artworkLibrary[id].image` | string 路径 | 渲染时的 src |
| `artworkLibrary[id].seal` | string | 中文数字印章。**仅作 `data/components.json` 初始值固化，admin-v2 UI 不提供编辑入口**（与 §2.2 "首页 19 张硬编码" 一致） |

### 4.1 双数据源关系（关键澄清）

| 渲染面 | 数据源文件 | 说明 |
|---|---|---|
| **首页 (`index.html`) 19 张卡片** | `lib/artworks-data.js:ARTWORKS` | **继续硬编码**，不进 admin 管理。改 Artwork Detail Tab **不会**影响首页 card 标题（这是用户明确约束） |
| **详情页 (`artwork.html?id=N`)** | `data/components.json:components.artworkDetail.details[N]` | 后台可编辑 title / price / description / year / location 5 个字段 |
| **首页 Hero/Marquee/Gallery 槽位的图片源** | `data/components.json:artworkLibrary[id].image` | 槽位本身只存 id，渲染时查 `artworkLibrary` 取图 |
| **首页 19 张 cards 的图片** | `素材/{N}.webp` 直引 | 与 `artworkLibrary[id].image` 同源 |

**PR1 重构具体动作**：
- 拆分 `lib/artworks-data.js` 为：
  - `ARTWORKS`（首页硬编码，**不动**）
  - `DETAILS_DEFAULT`（作为 `data/components.json` 中 `artworkDetail.details` 的初始值拷贝来源；首次发布时 admin-v2 UI 自动写入仓库）
- 实施完成后，`artwork.html` 切换读 `data/components.json` 的 `artworkDetail.details[N]`，不再依赖 `lib/artworks-data.js`

### 图片存储规范

**两类图片大小上限不同**（Hero 全屏需要更高分辨率，gallery 用缩略图更省流量）：

| 类型 | 路径 | 大小上限 | 典型像素 |
|---|---|---|---|
| Hero | `素材/留白.webp`、`素材/有画.webp` | ≤ 500KB/张 | 1920×1080（full viewport） |
| Gallery / Marquee / Artist | `素材/1.webp ~ 19.webp` | ≤ 200KB/张 | 800×~（缩略图） |
| 后台上传新作品 | `素材/20.webp ~ NN.webp` | ≤ 200KB/张 | 800×~（缩略图） |
| ScrollStory 248 帧 | `素材/视频切割/frame_*.jpg` | jpg 原样（不优化） | 1920×1080 |

```
素材/
├── 留白.webp                ≤ 500KB  (Hero 全屏)
├── 有画.webp                ≤ 500KB  (Hero 全屏)
├── 1.webp ~ 19.webp         ≤ 200KB  (其他组件)
├── 20.webp ~ NN.webp        ≤ 200KB  (后台上传)
└── 视频切割/
    ├── frame_00001.jpg ~ frame_00248.jpg   ← 248 帧（保留原 jpg，不进后台）
    └── cover.jpg                          ← 视频封面
```

**存储量估算**：19 × 200KB + 2 × 500KB = ~5MB；248 × 150KB ≈ 37MB；总计 ~42MB（受 CF Pages 20,000 文件数限制内）

---

## 五、API & Worker 设计（Git Data API 原子提交）

### 5.1 核心问题

GitHub **Contents API**（现有 admin 用）：`PUT /repos/{owner}/{repo}/contents/{path}` 一次只能改**一个**文件。我们的场景需要同时改 `data/components.json` + `素材/N.webp`（保证原子性：要么都生效，要么都失败）。

→ 升级为 **Git Data API**，支持单次 commit 修改多文件。

### 5.2 Git Data API 6 步原子提交流程

```
1. GET /repos/{owner}/{repo}/git/ref/heads/main
   → 当前 main HEAD commit SHA (X)

2. GET /repos/{owner}/{repo}/git/commits/{X}
   → base tree SHA (T_base)

3. POST /repos/{owner}/{repo}/git/blobs  (并行 N 次)
   body: { content: "<base64>" }
   → 拿到 blob_sha（components.json → a，素材/1.webp → b，…）

4. POST /repos/{owner}/{repo}/git/trees
   body: {
     base_tree: T_base,
     tree: [
       { path: "data/components.json", mode: "100644", sha: <a> },
       { path: "素材/1.webp",          mode: "100644", sha: <b> },
       ...
     ]
   }
   → 新 tree SHA (T_new)

5. POST /repos/{owner}/{repo}/git/commits
   body: {
     message: "admin: 替换 Hero + Marquee (2026-10-09 14:32)",
     tree: T_new,
     parents: [X]
   }
   → 新 commit SHA (C_new)

6. PATCH /repos/{owner}/{repo}/git/refs/heads/main
   body: { sha: C_new, force: false }
   → main HEAD 原子移动到 C_new（这是原子点，失败前 main 不会动）
```

### 5.3 Worker 升级（已存在的 `workers/github-cors-proxy.js`）

**改动范围**（最小）：
- `Access-Control-Allow-Methods` 增加 `PATCH`
- `Access-Control-Allow-Headers` 增加 `if-match, if-none-match`
- User-Agent 升级到 `hgm-gallery-admin/2.0`
- 透传逻辑不变

**完全向后兼容**：所有现有 Contents API 调用照常工作。

### 5.4 前端 `lib/github-api.js` 升级

**新增方法**：

```js
window.HGM_GITHUB = {
  // ... 现有方法保留
  
  async commitFiles({ message, fileChanges, author }) {
    // fileChanges = [{ path: 'data/components.json', content: '<json-string>' },
    //                { path: '素材/1.webp',         content: '<base64>' },
    //                ...]
    // 步骤 1-6 串联执行，任一失败抛错并 abort
  },
  
  async commitComponentsWithImages(components, imageFiles, message) {
    return await this.commitFiles({
      message,
      fileChanges: [
        { path: 'data/components.json', content: JSON.stringify(components, null, 2) },
        ...imageFiles.map(f => ({ path: f.path, content: f.base64 }))
      ],
      author: { name: '黄桂明', email: 'huang.guiming@art.com' }
    });
  }
};
```

### 5.5 错误处理

| 失败点 | 兜底 |
|---|---|
| 步骤 1 失败（无 main 分支） | admin 报错 "仓库未初始化"，提示去查看 docs |
| 步骤 2 失败（HEAD 不存在） | 同上 |
| 步骤 3 失败（单 blob 上传失败） | admin 报错该图片 "上传到 GitHub 失败"，该图片保留本地预览 |
| 步骤 4 失败（tree 创建失败） | admin 报错 "合并失败"，本地草稿保留 |
| 步骤 5 失败（commit 失败） | 同上 |
| 步骤 6 失败（PATCH refs 失败） | 极端情况：main 没动 → 用户刷新即可 |
| 并发改动冲突（多设备同时保存） | 步骤 1 拿 HEAD SHA → 步骤 5 时 SHA 不匹配 → admin 报错 "远端有更新，请拉取" |

---

## 六、后台 UI 设计

### 6.1 布局总览

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🖋️ 黄桂明 · 作品管理 v2    [管理员: 你]   [保存状态: 已同步 a1b2c3]   │
├────────────────────────────────────────────────────────────────────────┤
│ [Tab] Hero │ Marquee 竖 │ Marquee 横 │ Gallery 精选 │ Artist │ 详情 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ← 各 Tab 内容（槽位网格 + 上传/选择/排序操作）                       │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ [💾 保存全部改动] [↺ 放弃] [⇣ 导出 JSON] [⟳ 立即拉取最新]              │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.2 各 Tab 内部结构

#### Hero Tab（2 槽位，2 列网格）
- 每槽位：预览图（16:9）+ 文件名 + KB + [📤 上传新图] [🗂 从素材库选] [✕ 重置默认为 `素材/留白.webp` / `素材/有画.webp`]

#### Marquee 竖/横 Tab（各 6 槽位，3×2 网格）
- 每槽位：缩略图 + 标题 + [换图] [✕]
- 换图弹 Modal：上传新图 / 从素材库选 / 拖拽排序 (HTML5 drag-and-drop)

#### Gallery 精选 Tab（9 槽位，3×3 网格）
- 同 Marquee，9 个槽位
- 点击槽位图片 → 切换到 Artwork 详情 Tab 并滚动定位到对应 id（**不**打开 inline 子表单）

#### Artist 代表作 Tab（3 槽位，3 列横向）
- 简洁横向 3 槽位布局

#### Artwork 详情 Tab（19 子表单，列表式）
- 每个 id 一个折叠卡片，可编辑 **5 字段**：标题、价格、描述、年份、地点
- ⚠️ 空白 id 显示警告图标 + [📤 上传图] 按钮

### 6.3 关键交互

| 交互 | 行为 |
|---|---|
| **保存全部改动** | 收集所有 Tab 改动 → 一次 commit 到 GitHub（components.json + 新图片） |
| **⟳ 立即拉取最新** | GET `data/components.json` SHA → 与缓存 SHA 对比 → 一致 OK / 不一致提示 "远端有更新" |
| **多设备保护** | 每次保存前 GET 校验 SHA；不一致弹 Modal "有人改过，是否覆盖？是否拉取？" |
| **状态栏** | 未改 / 已同步（commit SHA 前 7 位）/ 本地已改未推送 |
| **拖拽排序** | HTML5 drag-and-drop，重排 slot 数组，重置 dirty 标志 |

### 6.4 视觉规范

- **配色**：复用现有水墨·宣纸色系（`#F5F1E8` 背景、`#A8332C` 朱砂强调色、`#1A1A1A` 墨色文字）
- **字体**：Noto Serif TC（标题）+ Noto Sans TC（正文）
- **间距**：96-128px section 间距缩放到 16-32px（后台密度更高）
- **动效**：`cubic-bezier(0.16, 1, 0.3, 1)` 与前台一致
- **响应式**：桌面优先（≥1024px），移动端基本可用但优化较弱

---

## 七、部署 & 实施

### 7.1 本地开发（保留现有方式）

```bash
cd 网页8/
python dev-server.py 8080 127.0.0.1
# http://127.0.0.1:8080/index.html
# http://127.0.0.1:8080/admin.html（v1，仅作为回退）
# http://127.0.0.1:8080/admin-v2.html（v2，本次设计目标）
```

### 7.2 生产部署（已在 CF Pages 跑）

仓库 `main` 分支 push → CF Pages Build Hook → 自动 rebuild → 全球 CDN 节点缓存更新 → 访客刷新看到。

### 7.3 实施分阶段

| PR | 内容 | 时间预估 | 风险等级 | 依赖 |
|---|---|---|---|---|
| **PR1**: 基础 | 重构 `lib/artworks-data.js`（拆分首页硬编码 + 详情可配）；新增 `data/components.json` 默认值；新增 `lib/components-default.js` | 0.5 天 | 低 | 无（起点） |
| **PR2**: 图片优化 | 一次性脚本：Hero 2 png → 留白/有画.webp ≤500KB；其他 19 张 jpg → 1~19.webp ≤200KB | 0.5 天 | 低 | 独立（与 PR3/4 可并行） |
| **PR3**: 后台 v2 | `admin-v2.html`（新文件，旧 admin.html 不动）；`lib/admin-v2.js`（UI + 状态）| 1.5 天 | 中 | 强依赖 PR1（schema 定型）；可与 PR4 并行（先用 mock API） |
| **PR4**: 原子提交 | `lib/github-api.js` 加 Git Data API 6 步提交；admin-v2 调新方法；worker 加 PATCH 透传 | 1 天 | 高 | 强依赖 PR1（接口定型） |
| **PR5**: 静态集成 + 测试 + 文档 | index.html / gallery.html / artwork.html / artist.html 读 `data/components.json`；Playwright 冒烟测；README + 部署文档更新 | 1.5 天 | 中 | 强依赖 PR1-PR4 完成 |

**总计**：~5 天人工 + 自动化测试

### 7.4 灰度发布

- 仅 `admin-v2.html` 切换使用；旧 `admin.html` 保留作为回退（半年内可访问）
- 完成 PR5 后跑通 `smoke-test.py` → 切到 v2
- 旧 `admin.html` 半年内保留可访问以做回退锚

---

## 八、测试

| 测试 | 工具 | 目标 |
|---|---|---|
| **单元测试** | Vitest | `lib/admin-v2.js` 状态管理 + `lib/github-api.js` 6 步原子性（mock fetch） |
| **集成测试** | Playwright Python | 访问 admin v2 → 替换图片 → 60s 后看 index.html 是否变化 |
| **冒烟测试** | Python + Playwright | 5 视口（1440×900 / 1920×1080 / 1024×768 / 390×844 / 844×390）+ 4 页面 0 错误 |
| **并发测试** | 2 个 Chrome 实例同时打开 admin-v2 | 检查 SHA 校验是否触发保护 |
| **Lighthouse 性能** | Chrome DevTools | 首屏 < 2s, CLS < 0.1, LCP < 2.5s |

---

## 九、风险与回退

### 9.1 风险矩阵

| 风险 | 影响 | 缓解 | 兜底 |
|---|---|---|---|
| **R1**：仓库膨胀 | GitHub Push 慢 | 限制图片 ≤200KB/张；18 个月清理旧图 | 旧 admin.html 仍可访问 |
| **R2**：CF Pages 500 构建/月超限 | 改动不能 deploy | 1 周改 ≤ 20 次足够 | 月刷新或升 $5/月 Workers Paid |
| **R3**：GitHub PAT 泄漏 | 第三方可改仓库 | 专用 PAT + 仅 `Contents: Read and write` 范围 + 90 天过期 | admin 清除；GitHub 后台撤销 |
| **R4**：CF Workers CORS Proxy 失败 | admin 全部 API 失败 | admin UI 显示"代理不可用" | 手动 git push |
| **R5**：多设备并发改 | 后保存覆盖先保存 | 步骤 1 拉 SHA + 保存前校验 | 显示冲突提示 |
| **R6**：admin.html ?key= URL 历史 | 口令暴露在浏览器历史 | 不写入 history.replaceState；当前 admin.html 行为保留 | 后续路线升级独立规划（不在 v2 范围） |
| **R7**：国内访问慢 | 访客体验 | 用户接受 | 后期买国内 CDN |

### 9.2 回退路径

| 场景 | 回退方案 |
|---|---|
| 新 admin-v2 出问题 | 访问旧 `admin.html` 继续管理 |
| 原子提交失败 | 旧 Contents API 仍可用，单文件 fallback |
| `components.json` 损坏 | repo 中保留 `data/components.bak.json` 每次保存前快照 |
| 全部不能工作 | admin-v2 "导出 JSON" → 手动 git push |

### 9.3 已知限制

- **国内访问**：CF Pages 在中国大陆无节点，访问慢/卡顿（用户已接受）
- **5 视口冒烟测**：在 1024×768 等非 16:9 视口下，Marquee 横向行可能裁切（不在本次改造范围）
- **浏览器兼容**：admin-v2 假设现代浏览器（Chrome 90+、Firefox 88+、Safari 14+），无 IE11 支持

---

## 十、成功标准（验收清单）

完成本设计后，必须达到以下才视为成功：

- [ ] admin-v2.html 可在 `python dev-server.py` 本地启动后访问
- [ ] 6 个 Tab 均可切换；每个槽位的 UI 操作符合 §6 规范
- [ ] 上传一张图到 Hero Tab → 保存 → 等待 ≤ 60s → 看到 index.html Hero 图变化
- [ ] 同时替换 6 张图 + 改 JSON → 一次 commit → 全部生效
- [ ] 多设备并发修改 → 后保存的看到"远端有更新"提示
- [ ] 旧 admin.html 仍可访问并可登录
- [ ] 5 视口 4 页面 smoke-test 0 错误（保留现有 smoke-test.py）
- [ ] Lighthouse 性能 ≥ 90 分
- [ ] CORS Worker 在生产环境可用（测试连接 + 实际替换图片）
- [ ] [PR5 子任务] README + 部署流程文档更新（不作为主验收阻塞项）

---

## 十一、Spec 历史

- **2026-10-09**：初版设计完成（黄桂明 v5 → v6 演进，admin 升级到组件级后台）

---

**下一步**：brainstorming 流程要求 spec 经 `spec-document-reviewer` 子代理审核 1-3 轮，审核通过后用户审阅，再由 `writing-plans` skill 制定分阶段实施计划，最后实施（包含启动本地服务器供用户验收）。
